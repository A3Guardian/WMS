import React, { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "../../hooks/useForm";
import api from "../../utils/api";
import { usePermissions } from "../../hooks/usePermissions";
import SearchableSelect from "../../components/SearchableSelect";

export default function EmployeeFormModal({
    isOpen,
    onClose,
    employeeId = null,
    mode = "create", // "create" | "edit" | "view"
}) {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();

    const isEdit = mode === "edit";
    const isView = mode === "view";

    const { data: departmentsData } = useQuery({
        queryKey: ["departments"],
        queryFn: async () => {
            const response = await api.get("/departments?per_page=100");
            return response.data;
        },
    });

    const { data: usersData } = useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            const response = await api.get("/admin/users?per_page=100");
            return response.data;
        },
    });

    const { data: employeeData } = useQuery({
        queryKey: ["employee", employeeId],
        queryFn: async () => {
            const response = await api.get(`/employees/${employeeId}`);
            return response.data;
        },
        enabled: !!employeeId && (isEdit || isView),
    });

    const initialValues = {
        user_id: "",
        employee_code: "",
        department_id: "",
        position: "",
        hire_date: "",
        employment_type: "full-time",
        salary: "",
        phone: "",
        address: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        status: "active",
    };

    const {
        values,
        errors,
        isSubmitting,
        handleChange,
        handleSubmit,
        setValues,
    } = useForm(initialValues, async (formValues) => {
        if (isView) {
            onClose();
            return;
        }

        try {
            const submitData = {
                ...formValues,
                user_id: formValues.user_id || null,
                department_id: formValues.department_id || null,
                salary: formValues.salary ? parseFloat(formValues.salary) : null,
            };

            if (isEdit) {
                await api.put(`/employees/${employeeId}`, submitData);
                toast.success("Employee updated successfully");
            } else {
                await api.post("/employees", submitData);
                toast.success("Employee created successfully");
            }

            queryClient.invalidateQueries({ queryKey: ["employees"] });
            onClose();
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || "An error occurred";
            toast.error(
                isEdit
                    ? "Failed to update employee"
                    : "Failed to create employee",
                {
                    description: errorMessage,
                },
            );
            throw error;
        }
    });

    useEffect(() => {
        if (employeeData) {
            const hireDate = employeeData.hire_date
                ? new Date(employeeData.hire_date).toISOString().split("T")[0]
                : "";

            setValues({
                user_id: employeeData.user_id || "",
                employee_code: employeeData.employee_code || "",
                department_id: employeeData.department_id || "",
                position: employeeData.position || "",
                hire_date: hireDate,
                employment_type: employeeData.employment_type || "full-time",
                salary: employeeData.salary || "",
                phone: employeeData.phone || "",
                address: employeeData.address || "",
                emergency_contact_name:
                    employeeData.emergency_contact_name || "",
                emergency_contact_phone:
                    employeeData.emergency_contact_phone || "",
                status: employeeData.status || "active",
            });
        } else if (!employeeId && (mode === "create" || !mode)) {
            setValues(initialValues);
        }
    }, [employeeData, employeeId, mode, setValues]);

    const departments = departmentsData?.data || [];
    const users = usersData?.data || [];

    if (isEdit && !hasPermission("edit employees")) {
        return null;
    }

    if (mode === "create" && !hasPermission("create employees")) {
        return null;
    }

    const disabled = isView;

    const title =
        mode === "view"
            ? "View Employee"
            : isEdit
              ? "Edit Employee"
              : "Create Employee";

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
                        Manage employee details including personal, employment and emergency contact information.
                    </Dialog.Description>

                    <form
                        onSubmit={handleSubmit}
                        className="bg-white rounded-lg"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label
                                    htmlFor="employee_code"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Employee Code{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="employee_code"
                                    name="employee_code"
                                    value={values.employee_code}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                    required
                                    disabled={disabled}
                                />
                                {errors.employee_code && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.employee_code}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="user_id"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Link to User (Optional)
                                </label>
                                <SearchableSelect
                                    cacheKey="employee-user"
                                    value={values.user_id}
                                    onChange={(value) =>
                                        setValues({
                                            ...values,
                                            user_id: value || "",
                                        })
                                    }
                                    fetchOptions={async (params) => {
                                        const response = await api.get(
                                            `/admin/users?${params}`,
                                        );
                                        return response.data;
                                    }}
                                    searchParam="search"
                                    placeholder="Select User"
                                    displayValue={(user) =>
                                        `${user.name} (${user.email})`
                                    }
                                    emptyMessage="No users found."
                                    disabled={disabled}
                                />
                                {errors.user_id && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.user_id}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="department_id"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Department
                                </label>
                                <SearchableSelect
                                    cacheKey="employee-department"
                                    value={values.department_id}
                                    onChange={(value) =>
                                        setValues({
                                            ...values,
                                            department_id: value || "",
                                        })
                                    }
                                    fetchOptions={async (params) => {
                                        const response = await api.get(
                                            `/departments?${params}`,
                                        );
                                        return response.data;
                                    }}
                                    searchParam="search"
                                    placeholder="Select Department"
                                    displayValue={(dept) => dept.name}
                                    emptyMessage="No departments found."
                                    disabled={disabled}
                                />
                                {errors.department_id && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.department_id}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="position"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Position
                                </label>
                                <input
                                    type="text"
                                    id="position"
                                    name="position"
                                    value={values.position}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                    disabled={disabled}
                                />
                                {errors.position && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.position}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="hire_date"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Hire Date{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    id="hire_date"
                                    name="hire_date"
                                    value={values.hire_date}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                    required
                                    disabled={disabled}
                                />
                                {errors.hire_date && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.hire_date}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="employment_type"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Employment Type{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <SearchableSelect
                                    value={values.employment_type}
                                    onChange={(v) =>
                                        handleChange({
                                            target: {
                                                name: "employment_type",
                                                value: v,
                                            },
                                        })
                                    }
                                    options={[
                                        { value: "full-time", label: "Full-time" },
                                        { value: "part-time", label: "Part-time" },
                                        { value: "contractor", label: "Contractor" },
                                        { value: "intern", label: "Intern" },
                                    ]}
                                    placeholder="Select type"
                                    disabled={disabled}
                                />
                                {errors.employment_type && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.employment_type}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="salary"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Salary
                                </label>
                                <input
                                    type="number"
                                    id="salary"
                                    name="salary"
                                    value={values.salary}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                    disabled={disabled}
                                />
                                {errors.salary && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.salary}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="phone"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Phone
                                </label>
                                <input
                                    type="text"
                                    id="phone"
                                    name="phone"
                                    value={values.phone}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                    disabled={disabled}
                                />
                                {errors.phone && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.phone}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label
                                    htmlFor="address"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Address
                                </label>
                                <textarea
                                    id="address"
                                    name="address"
                                    value={values.address}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                    disabled={disabled}
                                />
                                {errors.address && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.address}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="emergency_contact_name"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Emergency Contact Name
                                </label>
                                <input
                                    type="text"
                                    id="emergency_contact_name"
                                    name="emergency_contact_name"
                                    value={values.emergency_contact_name}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                    disabled={disabled}
                                />
                                {errors.emergency_contact_name && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.emergency_contact_name}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="emergency_contact_phone"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Emergency Contact Phone
                                </label>
                                <input
                                    type="text"
                                    id="emergency_contact_phone"
                                    name="emergency_contact_phone"
                                    value={values.emergency_contact_phone}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                    disabled={disabled}
                                />
                                {errors.emergency_contact_phone && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.emergency_contact_phone}
                                    </p>
                                )}
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
                                            target: { name: "status", value: v },
                                        })
                                    }
                                    options={[
                                        { value: "active", label: "Active" },
                                        { value: "inactive", label: "Inactive" },
                                        { value: "terminated", label: "Terminated" },
                                        { value: "on_leave", label: "On Leave" },
                                    ]}
                                    placeholder="Select status"
                                    disabled={disabled}
                                />
                                {errors.status && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.status}
                                    </p>
                                )}
                            </div>
                        </div>

                        {errors.form && (
                            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
                                {errors.form}
                            </div>
                        )}

                        <div className="flex justify-end space-x-3 mt-6">
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                    onClick={onClose}
                                >
                                    {isView ? "Close" : "Cancel"}
                                </button>
                            </Dialog.Close>
                            {!isView && (
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting
                                        ? "Saving..."
                                        : isEdit
                                          ? "Update Employee"
                                          : "Create Employee"}
                                </button>
                            )}
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

