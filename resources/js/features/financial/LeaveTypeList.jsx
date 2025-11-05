import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DataTable from '../../components/DataTable';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../utils/api';

export default function LeaveTypeList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(15);

    const { data, isLoading, error } = useQuery({
        queryKey: ['leave-types', page, perPage],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            const response = await api.get(`/leave-types?${params.toString()}`);
            return response.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (leaveTypeId) => {
            const response = await api.delete(`/leave-types/${leaveTypeId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-types'] });
            toast.success('Leave type deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete leave type', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const handleDelete = (leaveType) => {
        if (window.confirm(`Are you sure you want to delete leave type "${leaveType.name}"?`)) {
            deleteMutation.mutate(leaveType.id);
        }
    };

    const columns = [
        {
            header: 'Name',
            accessor: 'name',
        },
        {
            header: 'Max Days/Year',
            accessor: 'max_days_per_year',
        },
        {
            header: 'Carry Forward',
            accessor: 'carry_forward',
            cell: (value) => value ? 'Yes' : 'No',
        },
        {
            header: 'Status',
            accessor: 'is_active',
            cell: (value) => (
                <span className={`px-2 py-1 text-xs rounded-full ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {value ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            header: 'Description',
            accessor: 'description',
            cell: (value) => value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'N/A',
        },
        {
            header: 'Actions',
            accessor: 'id',
            cell: (id, row) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => navigate(`/leave-types/${id}/edit`)}
                        className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        disabled={!hasPermission('manage leave types')}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(row)}
                        className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        disabled={!hasPermission('manage leave types')}
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    if (error) {
        return (
            <div className="text-red-500 p-4">
                Error loading leave types: {error.message}
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Leave Types</h1>
                {hasPermission('manage leave types') && (
                    <button
                        onClick={() => navigate('/leave-types/create')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Add Leave Type
                    </button>
                )}
            </div>

            <DataTable
                columns={columns}
                data={data?.data || []}
                loading={isLoading}
                pagination={{
                    currentPage: data?.current_page || 1,
                    lastPage: data?.last_page || 1,
                    perPage: data?.per_page || 15,
                    total: data?.total || 0,
                    onPageChange: setPage,
                    onPerPageChange: setPerPage,
                }}
            />
        </div>
    );
}

