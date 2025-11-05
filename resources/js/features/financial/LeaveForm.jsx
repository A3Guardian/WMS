import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm } from '../../hooks/useForm';
import api from '../../utils/api';
import { usePermissions } from '../../hooks/usePermissions';
import SearchableSelect from '../../components/SearchableSelect';
import { LEAVE_STATUS_LABELS, LEAVE_STATUS } from '../../utils/constants';

export default function LeaveForm() {
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

    const { data: leaveTypesData } = useQuery({
        queryKey: ['leave-types'],
        queryFn: async () => {
            const response = await api.get('/leave-types?per_page=100');
            return response.data;
        },
    });

    const { data: leaveData } = useQuery({
        queryKey: ['leave', id],
        queryFn: async () => {
            const response = await api.get(`/leaves/${id}`);
            return response.data;
        },
        enabled: isEdit,
    });

    const initialValues = {
        employee_id: '',
        leave_type_id: '',
        start_date: '',
        end_date: '',
        reason: '',
        status: LEAVE_STATUS.PENDING,
    };

    const { values, errors, isSubmitting, handleChange, handleSubmit, setValues } = useForm(
        initialValues,
        async (formValues) => {
            try {
                const submitData = {
                    employee_id: formValues.employee_id,
                    leave_type_id: formValues.leave_type_id,
                    start_date: formValues.start_date,
                    end_date: formValues.end_date,
                    reason: formValues.reason || null,
                };

                if (isEdit && hasPermission('edit leaves')) {
                    submitData.status = formValues.status;
                    if (formValues.status === LEAVE_STATUS.REJECTED && formValues.rejection_reason) {
                        submitData.rejection_reason = formValues.rejection_reason;
                    }
                    await api.put(`/leaves/${id}`, submitData);
                    toast.success('Leave updated successfully');
                } else if (!isEdit) {
                    await api.post('/leaves', submitData);
                    toast.success('Leave request created successfully');
                } else {
                    throw new Error('Unauthorized');
                }

                queryClient.invalidateQueries({ queryKey: ['leaves'] });
                navigate('/leaves');
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'An error occurred';
                toast.error(isEdit ? 'Failed to update leave' : 'Failed to create leave', {
                    description: errorMessage,
                });
                throw error;
            }
        }
    );

    useEffect(() => {
        if (leaveData) {
            const startDate = leaveData.start_date 
                ? new Date(leaveData.start_date).toISOString().split('T')[0]
                : '';
            const endDate = leaveData.end_date 
                ? new Date(leaveData.end_date).toISOString().split('T')[0]
                : '';
            
            setValues({
                employee_id: leaveData.employee_id || '',
                leave_type_id: leaveData.leave_type_id || '',
                start_date: startDate,
                end_date: endDate,
                reason: leaveData.reason || '',
                status: leaveData.status || LEAVE_STATUS.PENDING,
                rejection_reason: leaveData.rejection_reason || '',
            });
        }
    }, [leaveData, setValues]);

    const employees = employeesData?.data || [];
    const leaveTypes = leaveTypesData?.data || [];

    const canEditStatus = isEdit && hasPermission('edit leaves');

    if (isEdit && !hasPermission('edit leaves') && !hasPermission('view leaves')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to view or edit leaves.
            </div>
        );
    }

    if (!isEdit && !hasPermission('create leaves')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to create leaves.
            </div>
        );
    }

    const calculatedDays = useMemo(() => {
        if (values.start_date && values.end_date) {
            const start = new Date(values.start_date);
            const end = new Date(values.end_date);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return diffDays;
        }
        return 0;
    }, [values.start_date, values.end_date]);

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">
                {isEdit ? 'Edit Leave' : 'Request Leave'}
            </h1>

            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 mb-1">
                            Employee <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                            cacheKey="leave-employee"
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
                            disabled={isEdit}
                        />
                        {errors.employee_id && (
                            <p className="mt-1 text-sm text-red-600">{errors.employee_id}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="leave_type_id" className="block text-sm font-medium text-gray-700 mb-1">
                            Leave Type <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                            cacheKey="leave-type"
                            value={values.leave_type_id}
                            onChange={(value) => setValues({ ...values, leave_type_id: value || '' })}
                            fetchOptions={async (params) => {
                                const response = await api.get(`/leave-types?${params}`);
                                return response.data;
                            }}
                            searchParam="search"
                            placeholder="Select Leave Type"
                            displayValue={(lt) => lt.name}
                            emptyMessage="No leave types found."
                            disabled={isEdit && !canEditStatus}
                        />
                        {errors.leave_type_id && (
                            <p className="mt-1 text-sm text-red-600">{errors.leave_type_id}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            id="start_date"
                            name="start_date"
                            value={values.start_date}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={isEdit && !canEditStatus}
                        />
                        {errors.start_date && (
                            <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                            End Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            id="end_date"
                            name="end_date"
                            value={values.end_date}
                            onChange={handleChange}
                            min={values.start_date}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={isEdit && !canEditStatus}
                        />
                        {calculatedDays > 0 && (
                            <p className="mt-1 text-sm text-gray-500">
                                {calculatedDays} day{calculatedDays !== 1 ? 's' : ''}
                            </p>
                        )}
                        {errors.end_date && (
                            <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
                        )}
                    </div>

                    {canEditStatus && (
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
                                {Object.entries(LEAVE_STATUS_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                            {errors.status && (
                                <p className="mt-1 text-sm text-red-600">{errors.status}</p>
                            )}
                        </div>
                    )}

                    {canEditStatus && values.status === LEAVE_STATUS.REJECTED && (
                        <div>
                            <label htmlFor="rejection_reason" className="block text-sm font-medium text-gray-700 mb-1">
                                Rejection Reason
                            </label>
                            <textarea
                                id="rejection_reason"
                                name="rejection_reason"
                                value={values.rejection_reason || ''}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}

                    <div className="md:col-span-2">
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                            Reason
                        </label>
                        <textarea
                            id="reason"
                            name="reason"
                            value={values.reason}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isEdit && !canEditStatus}
                        />
                        {errors.reason && (
                            <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
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
                        {isSubmitting ? 'Saving...' : isEdit ? 'Update Leave' : 'Request Leave'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/leaves')}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

