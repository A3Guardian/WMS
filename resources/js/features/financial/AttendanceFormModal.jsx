import React, { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useForm } from "../../hooks/useForm";
import api from "../../utils/api";
import { usePermissions } from "../../hooks/usePermissions";
import SearchableSelect from "../../components/SearchableSelect";
import { ATTENDANCE_STATUS_LABELS } from "../../utils/constants";

export default function AttendanceFormModal({
    isOpen,
    onClose,
    attendanceId = null,
    mode = "create",
}) {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const isEdit = mode === "edit";

    const { data: employeesData } = useQuery({
        queryKey: ["employees"],
        queryFn: async () => {
            const response = await api.get("/employees?per_page=100");
            return response.data;
        },
    });

    const { data: attendanceData } = useQuery({
        queryKey: ["attendance", attendanceId],
        queryFn: async () => {
            const response = await api.get(`/attendance/${attendanceId}`);
            return response.data;
        },
        enabled: isEdit && !!attendanceId,
    });

    const initialValues = {
        employee_id: "",
        date: new Date().toISOString().split("T")[0],
        clock_in: "",
        clock_out: "",
        status: "present",
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
                date: formValues.date,
                status: formValues.status,
                notes: formValues.notes || null,
            };

            if (formValues.clock_in) {
                submitData.clock_in = `${formValues.date}T${formValues.clock_in}`;
            }
            if (formValues.clock_out) {
                submitData.clock_out = `${formValues.date}T${formValues.clock_out}`;
            }

            if (isEdit) {
                await api.put(`/attendance/${attendanceId}`, submitData);
                toast.success(t("attendance.toast.updated"));
            } else {
                await api.post("/attendance", submitData);
                toast.success(t("attendance.toast.created"));
            }

            queryClient.invalidateQueries({ queryKey: ["attendance"] });
            onClose();
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || t("common.genericError");
            toast.error(
                isEdit
                    ? t("attendance.toast.updateFailed")
                    : t("attendance.toast.createFailed"),
                {
                    description: errorMessage,
                },
            );
            throw error;
        }
    });

    useEffect(() => {
        if (attendanceData) {
            const date = attendanceData.date
                ? new Date(attendanceData.date).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0];

            const clockIn = attendanceData.clock_in
                ? new Date(attendanceData.clock_in).toTimeString().slice(0, 5)
                : "";
            const clockOut = attendanceData.clock_out
                ? new Date(attendanceData.clock_out).toTimeString().slice(0, 5)
                : "";

            setValues({
                employee_id: attendanceData.employee_id || "",
                date,
                clock_in: clockIn,
                clock_out: clockOut,
                status: attendanceData.status || "present",
                notes: attendanceData.notes || "",
            });
        } else if (!attendanceId && (mode === "create" || !mode)) {
            setValues(initialValues);
        }
    }, [attendanceData, attendanceId, mode, setValues]);

    const employees = employeesData?.data || [];

    if (!hasPermission("manage attendance")) {
        return null;
    }

    const title = isEdit
        ? t("attendance.modal.editTitle")
        : t("attendance.modal.createTitle");

    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl z-50">
                    <Dialog.Title className="text-2xl font-bold mb-1">
                        {title}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-500 mb-4">
                        {t("attendance.modal.description")}
                    </Dialog.Description>

                    <form
                        onSubmit={handleSubmit}
                        className="bg-white rounded-lg"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("attendance.fields.employee")}{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <SearchableSelect
                                    cacheKey="attendance-employee-modal"
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
                                    placeholder={t("attendance.placeholders.selectEmployee")}
                                    displayValue={(emp) =>
                                        `${emp.employee_code} - ${emp.user?.name || t("common.na")}`
                                    }
                                    emptyMessage={t("attendance.empty.employees")}
                                />
                                {errors.employee_id && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.employee_id}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("attendance.fields.date")}{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    value={values.date}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                {errors.date && (
                                    <p className="mt-1 text_sm text-red-600">
                                        {errors.date}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("attendance.fields.clockIn")}
                                </label>
                                <input
                                    type="time"
                                    name="clock_in"
                                    value={values.clock_in}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {errors.clock_in && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.clock_in}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("attendance.fields.clockOut")}
                                </label>
                                <input
                                    type="time"
                                    name="clock_out"
                                    value={values.clock_out}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {errors.clock_out && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.clock_out}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("attendance.fields.status")}
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
                                        ATTENDANCE_STATUS_LABELS,
                                    ).map(([value, label]) => ({
                                        value,
                                        label: t(`attendance.status.${value}`, {
                                            defaultValue: label,
                                        }),
                                    }))}
                                    placeholder={t("attendance.placeholders.selectStatus")}
                                />
                                {errors.status && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.status}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("attendance.fields.notes")}
                                </label>
                                <textarea
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
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
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
                                      ? t("attendance.actions.update")
                                      : t("attendance.actions.create")}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
