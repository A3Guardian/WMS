import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DataTable from '../../components/DataTable';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import { LEAVE_STATUS_LABELS, LEAVE_STATUS_COLORS, LEAVE_STATUS } from '../../utils/constants';

export default function LeaveList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(15);
    const [employeeFilter, setEmployeeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const { data, isLoading, error } = useQuery({
        queryKey: ['leaves', page, perPage, employeeFilter, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (employeeFilter) params.append('employee_id', employeeFilter);
            if (statusFilter) params.append('status', statusFilter);
            const response = await api.get(`/leaves?${params.toString()}`);
            return response.data;
        },
    });

    const { data: employeesData } = useQuery({
        queryKey: ['employees'],
        queryFn: async () => {
            const response = await api.get('/employees?per_page=100');
            return response.data;
        },
    });

    const approveMutation = useMutation({
        mutationFn: async (leaveId) => {
            const response = await api.put(`/leaves/${leaveId}`, { status: LEAVE_STATUS.APPROVED });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            toast.success('Leave approved successfully');
        },
        onError: (error) => {
            toast.error('Failed to approve leave', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ leaveId, reason }) => {
            const response = await api.put(`/leaves/${leaveId}`, { 
                status: LEAVE_STATUS.REJECTED,
                rejection_reason: reason 
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            toast.success('Leave rejected successfully');
        },
        onError: (error) => {
            toast.error('Failed to reject leave', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (leaveId) => {
            const response = await api.delete(`/leaves/${leaveId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            toast.success('Leave deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete leave', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const handleApprove = (leave) => {
        if (window.confirm(`Approve leave request for ${leave.employee?.user?.name || leave.employee?.employee_code}?`)) {
            approveMutation.mutate(leave.id);
        }
    };

    const handleReject = (leave) => {
        const reason = window.prompt('Enter rejection reason:');
        if (reason !== null && reason.trim()) {
            rejectMutation.mutate({ leaveId: leave.id, reason: reason.trim() });
        }
    };

    const handleDelete = (leave) => {
        if (window.confirm(`Are you sure you want to delete this leave request?`)) {
            deleteMutation.mutate(leave.id);
        }
    };

    const getStatusBadge = (status) => {
        const color = LEAVE_STATUS_COLORS[status] || 'gray';
        const label = LEAVE_STATUS_LABELS[status] || status;
        
        const colorClasses = {
            yellow: 'bg-yellow-100 text-yellow-800',
            green: 'bg-green-100 text-green-800',
            red: 'bg-red-100 text-red-800',
            gray: 'bg-gray-100 text-gray-800',
        };

        return (
            <span className={`px-2 py-1 text-xs rounded-full ${colorClasses[color]}`}>
                {label}
            </span>
        );
    };

    const columns = [
        {
            header: 'Employee',
            accessor: (row) => row.employee?.user?.name || row.employee?.employee_code || 'N/A',
        },
        {
            header: 'Leave Type',
            accessor: (row) => row.leave_type?.name || 'N/A',
        },
        {
            header: 'Start Date',
            accessor: 'start_date',
            cell: (value) => formatDate(value),
        },
        {
            header: 'End Date',
            accessor: 'end_date',
            cell: (value) => formatDate(value),
        },
        {
            header: 'Days',
            accessor: 'days',
        },
        {
            header: 'Status',
            accessor: 'status',
            cell: (value) => getStatusBadge(value),
        },
        {
            header: 'Actions',
            accessor: 'id',
            cell: (id, row) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => navigate(`/leaves/${id}/edit`)}
                        className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        disabled={!hasPermission('edit leaves')}
                    >
                        View
                    </button>
                    {row.status === LEAVE_STATUS.PENDING && hasPermission('edit leaves') && (
                        <>
                            <button
                                onClick={() => handleApprove(row)}
                                className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => handleReject(row)}
                                className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Reject
                            </button>
                        </>
                    )}
                    {hasPermission('delete leaves') && (
                        <button
                            onClick={() => handleDelete(row)}
                            className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            Delete
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const employees = employeesData?.data || [];

    if (error) {
        return (
            <div className="text-red-500 p-4">
                Error loading leaves: {error.message}
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Leaves</h1>
                {hasPermission('create leaves') && (
                    <button
                        onClick={() => navigate('/leaves/create')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Request Leave
                    </button>
                )}
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Employee
                        </label>
                        <select
                            value={employeeFilter}
                            onChange={(e) => {
                                setEmployeeFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Employees</option>
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.employee_code} - {emp.user?.name || 'N/A'}
                                </option>
                            ))}
                        </select>
                    </div>
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Statuses</option>
                            {Object.entries(LEAVE_STATUS_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
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

