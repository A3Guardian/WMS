import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm } from '../../hooks/useForm';
import api from '../../utils/api';
import { usePermissions } from '../../hooks/usePermissions';
import SearchableSelect from '../../components/SearchableSelect';

export default function EmployeeForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const isEdit = !!id;

    const { data: departmentsData } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const response = await api.get('/departments?per_page=100');
            return response.data;
        },
    });

    const { data: usersData } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await api.get('/admin/users?per_page=100');
            return response.data;
        },
    });

    const { data: employeeData } = useQuery({
        queryKey: ['employee', id],
        queryFn: async () => {
            const response = await api.get(`/employees/${id}`);
            return response.data;
        },
        enabled: isEdit,
    });

    const initialValues = {
        user_id: '',
        employee_code: '',
        department_id: '',
        position: '',
        hire_date: '',
        employment_type: 'full-time',
        salary: '',
        phone: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        status: 'active',
    };

    const { values, errors, isSubmitting, handleChange, handleSubmit, setValues } = useForm(
        initialValues,
        async (formValues) => {
            try {
                const submitData = {
                    ...formValues,
                    user_id: formValues.user_id || null,
                    department_id: formValues.department_id || null,
                    salary: formValues.salary ? parseFloat(formValues.salary) : null,
                };

                if (isEdit) {
                    await api.put(`/employees/${id}`, submitData);
                    toast.success('Employee updated successfully');
                } else {
                    await api.post('/employees', submitData);
                    toast.success('Employee created successfully');
                }

                queryClient.invalidateQueries({ queryKey: ['employees'] });
                navigate('/employees');
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'An error occurred';
                toast.error(isEdit ? 'Failed to update employee' : 'Failed to create employee', {
                    description: errorMessage,
                });
                throw error;
            }
        }
    );

    useEffect(() => {
        if (employeeData) {
            const hireDate = employeeData.hire_date 
                ? new Date(employeeData.hire_date).toISOString().split('T')[0]
                : '';
            
            setValues({
                user_id: employeeData.user_id || '',
                employee_code: employeeData.employee_code || '',
                department_id: employeeData.department_id || '',
                position: employeeData.position || '',
                hire_date: hireDate,
                employment_type: employeeData.employment_type || 'full-time',
                salary: employeeData.salary || '',
                phone: employeeData.phone || '',
                address: employeeData.address || '',
                emergency_contact_name: employeeData.emergency_contact_name || '',
                emergency_contact_phone: employeeData.emergency_contact_phone || '',
                status: employeeData.status || 'active',
            });
        }
    }, [employeeData, setValues]);

    const departments = departmentsData?.data || [];
    const users = usersData?.data || [];

    if (isEdit && !hasPermission('edit employees')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to edit employees.
            </div>
        );
    }

    if (!isEdit && !hasPermission('create employees')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to create employees.
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">
                {isEdit ? 'Edit Employee' : 'Create Employee'}
            </h1>

            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="employee_code" className="block text-sm font-medium text-gray-700 mb-1">
                            Employee Code <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="employee_code"
                            name="employee_code"
                            value={values.employee_code}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        {errors.employee_code && (
                            <p className="mt-1 text-sm text-red-600">{errors.employee_code}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="user_id" className="block text-sm font-medium text-gray-700 mb-1">
                            Link to User (Optional)
                        </label>
                        <SearchableSelect
                            cacheKey="employee-user"
                            value={values.user_id}
                            onChange={(value) => setValues({ ...values, user_id: value || '' })}
                            fetchOptions={async (params) => {
                                const response = await api.get(`/admin/users?${params}`);
                                return response.data;
                            }}
                            searchParam="search"
                            placeholder="Select User"
                            displayValue={(user) => `${user.name} (${user.email})`}
                            emptyMessage="No users found."
                        />
                        {errors.user_id && (
                            <p className="mt-1 text-sm text-red-600">{errors.user_id}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="department_id" className="block text-sm font-medium text-gray-700 mb-1">
                            Department
                        </label>
                        <SearchableSelect
                            cacheKey="employee-department"
                            value={values.department_id}
                            onChange={(value) => setValues({ ...values, department_id: value || '' })}
                            fetchOptions={async (params) => {
                                const response = await api.get(`/departments?${params}`);
                                return response.data;
                            }}
                            searchParam="search"
                            placeholder="Select Department"
                            displayValue={(dept) => dept.name}
                            emptyMessage="No departments found."
                        />
                        {errors.department_id && (
                            <p className="mt-1 text-sm text-red-600">{errors.department_id}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                            Position
                        </label>
                        <input
                            type="text"
                            id="position"
                            name="position"
                            value={values.position}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.position && (
                            <p className="mt-1 text-sm text-red-600">{errors.position}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="hire_date" className="block text-sm font-medium text-gray-700 mb-1">
                            Hire Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            id="hire_date"
                            name="hire_date"
                            value={values.hire_date}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        {errors.hire_date && (
                            <p className="mt-1 text-sm text-red-600">{errors.hire_date}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="employment_type" className="block text-sm font-medium text-gray-700 mb-1">
                            Employment Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="employment_type"
                            name="employment_type"
                            value={values.employment_type}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="full-time">Full-time</option>
                            <option value="part-time">Part-time</option>
                            <option value="contractor">Contractor</option>
                            <option value="intern">Intern</option>
                        </select>
                        {errors.employment_type && (
                            <p className="mt-1 text-sm text-red-600">{errors.employment_type}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.salary && (
                            <p className="mt-1 text-sm text-red-600">{errors.salary}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                            Phone
                        </label>
                        <input
                            type="text"
                            id="phone"
                            name="phone"
                            value={values.phone}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.phone && (
                            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                        )}
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                            Address
                        </label>
                        <textarea
                            id="address"
                            name="address"
                            value={values.address}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.address && (
                            <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="emergency_contact_name" className="block text-sm font-medium text-gray-700 mb-1">
                            Emergency Contact Name
                        </label>
                        <input
                            type="text"
                            id="emergency_contact_name"
                            name="emergency_contact_name"
                            value={values.emergency_contact_name}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.emergency_contact_name && (
                            <p className="mt-1 text-sm text-red-600">{errors.emergency_contact_name}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="emergency_contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
                            Emergency Contact Phone
                        </label>
                        <input
                            type="text"
                            id="emergency_contact_phone"
                            name="emergency_contact_phone"
                            value={values.emergency_contact_phone}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.emergency_contact_phone && (
                            <p className="mt-1 text-sm text-red-600">{errors.emergency_contact_phone}</p>
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
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="terminated">Terminated</option>
                            <option value="on_leave">On Leave</option>
                        </select>
                        {errors.status && (
                            <p className="mt-1 text-sm text-red-600">{errors.status}</p>
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
                        {isSubmitting ? 'Saving...' : isEdit ? 'Update Employee' : 'Create Employee'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/employees')}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

