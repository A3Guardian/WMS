import React, { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useForm } from "../../hooks/useForm";
import api from "../../utils/api";
import { usePermissions } from "../../hooks/usePermissions";

export default function DepartmentFormModal({
    isOpen,
    onClose,
    departmentId = null,
    mode = "create",
}) {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();

    const isEdit = mode === "edit";

    const { data: departmentData } = useQuery({
        queryKey: ["department", departmentId],
        queryFn: async () => {
            const response = await api.get(`/departments/${departmentId}`);
            return response.data;
        },
        enabled: isEdit && !!departmentId,
    });

    const initialValues = {
        name: "",
        description: "",
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
            const submitData = {
                name: formValues.name,
                description: formValues.description || null,
            };

            if (isEdit) {
                await api.put(`/departments/${departmentId}`, submitData);
                toast.success(t("departments.toast.updated"));
            } else {
                await api.post("/departments", submitData);
                toast.success(t("departments.toast.created"));
            }

            queryClient.invalidateQueries({ queryKey: ["departments"] });
            onClose();
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || t("common.genericError");
            toast.error(
                isEdit
                    ? t("departments.toast.updateFailed")
                    : t("departments.toast.createFailed"),
                {
                    description: errorMessage,
                },
            );
            throw error;
        }
    });

    useEffect(() => {
        if (departmentData) {
            setValues({
                name: departmentData.name || "",
                description: departmentData.description || "",
            });
        } else if (!departmentId && (mode === "create" || !mode)) {
            setValues(initialValues);
        }
    }, [departmentData, departmentId, mode, setValues]);

    if (isEdit && !hasPermission("edit employees")) {
        return null;
    }

    if (mode === "create" && !hasPermission("create employees")) {
        return null;
    }

    const title = isEdit
        ? t("departments.modal.editTitle")
        : t("departments.modal.createTitle");

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
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50">
                    <Dialog.Title className="text-2xl font-bold mb-1">
                        {title}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-500 mb-4">
                        {t("departments.modal.description")}
                    </Dialog.Description>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="name"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                {t("departments.fields.name")}{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={values.name}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="description"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                {t("departments.fields.description")}
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
                                      ? t("departments.actions.update")
                                      : t("departments.actions.create")}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
