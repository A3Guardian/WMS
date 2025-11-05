import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DataTable from '../../components/DataTable';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../utils/api';
import { PAYROLL_STATUS_LABELS, PAYROLL_STATUS_COLORS } from '../../utils/constants';

export default function PayrollRecordList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(15);
    const [employeeFilter, setEmployeeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');

    const { data, isLoading, error } = useQuery({
        queryKey: ['payroll-records', page, perPage, employeeFilter, statusFilter, monthFilter, yearFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (employeeFilter) params.append('employee_id', employeeFilter);
            if (statusFilter) params.append('status', statusFilter);
            if (monthFilter) params.append('month', monthFilter);
            if (yearFilter) params.append('year', yearFilter);
            const response = await api.get(`/payroll-records?${params.toString()}`);
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
        mutationFn: async (payrollRecordId) => {
            const response = await api.delete(`/payroll-records/${payrollRecordId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
            toast.success('Payroll record deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete payroll record', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const handleDelete = (payrollRecord) => {
        if (window.confirm(`Are you sure you want to delete this payroll record?`)) {
            deleteMutation.mutate(payrollRecord.id);
        }
    };

    const getStatusBadge = (status) => {
        const color = PAYROLL_STATUS_COLORS[status] || 'gray';
        const label = PAYROLL_STATUS_LABELS[status] || status;
        
        const colorClasses = {
            blue: 'bg-blue-100 text-blue-800',
            green: 'bg-green-100 text-green-800',
            gray: 'bg-gray-100 text-gray-800',
            red: 'bg-red-100 text-red-800',
        };

        return (
            <span className={`px-2 py-1 text-xs rounded-full ${colorClasses[color] || colorClasses.gray}`}>
                {label}
            </span>
        );
    };

    const getMonthName = (month) => {
        const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month] || month;
    };

    const columns = [
        {
            header: 'Employee',
            accessor: (row) => row.employee?.user?.name || row.employee?.employee_code || 'N/A',
        },
        {
            header: 'Period',
            accessor: (row) => `${getMonthName(row.month)} ${row.year}`,
        },
        {
            header: 'Base Salary',
            accessor: 'base_salary',
            cell: (value) => `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
        {
            header: 'Bonuses',
            accessor: 'bonuses',
            cell: (value) => `$${parseFloat(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
        {
            header: 'Deductions',
            accessor: 'deductions',
            cell: (value) => `$${parseFloat(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
        {
            header: 'Net Salary',
            accessor: 'net_salary',
            cell: (value) => (
                <span className="font-semibold">
                    ${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            ),
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
                        onClick={() => navigate(`/payroll-records/${id}/edit`)}
                        className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        disabled={!hasPermission('manage payroll')}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(row)}
                        className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        disabled={!hasPermission('manage payroll')}
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    const employees = employeesData?.data || [];
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

    if (error) {
        return (
            <div className="text-red-500 p-4">
                Error loading payroll records: {error.message}
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Payroll Records</h1>
                {hasPermission('manage payroll') && (
                    <button
                        onClick={() => navigate('/payroll-records/create')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Create Payroll
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
                            Month
                        </label>
                        <select
                            value={monthFilter}
                            onChange={(e) => {
                                setMonthFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Months</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                                <option key={month} value={month}>
                                    {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Year
                        </label>
                        <select
                            value={yearFilter}
                            onChange={(e) => {
                                setYearFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Years</option>
                            {years.map((year) => (
                                <option key={year} value={year}>
                                    {year}
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
                            {Object.entries(PAYROLL_STATUS_LABELS).map(([key, label]) => (
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

