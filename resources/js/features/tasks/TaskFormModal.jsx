import React, { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useForm } from "../../hooks/useForm";
import api from "../../utils/api";
import { usePermissions } from "../../hooks/usePermissions";
import { TASK_STATUS_LABELS, TASK_STATUS } from "../../utils/constants";
import SearchableSelect from "../../components/SearchableSelect";

export default function TaskFormModal({
    isOpen,
    onClose,
    taskId = null,
    mode = "create",
}) {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const { hasPermission, hasRole } = usePermissions();
    const isEdit = mode === "edit";
    const isEmployee = hasRole("Employee");
    const canEditFull = hasPermission("edit tasks");

    const [imagePreviews, setImagePreviews] = useState([]);
    const [existingImages, setExistingImages] = useState([]);

    const { data: taskData } = useQuery({
        queryKey: ["task", taskId],
        queryFn: async () => {
            const response = await api.get(`/tasks/${taskId}`);
            return response.data;
        },
        enabled: isEdit && !!taskId,
    });

    const initialValues = {
        assigned_to: "",
        order_id: "",
        title: "",
        description: "",
        status: TASK_STATUS.PENDING,
        images: [],
        due_date: "",
    };

    const {
        values,
        errors,
        isSubmitting,
        handleChange,
        handleSubmit,
        setValues,
    } = useForm(initialValues, async (formValues) => {
        try {
            const formData = new FormData();

            if (canEditFull) {
                formData.append("assigned_to", formValues.assigned_to);
                if (formValues.order_id) {
                    formData.append("order_id", formValues.order_id);
                }
                formData.append("title", formValues.title);
                if (formValues.due_date) {
                    formData.append("due_date", formValues.due_date);
                }
                if (formValues.images && formValues.images.length > 0) {
                    Array.from(formValues.images).forEach((file) => {
                        formData.append("images[]", file);
                    });
                }
            }

            if (formValues.description !== undefined) {
                formData.append("description", formValues.description);
            }
            formData.append("status", formValues.status);

            if (isEdit && taskId) {
                await api.post(`/tasks/${taskId}?_method=PUT`, formData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                });
                toast.success(t("tasks.form.toast.updated"));
            } else {
                await api.post("/tasks", formData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                });
                toast.success(t("tasks.form.toast.created"));
            }

            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            onClose();
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || t("common.genericError");
            toast.error(
                isEdit
                    ? t("tasks.form.toast.updateFailed")
                    : t("tasks.form.toast.createFailed"),
                {
                    description: errorMessage,
                },
            );
            throw error;
        }
    });

    useEffect(() => {
        if (taskData) {
            const dueDate = taskData.due_date
                ? new Date(taskData.due_date).toISOString().split("T")[0]
                : "";

            setValues({
                assigned_to: taskData.assigned_to?.id || "",
                order_id: taskData.order_id || "",
                title: taskData.title || "",
                description: taskData.description || "",
                status: taskData.status || TASK_STATUS.PENDING,
                images: [],
                due_date: dueDate,
            });

            if (taskData.images && taskData.images.length > 0) {
                setExistingImages(taskData.images);
            }
        } else if (!taskId && (mode === "create" || !mode)) {
            setValues(initialValues);
            setExistingImages([]);
            setImagePreviews([]);
        }
    }, [taskData, taskId, mode, setValues]);

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files || []);
        setValues({
            ...values,
            images: files,
        });

        const previews = files.map((file) => URL.createObjectURL(file));
        setImagePreviews(previews);
    };

    const removeImagePreview = (index) => {
        const newImages = Array.from(values.images);
        newImages.splice(index, 1);
        setValues({
            ...values,
            images: newImages,
        });

        const newPreviews = [...imagePreviews];
        URL.revokeObjectURL(newPreviews[index]);
        newPreviews.splice(index, 1);
        setImagePreviews(newPreviews);
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return "";
        if (imagePath.startsWith("http")) {
            return imagePath;
        }
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        if (
            imagePath.startsWith("/storage/") ||
            imagePath.startsWith("storage/")
        ) {
            const cleanPath = imagePath.startsWith("/")
                ? imagePath
                : `/${imagePath}`;
            return `${apiUrl}${cleanPath}`;
        }
        return `${apiUrl}/storage/${imagePath}`;
    };

    if (!hasPermission("create tasks") && !hasPermission("edit tasks")) {
        return null;
    }

    const title = isEdit ? t("tasks.form.editTitle") : t("tasks.form.createTitle");

    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl z-50">
                    <Dialog.Title className="text-2xl font-bold mb-1">
                        {title}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-500 mb-4">
                        {t("tasks.form.description")}
                    </Dialog.Description>

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
                    >
                        {!isEmployee && (
                            <>
                                <div>
                                    <label
                                        htmlFor="assigned_to"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        {t("tasks.form.fields.assignedTo")}{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        cacheKey="task-assigned-to-modal"
                                        value={values.assigned_to}
                                        onChange={(value) =>
                                            setValues({
                                                ...values,
                                                assigned_to: value,
                                            })
                                        }
                                        fetchOptions={async (params) => {
                                            const response = await api.get(
                                                `/admin/users?${params}`,
                                            );
                                            return response.data;
                                        }}
                                        searchParam="search"
                                        placeholder={t("tasks.form.placeholders.selectEmployee")}
                                        displayValue={(user) =>
                                            `${user.name} (${user.email})`
                                        }
                                        emptyMessage={t("tasks.form.empty.employees")}
                                        disabled={isEdit && !canEditFull}
                                    />
                                    {errors.assigned_to && (
                                        <p className="mt-1 text-sm text-red-600">
                                            {errors.assigned_to}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="order_id"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        {t("tasks.form.fields.orderOptional")}
                                    </label>
                                    <SearchableSelect
                                        cacheKey="task-order-modal"
                                        value={values.order_id}
                                        onChange={(value) =>
                                            setValues({
                                                ...values,
                                                order_id: value || "",
                                            })
                                        }
                                        fetchOptions={async (params) => {
                                            const response = await api.get(
                                                `/orders?${params}`,
                                            );
                                            return response.data;
                                        }}
                                        searchParam="search"
                                        placeholder={t("tasks.form.placeholders.noOrder")}
                                        displayValue={(order) =>
                                            `${order.order_number} - ${order.supplier?.name || t("common.na")}`
                                        }
                                        emptyMessage={t("tasks.form.empty.orders")}
                                        disabled={isEdit && !canEditFull}
                                    />
                                    {errors.order_id && (
                                        <p className="mt-1 text-sm text-red-600">
                                            {errors.order_id}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="title"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        {t("tasks.form.fields.title")}{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        name="title"
                                        value={values.title}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required={!isEdit}
                                        disabled={isEdit && !canEditFull}
                                    />
                                    {errors.title && (
                                        <p className="mt-1 text-sm text-red-600">
                                            {errors.title}
                                        </p>
                                    )}
                                </div>
                            </>
                        )}

                        <div>
                            <label
                                htmlFor="description"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                {t("tasks.form.fields.description")}
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={values.description}
                                onChange={handleChange}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {errors.description && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.description}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label
                                    htmlFor="status"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    {t("tasks.form.fields.status")}
                                </label>
                                <SearchableSelect
                                    value={values.status}
                                    onChange={(v) =>
                                        handleChange({
                                            target: {
                                                name: "status",
                                                value: v,
                                            },
                                        })
                                    }
                                    options={Object.entries(
                                        TASK_STATUS_LABELS,
                                    ).map(([value, label]) => ({
                                        value,
                                        label: t(`tasks.status.${value}`, {
                                            defaultValue: label,
                                        }),
                                    }))}
                                    placeholder={t("tasks.form.placeholders.selectStatus")}
                                />
                                {errors.status && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.status}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="due_date"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    {t("tasks.form.fields.dueDate")}
                                </label>
                                <input
                                    type="date"
                                    id="due_date"
                                    name="due_date"
                                    value={values.due_date}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {errors.due_date && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.due_date}
                                    </p>
                                )}
                            </div>
                        </div>

                        {canEditFull && (
                            <div>
                                <label
                                    htmlFor="images"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    {t("tasks.form.fields.images")}
                                </label>
                                <input
                                    type="file"
                                    id="images"
                                    name="images"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {errors.images && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.images}
                                    </p>
                                )}

                                {existingImages.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-sm font-medium text-gray-700 mb-2">
                                            {t("tasks.form.images.existing")}
                                        </p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {existingImages.map(
                                                (imagePath, index) => (
                                                    <div
                                                        key={index}
                                                        className="relative"
                                                    >
                                                        <img
                                                            src={getImageUrl(
                                                                imagePath,
                                                            )}
                                                            alt={t("tasks.form.images.imageAlt", {
                                                                number: index + 1,
                                                            })}
                                                            className="w-full h-24 object-cover rounded border"
                                                        />
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}

                                {imagePreviews.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-sm font-medium text-gray-700 mb-2">
                                            {t("tasks.form.images.new")}
                                        </p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {imagePreviews.map(
                                                (preview, index) => (
                                                    <div
                                                        key={index}
                                                        className="relative"
                                                    >
                                                        <img
                                                            src={preview}
                                                            alt={t("tasks.form.images.previewAlt", {
                                                                number: index + 1,
                                                            })}
                                                            className="w-full h-24 object-cover rounded border"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeImagePreview(
                                                                    index,
                                                                )
                                                            }
                                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {errors.form && (
                            <div className="mt-2 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                                {errors.form}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                    onClick={onClose}
                                >
                                    {t("common.cancel")}
                                </button>
                            </Dialog.Close>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting
                                    ? t("common.saving")
                                    : isEdit
                                      ? t("tasks.form.actions.update")
                                      : t("tasks.form.actions.create")}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

