import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm } from '../../hooks/useForm';
import api from '../../utils/api';
import { usePermissions } from '../../hooks/usePermissions';

export default function UserForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const isEdit = !!id;

    const { data: rolesData } = useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const response = await api.get('/admin/roles');
            return response.data;
        },
    });

    const { data: userData } = useQuery({
        queryKey: ['user', id],
        queryFn: async () => {
            const response = await api.get(`/admin/users/${id}`);
            return response.data;
        },
        enabled: isEdit,
    });

    const initialValues = {
        name: '',
        email: '',
        password: '',
        roles: [],
    };

    const { values, errors, isSubmitting, handleChange, handleSubmit, setValues } = useForm(
        initialValues,
        async (formValues) => {
            try {
                const submitData = {
                    name: formValues.name,
                    email: formValues.email,
                };

                if (!isEdit || formValues.password) {
                    submitData.password = formValues.password;
                }

                if (formValues.roles && formValues.roles.length > 0) {
                    submitData.roles = formValues.roles;
                }

                if (isEdit) {
                    await api.put(`/admin/users/${id}`, submitData);
                    toast.success('User updated successfully');
                } else {
                    await api.post('/admin/users', submitData);
                    toast.success('User created successfully');
                }

                queryClient.invalidateQueries({ queryKey: ['users'] });
                navigate('/admin/users');
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'An error occurred';
                toast.error(isEdit ? 'Failed to update user' : 'Failed to create user', {
                    description: errorMessage,
                });
                throw error;
            }
        }
    );

    useEffect(() => {
        if (userData) {
            setValues({
                name: userData.name || '',
                email: userData.email || '',
                password: '',
                roles: userData.roles?.map(role => role.name) || [],
            });
        }
    }, [userData, setValues]);

    const handleRoleChange = (roleName) => {
        const currentRoles = values.roles || [];
        const newRoles = currentRoles.includes(roleName)
            ? currentRoles.filter(r => r !== roleName)
            : [...currentRoles, roleName];
        
        setValues({
            ...values,
            roles: newRoles,
        });
    };

    const roles = rolesData || [];

    if (isEdit && !hasPermission('edit users')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to edit users.
            </div>
        );
    }

    if (!isEdit && !hasPermission('create users')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to create users.
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">
                {isEdit ? 'Edit User' : 'Create User'}
            </h1>

            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
                <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={values.name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                </div>

                <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={values.email}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                    {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                </div>

                <div className="mb-4">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={values.password}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={!isEdit}
                        minLength={8}
                    />
                    {isEdit && (
                        <p className="mt-1 text-sm text-gray-500">Leave blank to keep current password</p>
                    )}
                    {errors.password && (
                        <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                    )}
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Roles
                    </label>
                    <div className="space-y-2 border border-gray-300 rounded-md p-4 max-h-60 overflow-y-auto">
                        {roles.length === 0 ? (
                            <p className="text-sm text-gray-500">No roles available</p>
                        ) : (
                            roles.map((role) => (
                                <label
                                    key={role.id || role.name}
                                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                >
                                    <input
                                        type="checkbox"
                                        checked={values.roles?.includes(role.name) || false}
                                        onChange={() => handleRoleChange(role.name)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{role.name}</span>
                                </label>
                            ))
                        )}
                    </div>
                    {errors.roles && (
                        <p className="mt-1 text-sm text-red-600">{errors.roles}</p>
                    )}
                </div>

                {errors.form && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                        {errors.form}
                    </div>
                )}

                <div className="flex space-x-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/users')}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

