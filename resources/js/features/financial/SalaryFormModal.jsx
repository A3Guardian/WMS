import React, { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useForm } from "../../hooks/useForm";
import api from "../../utils/api";
import { usePermissions } from "../../hooks/usePermissions";
import SearchableSelect from "../../components/SearchableSelect";
import { SALARY_TYPE_LABELS } from "../../utils/constants";

export default function SalaryFormModal({
    isOpen,
    onClose,
    salaryId = null,
    mode = "create",
}) {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();

    const isEdit = mode === "edit";

    const { data: salaryData } = useQuery({
        queryKey: ["salary", salaryId],
        queryFn: async () => {
            const response = await api.get(`/salaries/${salaryId}`);
            return response.data;
        },
        enabled: isEdit && !!salaryId,
    });

    const initialValues = {
        employee_id: "",
        amount: "",
        effective_date: "",
        end_date: "",
        type: "base",
        notes: "",
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
                employee_id: formValues.employee_id,
                amount: parseFloat(formValues.amount),
                end_date: formValues.end_date || null,
            };

            if (isEdit) {
                await api.put(`/salaries/${salaryId}`, submitData);
                toast.success(t("salaries.toast.updated"));
            } else {
                await api.post("/salaries", submitData);
                toast.success(t("salaries.toast.created"));
            }

            queryClient.invalidateQueries({ queryKey: ["salaries"] });
            onClose();
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || t("common.genericError");
            toast.error(
                isEdit
                    ? t("salaries.toast.updateFailed")
                    : t("salaries.toast.createFailed"),
                {
                    description: errorMessage,
                },
            );
            throw error;
        }
    });

    useEffect(() => {
        if (salaryData) {
            const effectiveDate = salaryData.effective_date
                ? new Date(salaryData.effective_date)
                      .toISOString()
                      .split("T")[0]
                : "";
            const endDate = salaryData.end_date
                ? new Date(salaryData.end_date).toISOString().split("T")[0]
                : "";

            setValues({
                employee_id: salaryData.employee_id || "",
                amount: salaryData.amount || "",
                effective_date: effectiveDate,
                end_date: endDate,
                type: salaryData.type || "base",
                notes: salaryData.notes || "",
            });
        } else if (!salaryId && (mode === "create" || !mode)) {
            setValues(initialValues);
        }
    }, [salaryData, salaryId, mode, setValues]);

    if (!hasPermission("manage salaries")) {
        return null;
    }

    const title = isEdit
        ? t("salaries.modal.editTitle")
        : t("salaries.modal.createTitle");

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
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl z-50">
                    <Dialog.Title className="text-2xl font-bold mb-1">
                        {title}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-500 mb-4">
                        {t("salaries.modal.description")}
                    </Dialog.Description>

                    <form
                        onSubmit={handleSubmit}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        <div>
                            <label
                                htmlFor="employee_id"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                {t("salaries.fields.employee")}{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <SearchableSelect
                                cacheKey="salary-employee-modal"
                                value={values.employee_id}
                                onChange={(value) =>
                                    setValues({
                                        ...values,
                                        employee_id: value || "",
                                    })
                                }
                                fetchOptions={async (params) => {
                                    const response = await api.get(
                                        `/employees?${params}`,
                                    );
                                    return response.data;
                                }}
                                searchParam="search"
                                placeholder={t("salaries.placeholders.selectEmployee")}
                                displayValue={(emp) =>
                                    `${emp.employee_code} - ${emp.user?.name || t("common.na")}`
                                }
                                emptyMessage={t("salaries.empty.employees")}
                            />
                            {errors.employee_id && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.employee_id}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="amount"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                {t("salaries.fields.amount")}{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                id="amount"
                                name="amount"
                                value={values.amount}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            {errors.amount && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.amount}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="type"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                {t("salaries.fields.type")}{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <SearchableSelect
                                value={values.type}
                                onChange={(v) =>
                                    handleChange({
                                        target: { name: "type", value: v },
                                    })
                                }
                                options={Object.entries(SALARY_TYPE_LABELS).map(
                                    ([value, label]) => ({
                                        value,
                                        label: t(`salaries.type.${value}`, {
                                            defaultValue: label,
                                        }),
                                    }),
                                )}
                                placeholder={t("salaries.placeholders.selectType")}
                            />
                            {errors.type && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.type}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="effective_date"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                {t("salaries.fields.effectiveDate")}{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                id="effective_date"
                                name="effective_date"
                                value={values.effective_date}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            {errors.effective_date && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.effective_date}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="end_date"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                {t("salaries.fields.endDate")}
                            </label>
                            <input
                                type="date"
                                id="end_date"
                                name="end_date"
                                value={values.end_date}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {errors.end_date && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.end_date}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label
                                htmlFor="notes"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                {t("salaries.fields.notes")}
                            </label>
                            <textarea
                                id="notes"
                                name="notes"
                                value={values.notes}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {errors.notes && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.notes}
                                </p>
                            )}
                        </div>

                        {errors.form && (
                            <div className="md:col-span-2 mt-2 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                                {errors.form}
                            </div>
                        )}

                        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
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
                                      ? t("salaries.actions.update")
                                      : t("salaries.actions.create")}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
