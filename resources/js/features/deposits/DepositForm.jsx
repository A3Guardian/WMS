import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm } from '../../hooks/useForm';
import api from '../../utils/api';
import { usePermissions } from '../../hooks/usePermissions';

export default function DepositForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const isEdit = !!id;

    const { data: depositData } = useQuery({
        queryKey: ['deposit', id],
        queryFn: async () => {
            const response = await api.get(`/deposits/${id}`);
            return response.data;
        },
        enabled: isEdit,
    });

    const initialValues = {
        name: '',
        code: '',
        location: '',
        width: '',
        height: '',
        depth: '',
        capacity: '',
        status: 'active',
        description: '',
        notes: '',
    };

    const { values, errors, isSubmitting, handleChange, handleSubmit, setValues } = useForm(
        initialValues,
        async (formValues) => {
            try {
                const submitData = {
                    name: formValues.name,
                    code: formValues.code || null,
                    location: formValues.location || null,
                    width: formValues.width ? parseFloat(formValues.width) : null,
                    height: formValues.height ? parseFloat(formValues.height) : null,
                    depth: formValues.depth ? parseFloat(formValues.depth) : null,
                    capacity: formValues.capacity ? parseFloat(formValues.capacity) : null,
                    status: formValues.status,
                    description: formValues.description || null,
                    notes: formValues.notes || null,
                };

                if (isEdit) {
                    await api.put(`/deposits/${id}`, submitData);
                    toast.success('Deposit updated successfully');
                } else {
                    await api.post('/deposits', submitData);
                    toast.success('Deposit created successfully');
                }

                queryClient.invalidateQueries({ queryKey: ['deposits'] });
                navigate('/deposits');
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'An error occurred';
                toast.error(isEdit ? 'Failed to update deposit' : 'Failed to create deposit', {
                    description: errorMessage,
                });
                throw error;
            }
        }
    );

    useEffect(() => {
        if (depositData) {
            setValues({
                name: depositData.name || '',
                code: depositData.code || '',
                location: depositData.location || '',
                width: depositData.width || '',
                height: depositData.height || '',
                depth: depositData.depth || '',
                capacity: depositData.capacity || '',
                status: depositData.status || 'active',
                description: depositData.description || '',
                notes: depositData.notes || '',
            });
        }
    }, [depositData, setValues]);

    useEffect(() => {
        if (values.width && values.height && values.depth && !values.capacity) {
            const calculatedCapacity = parseFloat(values.width) * parseFloat(values.height) * parseFloat(values.depth);
            setValues({ ...values, capacity: calculatedCapacity.toFixed(2) });
        }
    }, [values.width, values.height, values.depth]);

    if (isEdit && !hasPermission('edit deposits')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to edit deposits.
            </div>
        );
    }

    if (!isEdit && !hasPermission('create deposits')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to create deposits.
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">
                {isEdit ? 'Edit Deposit' : 'Create Deposit'}
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                            placeholder="e.g., Warehouse A, Storage Room 1"
                        />
                    </div>

                    <div>
                        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                            Code
                        </label>
                        <input
                            type="text"
                            id="code"
                            name="code"
                            value={values.code}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Auto-generated if not provided"
                        />
                        <p className="mt-1 text-xs text-gray-500">Auto-generated if not provided</p>
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                            Location
                        </label>
                        <input
                            type="text"
                            id="location"
                            name="location"
                            value={values.location}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="e.g., Building A, Floor 2, Room 201"
                        />
                    </div>

                    <div>
                        <label htmlFor="width" className="block text-sm font-medium text-gray-700 mb-1">
                            Width (meters)
                        </label>
                        <input
                            type="number"
                            id="width"
                            name="width"
                            value={values.width}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                            Height (meters)
                        </label>
                        <input
                            type="number"
                            id="height"
                            name="height"
                            value={values.height}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label htmlFor="depth" className="block text-sm font-medium text-gray-700 mb-1">
                            Depth (meters)
                        </label>
                        <input
                            type="number"
                            id="depth"
                            name="depth"
                            value={values.depth}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                            Capacity (cubic meters)
                        </label>
                        <input
                            type="number"
                            id="capacity"
                            name="capacity"
                            value={values.capacity}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Auto-calculated from dimensions"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            {values.width && values.height && values.depth
                                ? `Calculated: ${(parseFloat(values.width || 0) * parseFloat(values.height || 0) * parseFloat(values.depth || 0)).toFixed(2)} m³`
                                : 'Auto-calculated from dimensions'}
                        </p>
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
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
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Deposit description"
                        />
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Additional notes"
                        />
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
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : isEdit ? 'Update Deposit' : 'Create Deposit'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/deposits')}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

