import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm } from '../../hooks/useForm';
import api from '../../utils/api';
import { usePermissions } from '../../hooks/usePermissions';
import SearchableSelect from '../../components/SearchableSelect';
import { PAYROLL_STATUS_LABELS, PAYROLL_STATUS } from '../../utils/constants';

export default function PayrollRecordForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const isEdit = !!id;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const { data: employeesData } = useQuery({
        queryKey: ['employees'],
        queryFn: async () => {
            const response = await api.get('/employees?per_page=100');
            return response.data;
        },
    });

    const { data: payrollData } = useQuery({
        queryKey: ['payroll-record', id],
        queryFn: async () => {
            const response = await api.get(`/payroll-records/${id}`);
            return response.data;
        },
        enabled: isEdit,
    });

    const initialValues = {
        employee_id: '',
        month: currentMonth,
        year: currentYear,
        base_salary: '',
        deductions: '',
        bonuses: '',
        overtime_pay: '',
        status: PAYROLL_STATUS.DRAFT,
        notes: '',
    };

    const { values, errors, isSubmitting, handleChange, handleSubmit, setValues } = useForm(
        initialValues,
        async (formValues) => {
            try {
                const submitData = {
                    employee_id: formValues.employee_id,
                    month: parseInt(formValues.month),
                    year: parseInt(formValues.year),
                    base_salary: formValues.base_salary ? parseFloat(formValues.base_salary) : null,
                    deductions: parseFloat(formValues.deductions || 0),
                    bonuses: parseFloat(formValues.bonuses || 0),
                    overtime_pay: parseFloat(formValues.overtime_pay || 0),
                    status: formValues.status,
                    notes: formValues.notes || null,
                };

                if (isEdit) {
                    await api.put(`/payroll-records/${id}`, submitData);
                    toast.success('Payroll record updated successfully');
                } else {
                    await api.post('/payroll-records', submitData);
                    toast.success('Payroll record created successfully');
                }

                queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
                navigate('/payroll-records');
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'An error occurred';
                toast.error(isEdit ? 'Failed to update payroll record' : 'Failed to create payroll record', {
                    description: errorMessage,
                });
                throw error;
            }
        }
    );

    useEffect(() => {
        if (payrollData) {
            setValues({
                employee_id: payrollData.employee_id || '',
                month: payrollData.month || currentMonth,
                year: payrollData.year || currentYear,
                base_salary: payrollData.base_salary || '',
                deductions: payrollData.deductions || '',
                bonuses: payrollData.bonuses || '',
                overtime_pay: payrollData.overtime_pay || '',
                status: payrollData.status || PAYROLL_STATUS.DRAFT,
                notes: payrollData.notes || '',
            });
        }
    }, [payrollData, setValues, currentMonth, currentYear]);

    const employees = employeesData?.data || [];

    const netSalary = useMemo(() => {
        const base = parseFloat(values.base_salary || 0);
        const bonuses = parseFloat(values.bonuses || 0);
        const overtime = parseFloat(values.overtime_pay || 0);
        const deductions = parseFloat(values.deductions || 0);
        return base + bonuses + overtime - deductions;
    }, [values.base_salary, values.bonuses, values.overtime_pay, values.deductions]);

    if (isEdit && !hasPermission('manage payroll')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to edit payroll records.
            </div>
        );
    }

    if (!isEdit && !hasPermission('manage payroll')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to create payroll records.
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">
                {isEdit ? 'Edit Payroll Record' : 'Create Payroll Record'}
            </h1>

            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 mb-1">
                            Employee <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                            cacheKey="payroll-employee"
                            value={values.employee_id}
                            onChange={(value) => {
                                const selectedEmployee = employees.find(emp => emp.id === parseInt(value));
                                setValues({ 
                                    ...values, 
                                    employee_id: value || '',
                                    base_salary: selectedEmployee?.salary || values.base_salary || ''
                                });
                            }}
                            fetchOptions={async (params) => {
                                const response = await api.get(`/employees?${params}`);
                                return response.data;
                            }}
                            searchParam="search"
                            placeholder="Select Employee"
                            displayValue={(emp) => `${emp.employee_code} - ${emp.user?.name || 'N/A'}`}
                            emptyMessage="No employees found."
                        />
                        {errors.employee_id && (
                            <p className="mt-1 text-sm text-red-600">{errors.employee_id}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
                            Month <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="month"
                            name="month"
                            value={values.month}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                                <option key={month} value={month}>
                                    {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                        {errors.month && (
                            <p className="mt-1 text-sm text-red-600">{errors.month}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                            Year <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            id="year"
                            name="year"
                            value={values.year}
                            onChange={handleChange}
                            min="2000"
                            max="9999"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        {errors.year && (
                            <p className="mt-1 text-sm text-red-600">{errors.year}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="base_salary" className="block text-sm font-medium text-gray-700 mb-1">
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
                            {values.employee_id ? 'Auto-filled from employee. You can override if needed.' : 'Select an employee to auto-fill'}
                        </p>
                        {errors.base_salary && (
                            <p className="mt-1 text-sm text-red-600">{errors.base_salary}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="bonuses" className="block text-sm font-medium text-gray-700 mb-1">
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
                        {errors.bonuses && (
                            <p className="mt-1 text-sm text-red-600">{errors.bonuses}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="overtime_pay" className="block text-sm font-medium text-gray-700 mb-1">
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
                            <p className="mt-1 text-sm text-red-600">{errors.overtime_pay}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="deductions" className="block text-sm font-medium text-gray-700 mb-1">
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
                        {errors.deductions && (
                            <p className="mt-1 text-sm text-red-600">{errors.deductions}</p>
                        )}
                    </div>

                    <div className="md:col-span-2">
                        <div className="bg-gray-50 p-4 rounded-md">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-gray-700">Net Salary:</span>
                                <span className="text-2xl font-bold text-blue-600">
                                    ${netSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <select
                            id="status"
                            name="status"
                            value={values.status}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {Object.entries(PAYROLL_STATUS_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        {errors.status && (
                            <p className="mt-1 text-sm text-red-600">{errors.status}</p>
                        )}
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
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
                            <p className="mt-1 text-sm text-red-600">{errors.notes}</p>
                        )}
                    </div>
                </div>

                {errors.form && (
                    <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
                        {errors.form}
                    </div>
                )}

                <div className="flex space-x-4 mt-6">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Saving...' : isEdit ? 'Update Payroll Record' : 'Create Payroll Record'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/payroll-records')}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

