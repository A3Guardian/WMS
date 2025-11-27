import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../utils/api';

export default function DepositList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(15);
    const [statusFilter, setStatusFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');

    const { data, isLoading, error } = useQuery({
        queryKey: ['deposits', page, perPage, statusFilter, locationFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (statusFilter) params.append('status', statusFilter);
            if (locationFilter) params.append('location', locationFilter);
            const response = await api.get(`/deposits?${params.toString()}`);
            return response.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (depositId) => {
            const response = await api.delete(`/deposits/${depositId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deposits'] });
            toast.success('Deposit deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete deposit', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const handleDelete = (deposit) => {
        if (window.confirm(`Are you sure you want to delete deposit "${deposit.name}"?`)) {
            deleteMutation.mutate(deposit.id);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-gray-100 text-gray-800',
            maintenance: 'bg-yellow-100 text-yellow-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const formatDimensions = (width, height, depth) => {
        if (width && height && depth) {
            return `${width}m × ${height}m × ${depth}m`;
        }
        return 'N/A';
    };

    const columns = [
        {
            header: 'Name',
            accessor: 'name',
        },
        {
            header: 'Code',
            accessor: 'code',
            cell: (value) => value || 'N/A',
        },
        {
            header: 'Location',
            accessor: 'location',
            cell: (value) => value || 'N/A',
        },
        {
            header: 'Dimensions',
            accessor: (row) => formatDimensions(row.width, row.height, row.depth),
        },
        {
            header: 'Capacity',
            accessor: 'capacity',
            cell: (value) => value ? `${value} m³` : 'N/A',
        },
        {
            header: 'Status',
            accessor: 'status',
            cell: (value) => (
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(value)}`}>
                    {value ? value.toUpperCase() : 'N/A'}
                </span>
            ),
        },
        {
            header: 'Actions',
            accessor: 'id',
            cell: (id, row) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => navigate(`/deposits/${id}/edit`)}
                        className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        disabled={!hasPermission('edit deposits')}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(row)}
                        className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        disabled={!hasPermission('delete deposits')}
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
                Error loading deposits: {error.message}
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Storage Deposits</h1>
                {hasPermission('create deposits') && (
                    <button
                        onClick={() => navigate('/deposits/create')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Add Deposit
                    </button>
                )}
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Location
                        </label>
                        <input
                            type="text"
                            value={locationFilter}
                            onChange={(e) => {
                                setLocationFilter(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Filter by location"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={data?.data || []}
                loading={isLoading}
            />
            {data && data.last_page > 1 && (
                <Pagination
                    currentPage={data.current_page || 1}
                    lastPage={data.last_page || 1}
                    onPageChange={setPage}
                />
            )}
        </div>
    );
}
