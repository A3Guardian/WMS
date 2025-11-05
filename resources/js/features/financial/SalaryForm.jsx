import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm } from '../../hooks/useForm';
import api from '../../utils/api';
import { usePermissions } from '../../hooks/usePermissions';
import SearchableSelect from '../../components/SearchableSelect';
import { SALARY_TYPE_LABELS } from '../../utils/constants';

export default function SalaryForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const isEdit = !!id;

    const { data: employeesData } = useQuery({
        queryKey: ['employees'],
        queryFn: async () => {
            const response = await api.get('/employees?per_page=100');
            return response.data;
        },
    });

    const { data: salaryData } = useQuery({
        queryKey: ['salary', id],
        queryFn: async () => {
            const response = await api.get(`/salaries/${id}`);
            return response.data;
        },
        enabled: isEdit,
    });

    const initialValues = {
        employee_id: '',
        amount: '',
        effective_date: '',
        end_date: '',
        type: 'base',
        notes: '',
    };

    const { values, errors, isSubmitting, handleChange, handleSubmit, setValues } = useForm(
        initialValues,
        async (formValues) => {
            try {
                const submitData = {
                    ...formValues,
                    employee_id: formValues.employee_id,
                    amount: parseFloat(formValues.amount),
                    end_date: formValues.end_date || null,
                };

                if (isEdit) {
                    await api.put(`/salaries/${id}`, submitData);
                    toast.success('Salary updated successfully');
                } else {
                    await api.post('/salaries', submitData);
                    toast.success('Salary created successfully');
                }

                queryClient.invalidateQueries({ queryKey: ['salaries'] });
                navigate('/salaries');
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'An error occurred';
                toast.error(isEdit ? 'Failed to update salary' : 'Failed to create salary', {
                    description: errorMessage,
                });
                throw error;
            }
        }
    );

    useEffect(() => {
        if (salaryData) {
            const effectiveDate = salaryData.effective_date 
                ? new Date(salaryData.effective_date).toISOString().split('T')[0]
                : '';
            const endDate = salaryData.end_date 
                ? new Date(salaryData.end_date).toISOString().split('T')[0]
                : '';
            
            setValues({
                employee_id: salaryData.employee_id || '',
                amount: salaryData.amount || '',
                effective_date: effectiveDate,
                end_date: endDate,
                type: salaryData.type || 'base',
                notes: salaryData.notes || '',
            });
        }
    }, [salaryData, setValues]);

    const employees = employeesData?.data || [];

    if (isEdit && !hasPermission('manage salaries')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to edit salaries.
            </div>
        );
    }

    if (!isEdit && !hasPermission('manage salaries')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to create salaries.
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">
                {isEdit ? 'Edit Salary' : 'Create Salary'}
            </h1>

            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 mb-1">
                            Employee <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                            cacheKey="salary-employee"
                            value={values.employee_id}
                            onChange={(value) => setValues({ ...values, employee_id: value || '' })}
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
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                            Amount <span className="text-red-500">*</span>
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
                            <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                            Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="type"
                            name="type"
                            value={values.type}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            {Object.entries(SALARY_TYPE_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        {errors.type && (
                            <p className="mt-1 text-sm text-red-600">{errors.type}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="effective_date" className="block text-sm font-medium text-gray-700 mb-1">
                            Effective Date <span className="text-red-500">*</span>
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
                            <p className="mt-1 text-sm text-red-600">{errors.effective_date}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                            End Date
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
                            <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
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
                        {isSubmitting ? 'Saving...' : isEdit ? 'Update Salary' : 'Create Salary'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/salaries')}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

