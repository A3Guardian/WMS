import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DataTable from '../../components/DataTable';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../utils/api';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { ATTENDANCE_STATUS_LABELS } from '../../utils/constants';

export default function AttendanceList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(15);
    const [employeeFilter, setEmployeeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const { data, isLoading, error } = useQuery({
        queryKey: ['attendance', page, perPage, employeeFilter, statusFilter, dateFrom, dateTo],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (employeeFilter) params.append('employee_id', employeeFilter);
            if (statusFilter) params.append('status', statusFilter);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            const response = await api.get(`/attendance?${params.toString()}`);
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

    const deleteMutation = useMutation({
        mutationFn: async (attendanceId) => {
            const response = await api.delete(`/attendance/${attendanceId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            toast.success('Attendance record deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete attendance record', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const handleDelete = (attendance) => {
        if (window.confirm(`Are you sure you want to delete this attendance record?`)) {
            deleteMutation.mutate(attendance.id);
        }
    };

    const columns = [
        {
            header: 'Employee',
            accessor: (row) => row.employee?.user?.name || row.employee?.employee_code || 'N/A',
        },
        {
            header: 'Date',
            accessor: 'date',
            cell: (value) => formatDate(value),
        },
        {
            header: 'Clock In',
            accessor: 'clock_in',
            cell: (value) => value ? formatDateTime(value) : 'N/A',
        },
        {
            header: 'Clock Out',
            accessor: 'clock_out',
            cell: (value) => value ? formatDateTime(value) : 'N/A',
        },
        {
            header: 'Total Hours',
            accessor: 'total_hours',
            cell: (value) => value ? `${value}h` : 'N/A',
        },
        {
            header: 'Overtime',
            accessor: 'overtime_hours',
            cell: (value) => value > 0 ? `${value}h` : 'N/A',
        },
        {
            header: 'Status',
            accessor: 'status',
            cell: (value) => {
                const colors = {
                    present: 'bg-green-100 text-green-800',
                    absent: 'bg-red-100 text-red-800',
                    late: 'bg-yellow-100 text-yellow-800',
                    half_day: 'bg-blue-100 text-blue-800',
                    on_leave: 'bg-purple-100 text-purple-800',
                };
                return (
                    <span className={`px-2 py-1 text-xs rounded-full ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
                        {ATTENDANCE_STATUS_LABELS[value] || value}
                    </span>
                );
            },
        },
        {
            header: 'Actions',
            accessor: 'id',
            cell: (id, row) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => navigate(`/attendance/${id}/edit`)}
                        className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        disabled={!hasPermission('manage attendance')}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(row)}
                        className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        disabled={!hasPermission('manage attendance')}
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    const employees = employeesData?.data || [];

    if (error) {
        return (
            <div className="text-red-500 p-4">
                Error loading attendance: {error.message}
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Attendance</h1>
                {hasPermission('manage attendance') && (
                    <button
                        onClick={() => navigate('/attendance/create')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Add Attendance
                    </button>
                )}
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                            {Object.entries(ATTENDANCE_STATUS_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date From
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                                setDateFrom(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date To
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                                setDateTo(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
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

