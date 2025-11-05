import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DataTable from '../../components/DataTable';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../utils/api';
import { formatDate, formatCurrency } from '../../utils/formatters';

export default function InvoiceList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(15);
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const { data, isLoading, error } = useQuery({
        queryKey: ['invoices', page, perPage, typeFilter, statusFilter, supplierFilter, categoryFilter, dateFrom, dateTo],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (typeFilter) params.append('type', typeFilter);
            if (statusFilter) params.append('status', statusFilter);
            if (supplierFilter) params.append('supplier_id', supplierFilter);
            if (categoryFilter) params.append('category', categoryFilter);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            const response = await api.get(`/invoices?${params.toString()}`);
            return response.data;
        },
    });

    const { data: suppliersData } = useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const response = await api.get('/suppliers?per_page=100');
            return response.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (invoiceId) => {
            const response = await api.delete(`/invoices/${invoiceId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            toast.success('Invoice deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete invoice', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const handleDelete = (invoice) => {
        if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}?`)) {
            deleteMutation.mutate(invoice.id);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            draft: 'bg-gray-100 text-gray-800',
            sent: 'bg-blue-100 text-blue-800',
            paid: 'bg-green-100 text-green-800',
            overdue: 'bg-red-100 text-red-800',
            cancelled: 'bg-gray-100 text-gray-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getTypeColor = (type) => {
        return type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    };

    const columns = [
        {
            header: 'Invoice #',
            accessor: 'invoice_number',
        },
        {
            header: 'Supplier',
            accessor: (row) => row.supplier?.name || 'N/A',
        },
        {
            header: 'Type',
            accessor: 'type',
            cell: (value) => (
                <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(value)}`}>
                    {value.toUpperCase()}
                </span>
            ),
        },
        {
            header: 'Status',
            accessor: 'status',
            cell: (value) => (
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(value)}`}>
                    {value.toUpperCase()}
                </span>
            ),
        },
        {
            header: 'Issue Date',
            accessor: 'issue_date',
            cell: (value) => formatDate(value),
        },
        {
            header: 'Due Date',
            accessor: 'due_date',
            cell: (value) => value ? formatDate(value) : 'N/A',
        },
        {
            header: 'Total Amount',
            accessor: 'total_amount',
            cell: (value) => formatCurrency(value),
        },
        {
            header: 'Category',
            accessor: 'category',
            cell: (value) => value || 'N/A',
        },
        {
            header: 'Actions',
            accessor: 'id',
            cell: (id, row) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => navigate(`/invoices/${id}/edit`)}
                        className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        disabled={!hasPermission('edit invoices')}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(row)}
                        className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        disabled={!hasPermission('delete invoices')}
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    const suppliers = suppliersData?.data || [];

    if (error) {
        return (
            <div className="text-red-500 p-4">
                Error loading invoices: {error.message}
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Invoices</h1>
                {hasPermission('create invoices') && (
                    <button
                        onClick={() => navigate('/invoices/create')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Add Invoice
                    </button>
                )}
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="">All Types</option>
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Supplier
                        </label>
                        <select
                            value={supplierFilter}
                            onChange={(e) => {
                                setSupplierFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="">All Suppliers</option>
                            {suppliers.map((sup) => (
                                <option key={sup.id} value={sup.id}>
                                    {sup.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                        </label>
                        <input
                            type="text"
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Category"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
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

