import React, { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useForm } from "../../hooks/useForm";
import api from "../../utils/api";
import { usePermissions } from "../../hooks/usePermissions";

export default function LeaveTypeFormModal({
    isOpen,
    onClose,
    leaveTypeId = null,
    mode = "create",
}) {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const isEdit = mode === "edit";

    const { data: leaveTypeData } = useQuery({
        queryKey: ["leave-type", leaveTypeId],
        queryFn: async () => {
            const response = await api.get(`/leave-types/${leaveTypeId}`);
            return response.data;
        },
        enabled: isEdit && !!leaveTypeId,
    });

    const initialValues = {
        name: "",
        max_days_per_year: "",
        carry_forward: false,
        description: "",
        is_active: true,
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
                ...formValues,
                max_days_per_year: parseInt(formValues.max_days_per_year),
                carry_forward:
                    formValues.carry_forward === true ||
                    formValues.carry_forward === "true",
                is_active:
                    formValues.is_active === true ||
                    formValues.is_active === "true",
            };

            if (isEdit) {
                await api.put(`/leave-types/${leaveTypeId}`, submitData);
                toast.success(t("leaveTypes.toast.updated"));
            } else {
                await api.post("/leave-types", submitData);
                toast.success(t("leaveTypes.toast.created"));
            }

            queryClient.invalidateQueries({ queryKey: ["leave-types"] });
            onClose();
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || t("common.genericError");
            toast.error(
                isEdit
                    ? t("leaveTypes.toast.updateFailed")
                    : t("leaveTypes.toast.createFailed"),
                {
                    description: errorMessage,
                },
            );
            throw error;
        }
    });

    useEffect(() => {
        if (leaveTypeData) {
            setValues({
                name: leaveTypeData.name || "",
                max_days_per_year: leaveTypeData.max_days_per_year || "",
                carry_forward: !!leaveTypeData.carry_forward,
                description: leaveTypeData.description || "",
                is_active:
                    leaveTypeData.is_active !== undefined
                        ? leaveTypeData.is_active
                        : true,
            });
        } else if (!leaveTypeId && (mode === "create" || !mode)) {
            setValues(initialValues);
        }
    }, [leaveTypeData, leaveTypeId, mode, setValues]);

    if (!hasPermission("manage leave types")) {
        return null;
    }

    const title = isEdit
        ? t("leaveTypes.modal.editTitle")
        : t("leaveTypes.modal.createTitle");

    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-xl z-50">
                    <Dialog.Title className="text-2xl font-bold mb-1">
                        {title}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-500 mb-4">
                        {t("leaveTypes.modal.description")}
                    </Dialog.Description>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("leaveTypes.fields.name")}{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("leaveTypes.fields.maxDaysPerYear")}{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="max_days_per_year"
                                    value={values.max_days_per_year}
                                    onChange={handleChange}
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                {errors.max_days_per_year && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.max_days_per_year}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="carry_forward"
                                        checked={values.carry_forward}
                                        onChange={(e) =>
                                            setValues({
                                                ...values,
                                                carry_forward: e.target.checked,
                                            })
                                        }
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        {t("leaveTypes.fields.allowCarryForward")}
                                    </span>
                                </label>
                            </div>
                            <div>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={values.is_active}
                                        onChange={(e) =>
                                            setValues({
                                                ...values,
                                                is_active: e.target.checked,
                                            })
                                        }
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        {t("leaveTypes.fields.active")}
                                    </span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("leaveTypes.fields.description")}
                            </label>
                            <textarea
                                name="description"
                                value={values.description}
                                onChange={handleChange}
                                rows={3}
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
                                      ? t("leaveTypes.actions.update")
                                      : t("leaveTypes.actions.create")}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
