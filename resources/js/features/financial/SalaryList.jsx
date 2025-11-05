import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DataTable from '../../components/DataTable';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import { SALARY_TYPE_LABELS } from '../../utils/constants';

export default function SalaryList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [perPage, setPerPage] = useState(15);
    const [employeeFilter, setEmployeeFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const { data, isLoading, error } = useQuery({
        queryKey: ['salaries', page, perPage, employeeFilter, typeFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (employeeFilter) params.append('employee_id', employeeFilter);
            if (typeFilter) params.append('type', typeFilter);
            const response = await api.get(`/salaries?${params.toString()}`);
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
        mutationFn: async (salaryId) => {
            const response = await api.delete(`/salaries/${salaryId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salaries'] });
            toast.success('Salary deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete salary', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const handleDelete = (salary) => {
        if (window.confirm(`Are you sure you want to delete this salary record?`)) {
            deleteMutation.mutate(salary.id);
        }
    };

    const columns = [
        {
            header: 'Employee',
            accessor: (row) => row.employee?.user?.name || row.employee?.employee_code || 'N/A',
        },
        {
            header: 'Amount',
            accessor: 'amount',
            cell: (value) => `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
        {
            header: 'Type',
            accessor: 'type',
            cell: (value) => (
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {SALARY_TYPE_LABELS[value] || value}
                </span>
            ),
        },
        {
            header: 'Effective Date',
            accessor: 'effective_date',
            cell: (value) => formatDate(value),
        },
        {
            header: 'End Date',
            accessor: 'end_date',
            cell: (value) => value ? formatDate(value) : 'N/A',
        },
        {
            header: 'Actions',
            accessor: 'id',
            cell: (id, row) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => navigate(`/salaries/${id}/edit`)}
                        className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        disabled={!hasPermission('manage salaries')}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(row)}
                        className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        disabled={!hasPermission('manage salaries')}
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
                Error loading salaries: {error.message}
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Salaries</h1>
                {hasPermission('manage salaries') && (
                    <button
                        onClick={() => navigate('/salaries/create')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Add Salary
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
                            Type
                        </label>
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Types</option>
                            {Object.entries(SALARY_TYPE_LABELS).map(([key, label]) => (
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

