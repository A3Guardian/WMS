import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DataTable from '../../components/DataTable';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';

export default function EmployeeList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [perPage, setPerPage] = useState(15);
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, isLoading, error } = useQuery({
        queryKey: ['employees', page, debouncedSearch, perPage, departmentFilter, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (departmentFilter) params.append('department_id', departmentFilter);
            if (statusFilter) params.append('status', statusFilter);
            const response = await api.get(`/employees?${params.toString()}`);
            return response.data;
        },
    });

    const { data: departmentsData } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const response = await api.get('/departments?per_page=100');
            return response.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (employeeId) => {
            const response = await api.delete(`/employees/${employeeId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Employee deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete employee', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const handleDelete = (employee) => {
        if (window.confirm(`Are you sure you want to delete employee ${employee.employee_code}?`)) {
            deleteMutation.mutate(employee.id);
        }
    };

    const columns = [
        {
            header: 'Employee Code',
            accessor: 'employee_code',
        },
        {
            header: 'Name',
            accessor: (row) => row.user?.name || 'N/A',
        },
        {
            header: 'Email',
            accessor: (row) => row.user?.email || 'N/A',
        },
        {
            header: 'Department',
            accessor: (row) => row.department?.name || 'N/A',
        },
        {
            header: 'Position',
            accessor: 'position',
        },
        {
            header: 'Employment Type',
            accessor: 'employment_type',
            cell: (value) => (
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {value}
                </span>
            ),
        },
        {
            header: 'Status',
            accessor: 'status',
            cell: (value) => {
                const colors = {
                    active: 'bg-green-100 text-green-800',
                    inactive: 'bg-gray-100 text-gray-800',
                    terminated: 'bg-red-100 text-red-800',
                    on_leave: 'bg-yellow-100 text-yellow-800',
                };
                return (
                    <span className={`px-2 py-1 text-xs rounded-full ${colors[value] || colors.inactive}`}>
                        {value}
                    </span>
                );
            },
        },
        {
            header: 'Hire Date',
            accessor: 'hire_date',
            cell: (value) => formatDate(value),
        },
        {
            header: 'Salary',
            accessor: 'salary',
            cell: (value) => value ? `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
        },
        {
            header: 'Actions',
            accessor: 'id',
            cell: (id, row) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => navigate(`/employees/${id}/edit`)}
                        className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        disabled={!hasPermission('edit employees')}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(row)}
                        className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        disabled={!hasPermission('delete employees')}
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    const departments = departmentsData?.data || [];

    if (error) {
        return (
            <div className="text-red-500 p-4">
                Error loading employees: {error.message}
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Employees</h1>
                {hasPermission('create employees') && (
                    <button
                        onClick={() => navigate('/employees/create')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Add Employee
                    </button>
                )}
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Search
                        </label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, email, code, position..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Department
                        </label>
                        <select
                            value={departmentFilter}
                            onChange={(e) => {
                                setDepartmentFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Departments</option>
                            {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                    {dept.name}
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
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="terminated">Terminated</option>
                            <option value="on_leave">On Leave</option>
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

