import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm } from '../../hooks/useForm';
import api from '../../utils/api';
import { usePermissions } from '../../hooks/usePermissions';
import SearchableSelect from '../../components/SearchableSelect';
import { ATTENDANCE_STATUS_LABELS } from '../../utils/constants';

export default function AttendanceForm() {
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

    const { data: attendanceData } = useQuery({
        queryKey: ['attendance', id],
        queryFn: async () => {
            const response = await api.get(`/attendance/${id}`);
            return response.data;
        },
        enabled: isEdit,
    });

    const initialValues = {
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        clock_in: '',
        clock_out: '',
        status: 'present',
        notes: '',
    };

    const { values, errors, isSubmitting, handleChange, handleSubmit, setValues } = useForm(
        initialValues,
        async (formValues) => {
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
                    await api.put(`/attendance/${id}`, submitData);
                    toast.success('Attendance updated successfully');
                } else {
                    await api.post('/attendance', submitData);
                    toast.success('Attendance created successfully');
                }

                queryClient.invalidateQueries({ queryKey: ['attendance'] });
                navigate('/attendance');
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'An error occurred';
                toast.error(isEdit ? 'Failed to update attendance' : 'Failed to create attendance', {
                    description: errorMessage,
                });
                throw error;
            }
        }
    );

    useEffect(() => {
        if (attendanceData) {
            const date = attendanceData.date 
                ? new Date(attendanceData.date).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            
            const clockIn = attendanceData.clock_in 
                ? new Date(attendanceData.clock_in).toTimeString().slice(0, 5)
                : '';
            const clockOut = attendanceData.clock_out 
                ? new Date(attendanceData.clock_out).toTimeString().slice(0, 5)
                : '';
            
            setValues({
                employee_id: attendanceData.employee_id || '',
                date: date,
                clock_in: clockIn,
                clock_out: clockOut,
                status: attendanceData.status || 'present',
                notes: attendanceData.notes || '',
            });
        }
    }, [attendanceData, setValues]);

    const employees = employeesData?.data || [];

    if (isEdit && !hasPermission('manage attendance')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to edit attendance.
            </div>
        );
    }

    if (!isEdit && !hasPermission('manage attendance')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to create attendance.
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">
                {isEdit ? 'Edit Attendance' : 'Create Attendance'}
            </h1>

            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 mb-1">
                            Employee <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                            cacheKey="attendance-employee"
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
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                            Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            id="date"
                            name="date"
                            value={values.date}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        {errors.date && (
                            <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="clock_in" className="block text-sm font-medium text-gray-700 mb-1">
                            Clock In Time
                        </label>
                        <input
                            type="time"
                            id="clock_in"
                            name="clock_in"
                            value={values.clock_in}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.clock_in && (
                            <p className="mt-1 text-sm text-red-600">{errors.clock_in}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="clock_out" className="block text-sm font-medium text-gray-700 mb-1">
                            Clock Out Time
                        </label>
                        <input
                            type="time"
                            id="clock_out"
                            name="clock_out"
                            value={values.clock_out}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.clock_out && (
                            <p className="mt-1 text-sm text-red-600">{errors.clock_out}</p>
                        )}
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
                            {Object.entries(ATTENDANCE_STATUS_LABELS).map(([key, label]) => (
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
                        {isSubmitting ? 'Saving...' : isEdit ? 'Update Attendance' : 'Create Attendance'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/attendance')}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

