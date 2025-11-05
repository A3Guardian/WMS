import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';
import { formatDate } from '../../utils/formatters';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '../../utils/constants';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../utils/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import EmployeeTaskView from './EmployeeTaskView';

export default function TaskList() {
    const { hasRole, hasPermission } = usePermissions();
    const isEmployee = hasRole('Employee');
    
    if (isEmployee) {
        return <EmployeeTaskView />;
    }

    const { data, loading, error } = useFetch('tasks', '/tasks');
    const queryClient = useQueryClient();
    const [deletingId, setDeletingId] = useState(null);

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/tasks/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete task', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
        onSettled: () => {
            setDeletingId(null);
        },
    });

    const handleDelete = async (taskId) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            setDeletingId(taskId);
            deleteMutation.mutate(taskId);
        }
    };

    const getStatusBadge = (status) => {
        const color = TASK_STATUS_COLORS[status] || 'gray';
        const label = TASK_STATUS_LABELS[status] || status;
        
        const colorClasses = {
            yellow: 'bg-yellow-100 text-yellow-800',
            blue: 'bg-blue-100 text-blue-800',
            green: 'bg-green-100 text-green-800',
            red: 'bg-red-100 text-red-800',
            gray: 'bg-gray-100 text-gray-800',
        };

        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[color]}`}>
                {label}
            </span>
        );
    };

    const columns = [
        { key: 'title', label: 'Title' },
        { 
            key: 'assigned_to.name', 
            label: 'Assigned To',
            render: (value) => value || '-'
        },
        { 
            key: 'assigned_by.name', 
            label: 'Assigned By',
            render: (value) => value || '-'
        },
        { 
            key: 'order.order_number', 
            label: 'Order',
            render: (value) => value ? (
                <Link to={`/orders`} className="text-blue-600 hover:underline">
                    {value}
                </Link>
            ) : '-'
        },
        { 
            key: 'status', 
            label: 'Status',
            render: (value) => getStatusBadge(value)
        },
        { 
            key: 'due_date', 
            label: 'Due Date',
            render: (value) => value ? formatDate(value) : '-'
        },
        { 
            key: 'created_at', 
            label: 'Created',
            render: (value) => formatDate(value)
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (value, row) => (
                <div className="flex space-x-2">
                    <Link
                        to={`/tasks/${row.id}/edit`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Edit
                    </Link>
                    {hasPermission('delete tasks') && (
                        <button
                            onClick={() => handleDelete(row.id)}
                            disabled={deletingId === row.id}
                            className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                        >
                            {deletingId === row.id ? 'Deleting...' : 'Delete'}
                        </button>
                    )}
                </div>
            ),
        },
    ];

    if (error) {
        const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
        const isPermissionError = error?.response?.status === 403;
        
        return (
            <div className={`p-4 rounded ${isPermissionError ? 'bg-yellow-50 text-yellow-800' : 'bg-red-50 text-red-800'}`}>
                <p className="font-semibold">
                    {isPermissionError ? 'Permission Denied' : 'Error'}
                </p>
                <p>{errorMessage}</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Tasks</h1>
                {hasPermission('create tasks') && (
                    <Link
                        to="/tasks/create"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Create Task
                    </Link>
                )}
            </div>
            <DataTable
                columns={columns}
                data={data?.data || []}
                loading={loading}
            />
        </div>
    );
}

