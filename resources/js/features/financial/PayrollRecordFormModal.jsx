import React, { useEffect, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "../../hooks/useForm";
import api from "../../utils/api";
import { usePermissions } from "../../hooks/usePermissions";
import SearchableSelect from "../../components/SearchableSelect";
import { PAYROLL_STATUS_LABELS, PAYROLL_STATUS } from "../../utils/constants";

export default function PayrollRecordFormModal({
    isOpen,
    onClose,
    payrollRecordId = null,
    mode = "create",
}) {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const isEdit = mode === "edit";

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const { data: payrollData } = useQuery({
        queryKey: ["payroll-record", payrollRecordId],
        queryFn: async () => {
            const response = await api.get(
                `/payroll-records/${payrollRecordId}`,
            );
            return response.data;
        },
        enabled: isEdit && !!payrollRecordId,
    });

    const initialValues = {
        employee_id: "",
        month: currentMonth,
        year: currentYear,
        base_salary: "",
        deductions: "",
        bonuses: "",
        overtime_pay: "",
        status: PAYROLL_STATUS.DRAFT,
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
                employee_id: formValues.employee_id,
                month: parseInt(formValues.month),
                year: parseInt(formValues.year),
                base_salary: formValues.base_salary
                    ? parseFloat(formValues.base_salary)
                    : null,
                deductions: parseFloat(formValues.deductions || 0),
                bonuses: parseFloat(formValues.bonuses || 0),
                overtime_pay: parseFloat(formValues.overtime_pay || 0),
                status: formValues.status,
                notes: formValues.notes || null,
            };

            if (isEdit) {
                await api.put(
                    `/payroll-records/${payrollRecordId}`,
                    submitData,
                );
                toast.success("Payroll record updated successfully");
            } else {
                await api.post("/payroll-records", submitData);
                toast.success("Payroll record created successfully");
            }

            queryClient.invalidateQueries({ queryKey: ["payroll-records"] });
            onClose();
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || "An error occurred";
            toast.error(
                isEdit
                    ? "Failed to update payroll record"
                    : "Failed to create payroll record",
                {
                    description: errorMessage,
                },
            );
            throw error;
        }
    });

    const recomputeFromSalaries = async (employeeId, year, month) => {
        if (!employeeId || !year || !month) return;

        try {
            const salariesRes = await api.get(
                `/salaries?employee_id=${employeeId}&per_page=100`,
            );
            const salaryList = salariesRes.data?.data ?? salariesRes.data ?? [];

            const periodDate = new Date(Number(year), Number(month) - 1, 15);

            const isActiveInPeriod = (s) => {
                const eff = new Date(s.effective_date);
                const end = s.end_date ? new Date(s.end_date) : null;
                return eff <= periodDate && (!end || end >= periodDate);
            };

            const activeSalaries = salaryList.filter(isActiveInPeriod);

            const base = activeSalaries
                .filter((s) => s.type === "base")
                .sort(
                    (a, b) =>
                        new Date(b.effective_date) - new Date(a.effective_date),
                )[0];

            const bonuses = activeSalaries
                .filter((s) => s.type === "bonus")
                .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

            const deductions = activeSalaries
                .filter((s) => s.type === "deduction")
                .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

            setValues((prev) => ({
                ...prev,
                base_salary: base?.amount ?? prev.base_salary ?? "",
                bonuses: bonuses > 0 ? bonuses : (prev.bonuses ?? ""),
                deductions:
                    deductions > 0 ? deductions : (prev.deductions ?? ""),
            }));
        } catch (e) {
            console.log("[Payroll] failed to fetch salaries", e);
        }
    };

    const { data: employeesData } = useQuery({
        queryKey: ["employees"],
        queryFn: async () => {
            const response = await api.get("/employees?per_page=100");
            return response.data;
        },
    });

    useEffect(() => {
        if (payrollData) {
            setValues({
                employee_id: payrollData.employee_id || "",
                month: payrollData.month || currentMonth,
                year: payrollData.year || currentYear,
                base_salary: payrollData.base_salary || "",
                deductions: payrollData.deductions || "",
                bonuses: payrollData.bonuses || "",
                overtime_pay: payrollData.overtime_pay || "",
                status: payrollData.status || PAYROLL_STATUS.DRAFT,
                notes: payrollData.notes || "",
            });
        } else if (!payrollRecordId && (mode === "create" || !mode)) {
            setValues(initialValues);
        }
    }, [
        payrollData,
        payrollRecordId,
        mode,
        setValues,
        currentMonth,
        currentYear,
    ]);

    const employees = employeesData?.data || [];

    const netSalary = useMemo(() => {
        const base = parseFloat(values.base_salary || 0);
        const bonuses = parseFloat(values.bonuses || 0);
        const overtime = parseFloat(values.overtime_pay || 0);
        const deductions = parseFloat(values.deductions || 0);
        return base + bonuses + overtime - deductions;
    }, [
        values.base_salary,
        values.bonuses,
        values.overtime_pay,
        values.deductions,
    ]);

    if (!hasPermission("manage payroll")) {
        return null;
    }

    const title = isEdit ? "Edit Payroll Record" : "Create Payroll Record";

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
                        Configure payroll details for the selected period and
                        employee.
                    </Dialog.Description>

                    <form
                        className="bg-white rounded-lg"
                        onSubmit={handleSubmit}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label
                                    htmlFor="employee_id"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Employee{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <SearchableSelect
                                    cacheKey="payroll-employee-modal"
                                    value={values.employee_id}
                                    onChange={async (value) => {
                                        const employeeId = value || "";
                                        setValues((prev) => ({
                                            ...prev,
                                            employee_id: employeeId,
                                        }));
                                        if (employeeId) {
                                            await recomputeFromSalaries(
                                                employeeId,
                                                values.year || currentYear,
                                                values.month || currentMonth,
                                            );
                                        }
                                    }}
                                    fetchOptions={async (params) => {
                                        const response = await api.get(
                                            `/employees?${params}`,
                                        );
                                        return response.data;
                                    }}
                                    searchParam="search"
                                    placeholder="Select Employee"
                                    displayValue={(emp) =>
                                        `${emp.employee_code} - ${emp.user?.name || "N/A"}`
                                    }
                                    emptyMessage="No employees found."
                                />
                                {errors.employee_id && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.employee_id}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="month"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Month{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <SearchableSelect
                                    value={values.month}
                                    onChange={async (v) => {
                                        const monthValue = Number(v);
                                        setValues((prev) => ({
                                            ...prev,
                                            month: monthValue,
                                        }));
                                        if (values.employee_id) {
                                            await recomputeFromSalaries(
                                                values.employee_id,
                                                values.year || currentYear,
                                                monthValue,
                                            );
                                        }
                                    }}
                                    options={Array.from(
                                        { length: 12 },
                                        (_, i) => ({
                                            value: i + 1,
                                            label: new Date(
                                                2000,
                                                i,
                                            ).toLocaleString("default", {
                                                month: "long",
                                            }),
                                        }),
                                    )}
                                    placeholder="Select month"
                                />
                                {errors.month && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.month}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="year"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Year <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="year"
                                    name="year"
                                    value={values.year}
                                    onChange={async (e) => {
                                        handleChange(e);
                                        const newYear = e.target.value;
                                        if (values.employee_id) {
                                            await recomputeFromSalaries(
                                                values.employee_id,
                                                newYear || currentYear,
                                                values.month || currentMonth,
                                            );
                                        }
                                    }}
                                    min="2000"
                                    max="9999"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                {errors.year && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.year}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="base_salary"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Base Salary
                                </label>
                                <input
                                    type="number"
                                    id="base_salary"
                                    name="base_salary"
                                    value={values.base_salary}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Auto-filled from employee salary"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    {values.employee_id
                                        ? "Auto-filled from employee. You can override if needed."
                                        : "Select an employee to auto-fill"}
                                </p>
                                {errors.base_salary && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.base_salary}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="bonuses"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Bonuses
                                </label>
                                <input
                                    type="number"
                                    id="bonuses"
                                    name="bonuses"
                                    value={values.bonuses}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    {values.employee_id
                                        ? "Auto-filled from employee. You can override if needed."
                                        : "Select an employee to auto-fill"}
                                </p>
                                {errors.bonuses && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.bonuses}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="overtime_pay"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Overtime Pay
                                </label>
                                <input
                                    type="number"
                                    id="overtime_pay"
                                    name="overtime_pay"
                                    value={values.overtime_pay}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />

                                {errors.overtime_pay && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.overtime_pay}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="deductions"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Deductions
                                </label>
                                <input
                                    type="number"
                                    id="deductions"
                                    name="deductions"
                                    value={values.deductions}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    {values.employee_id
                                        ? "Auto-filled from employee. You can override if needed."
                                        : "Select an employee to auto-fill"}
                                </p>
                                {errors.deductions && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.deductions}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <div className="bg-gray-50 p-4 rounded-md">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-semibold text-gray-700">
                                            Net Salary:
                                        </span>
                                        <span className="text-2xl font-bold text-blue-600">
                                            $
                                            {netSalary.toLocaleString("en-US", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="status"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Status
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
                                        PAYROLL_STATUS_LABELS,
                                    ).map(([value, label]) => ({
                                        value,
                                        label,
                                    }))}
                                    placeholder="Select status"
                                />
                                {errors.status && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.status}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label
                                    htmlFor="notes"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Notes
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
                        </div>

                        {errors.form && (
                            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
                                {errors.form}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                    onClick={onClose}
                                >
                                    Cancel
                                </button>
                            </Dialog.Close>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting
                                    ? "Saving..."
                                    : isEdit
                                      ? "Update Payroll Record"
                                      : "Create Payroll Record"}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
