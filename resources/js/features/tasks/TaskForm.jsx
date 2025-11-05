import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm } from '../../hooks/useForm';
import api from '../../utils/api';
import { usePermissions } from '../../hooks/usePermissions';
import { TASK_STATUS_LABELS, TASK_STATUS } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';
import SearchableSelect from '../../components/SearchableSelect';

export default function TaskForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission, hasRole } = usePermissions();
    const isEdit = !!id;
    const [imagePreviews, setImagePreviews] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const isEmployee = hasRole('Employee');
    const canEditFull = hasPermission('edit tasks');

    const { data: taskData } = useQuery({
        queryKey: ['task', id],
        queryFn: async () => {
            const response = await api.get(`/tasks/${id}`);
            return response.data;
        },
        enabled: isEdit,
    });

    const initialValues = {
        assigned_to: '',
        order_id: '',
        title: '',
        description: '',
        status: TASK_STATUS.PENDING,
        images: [],
        due_date: '',
    };

    const { values, errors, isSubmitting, handleChange, handleSubmit, setValues } = useForm(
        initialValues,
        async (formValues) => {
            try {
                const formData = new FormData();
                
                if (canEditFull) {
                    formData.append('assigned_to', formValues.assigned_to);
                    if (formValues.order_id) {
                        formData.append('order_id', formValues.order_id);
                    }
                    formData.append('title', formValues.title);
                    if (formValues.due_date) {
                        formData.append('due_date', formValues.due_date);
                    }
                    if (formValues.images && formValues.images.length > 0) {
                        Array.from(formValues.images).forEach((file) => {
                            formData.append('images[]', file);
                        });
                    }
                }
                
                if (formValues.description !== undefined) {
                    formData.append('description', formValues.description);
                }
                formData.append('status', formValues.status);

                if (isEdit) {
                    await api.put(`/tasks/${id}`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });
                    toast.success('Task updated successfully');
                } else {
                    await api.post('/tasks', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });
                    toast.success('Task created successfully');
                }

                queryClient.invalidateQueries({ queryKey: ['tasks'] });
                navigate('/tasks');
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'An error occurred';
                toast.error(isEdit ? 'Failed to update task' : 'Failed to create task', {
                    description: errorMessage,
                });
                throw error;
            }
        }
    );

    useEffect(() => {
        if (taskData) {
            const dueDate = taskData.due_date 
                ? new Date(taskData.due_date).toISOString().split('T')[0]
                : '';
            
            setValues({
                assigned_to: taskData.assigned_to?.id || '',
                order_id: taskData.order_id || '',
                title: taskData.title || '',
                description: taskData.description || '',
                status: taskData.status || TASK_STATUS.PENDING,
                images: [],
                due_date: dueDate,
            });

            if (taskData.images && taskData.images.length > 0) {
                setExistingImages(taskData.images);
            }
        }
    }, [taskData, setValues]);

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setValues({
            ...values,
            images: files,
        });

        const previews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(previews);
    };

    const removeImagePreview = (index) => {
        const newImages = Array.from(values.images);
        newImages.splice(index, 1);
        setValues({
            ...values,
            images: newImages,
        });

        const newPreviews = [...imagePreviews];
        URL.revokeObjectURL(newPreviews[index]);
        newPreviews.splice(index, 1);
        setImagePreviews(newPreviews);
    };

    const removeExistingImage = (imagePath) => {
        setExistingImages(existingImages.filter(img => img !== imagePath));
    };

    const getImageUrl = (imagePath) => {
        if (imagePath.startsWith('http')) {
            return imagePath;
        }
        return `${import.meta.env.VITE_API_URL || '/api'}/storage/${imagePath}`;
    };

    if (isEdit && !canEditFull && !isEmployee) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to edit tasks.
            </div>
        );
    }

    if (!isEdit && !hasPermission('create tasks')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to create tasks.
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">
                {isEdit ? 'Edit Task' : 'Create Task'}
            </h1>

            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
                {!isEmployee && (
                    <>
                        <div className="mb-4">
                            <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 mb-1">
                                Assign To <span className="text-red-500">*</span>
                            </label>
                            <SearchableSelect
                                cacheKey="task-assigned-to"
                                value={values.assigned_to}
                                onChange={(value) => setValues({ ...values, assigned_to: value })}
                                fetchOptions={async (params) => {
                                    const response = await api.get(`/admin/users?${params}`);
                                    return response.data;
                                }}
                                searchParam="search"
                                placeholder="Select Employee"
                                displayValue={(user) => `${user.name} (${user.email})`}
                                emptyMessage="No employees found."
                                disabled={isEdit && !canEditFull}
                            />
                            {errors.assigned_to && (
                                <p className="mt-1 text-sm text-red-600">{errors.assigned_to}</p>
                            )}
                        </div>

                        <div className="mb-4">
                            <label htmlFor="order_id" className="block text-sm font-medium text-gray-700 mb-1">
                                Order (Optional)
                            </label>
                            <SearchableSelect
                                cacheKey="task-order"
                                value={values.order_id}
                                onChange={(value) => setValues({ ...values, order_id: value || '' })}
                                fetchOptions={async (params) => {
                                    const response = await api.get(`/orders?${params}`);
                                    return response.data;
                                }}
                                searchParam="search"
                                placeholder="No Order"
                                displayValue={(order) => `${order.order_number} - ${order.supplier?.name || 'N/A'}`}
                                emptyMessage="No orders found."
                                disabled={isEdit && !canEditFull}
                            />
                            {errors.order_id && (
                                <p className="mt-1 text-sm text-red-600">{errors.order_id}</p>
                            )}
                        </div>

                        <div className="mb-4">
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={values.title}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required={!isEdit}
                                disabled={isEdit && !canEditFull}
                            />
                            {errors.title && (
                                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                            )}
                        </div>
                    </>
                )}

                {isEmployee && isEdit && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium text-gray-700 mb-2">Task: {taskData?.title}</p>
                        <p className="text-sm text-gray-600">Assigned to: {taskData?.assigned_to?.name}</p>
                        {taskData?.order?.order_number && (
                            <p className="text-sm text-gray-600">Order: {taskData.order.order_number}</p>
                        )}
                    </div>
                )}

                <div className="mb-4">
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

                <div className="mb-4">
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
                        {Object.entries(TASK_STATUS_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </select>
                    {errors.status && (
                        <p className="mt-1 text-sm text-red-600">{errors.status}</p>
                    )}
                </div>

                <div className="mb-4">
                    <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date
                    </label>
                    <input
                        type="date"
                        id="due_date"
                        name="due_date"
                        value={values.due_date}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.due_date && (
                        <p className="mt-1 text-sm text-red-600">{errors.due_date}</p>
                    )}
                </div>

                {canEditFull && (
                    <div className="mb-6">
                        <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-1">
                            Images
                        </label>
                        <input
                            type="file"
                            id="images"
                            name="images"
                            multiple
                            accept="image/*"
                            onChange={handleImageChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.images && (
                            <p className="mt-1 text-sm text-red-600">{errors.images}</p>
                        )}

                        {existingImages.length > 0 && (
                            <div className="mt-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Existing Images:</p>
                                <div className="grid grid-cols-4 gap-4">
                                    {existingImages.map((imagePath, index) => (
                                        <div key={index} className="relative">
                                            <img
                                                src={getImageUrl(imagePath)}
                                                alt={`Task image ${index + 1}`}
                                                className="w-full h-32 object-cover rounded border"
                                            />
                                            {canEditFull && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingImage(imagePath)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {imagePreviews.length > 0 && (
                            <div className="mt-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">New Images:</p>
                                <div className="grid grid-cols-4 gap-4">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="relative">
                                            <img
                                                src={preview}
                                                alt={`Preview ${index + 1}`}
                                                className="w-full h-32 object-cover rounded border"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImagePreview(index)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

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
                        {isSubmitting ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/tasks')}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

