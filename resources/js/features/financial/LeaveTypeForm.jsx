import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm } from '../../hooks/useForm';
import api from '../../utils/api';
import { usePermissions } from '../../hooks/usePermissions';

export default function LeaveTypeForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const isEdit = !!id;

    const { data: leaveTypeData } = useQuery({
        queryKey: ['leave-type', id],
        queryFn: async () => {
            const response = await api.get(`/leave-types/${id}`);
            return response.data;
        },
        enabled: isEdit,
    });

    const initialValues = {
        name: '',
        max_days_per_year: '',
        carry_forward: false,
        description: '',
        is_active: true,
    };

    const { values, errors, isSubmitting, handleChange, handleSubmit, setValues } = useForm(
        initialValues,
        async (formValues) => {
            try {
                const submitData = {
                    ...formValues,
                    max_days_per_year: parseInt(formValues.max_days_per_year),
                    carry_forward: formValues.carry_forward === true || formValues.carry_forward === 'true',
                    is_active: formValues.is_active === true || formValues.is_active === 'true',
                };

                if (isEdit) {
                    await api.put(`/leave-types/${id}`, submitData);
                    toast.success('Leave type updated successfully');
                } else {
                    await api.post('/leave-types', submitData);
                    toast.success('Leave type created successfully');
                }

                queryClient.invalidateQueries({ queryKey: ['leave-types'] });
                navigate('/leave-types');
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'An error occurred';
                toast.error(isEdit ? 'Failed to update leave type' : 'Failed to create leave type', {
                    description: errorMessage,
                });
                throw error;
            }
        }
    );

    useEffect(() => {
        if (leaveTypeData) {
            setValues({
                name: leaveTypeData.name || '',
                max_days_per_year: leaveTypeData.max_days_per_year || '',
                carry_forward: leaveTypeData.carry_forward || false,
                description: leaveTypeData.description || '',
                is_active: leaveTypeData.is_active !== undefined ? leaveTypeData.is_active : true,
            });
        }
    }, [leaveTypeData, setValues]);

    if (isEdit && !hasPermission('manage leave types')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to edit leave types.
            </div>
        );
    }

    if (!isEdit && !hasPermission('manage leave types')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to create leave types.
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">
                {isEdit ? 'Edit Leave Type' : 'Create Leave Type'}
            </h1>

            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Name <span className="text-red-500">*</span>
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

                    <div>
                        <label htmlFor="max_days_per_year" className="block text-sm font-medium text-gray-700 mb-1">
                            Max Days Per Year <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            id="max_days_per_year"
                            name="max_days_per_year"
                            value={values.max_days_per_year}
                            onChange={handleChange}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        {errors.max_days_per_year && (
                            <p className="mt-1 text-sm text-red-600">{errors.max_days_per_year}</p>
                        )}
                    </div>

                    <div>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="carry_forward"
                                checked={values.carry_forward}
                                onChange={(e) => setValues({ ...values, carry_forward: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Allow Carry Forward</span>
                        </label>
                    </div>

                    <div>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={values.is_active}
                                onChange={(e) => setValues({ ...values, is_active: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Active</span>
                        </label>
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={values.description}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.description && (
                            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
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
                        {isSubmitting ? 'Saving...' : isEdit ? 'Update Leave Type' : 'Create Leave Type'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/leave-types')}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

