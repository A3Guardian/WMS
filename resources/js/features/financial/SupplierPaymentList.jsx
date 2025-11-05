import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DataTable from '../../components/DataTable';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../utils/api';
import { formatDate, formatCurrency } from '../../utils/formatters';

export default function SupplierPaymentList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(15);
    const [typeFilter, setTypeFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const { data, isLoading, error } = useQuery({
        queryKey: ['payments', page, perPage, typeFilter, categoryFilter, supplierFilter, dateFrom, dateTo],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (typeFilter) params.append('type', typeFilter);
            if (categoryFilter) params.append('category', categoryFilter);
            if (supplierFilter) params.append('supplier_id', supplierFilter);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            const response = await api.get(`/payments?${params.toString()}`);
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
        mutationFn: async (paymentId) => {
            const response = await api.delete(`/payments/${paymentId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            toast.success('Payment deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete payment', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const handleDelete = (payment) => {
        if (window.confirm(`Are you sure you want to delete payment ${payment.transaction_number}?`)) {
            deleteMutation.mutate(payment.id);
        }
    };

    const getTypeColor = (type) => {
        const colors = {
            payment: 'bg-blue-100 text-blue-800',
            receipt: 'bg-green-100 text-green-800',
            refund: 'bg-yellow-100 text-yellow-800',
            adjustment: 'bg-gray-100 text-gray-800',
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    };

    const getCategoryColor = (category) => {
        const colors = {
            supplier_payment: 'bg-red-100 text-red-800',
            customer_payment: 'bg-green-100 text-green-800',
            salary: 'bg-purple-100 text-purple-800',
            expense: 'bg-orange-100 text-orange-800',
            income: 'bg-green-100 text-green-800',
            other: 'bg-gray-100 text-gray-800',
        };
        return colors[category] || 'bg-gray-100 text-gray-800';
    };

    const columns = [
        {
            header: 'Transaction #',
            accessor: 'transaction_number',
        },
        {
            header: 'Supplier',
            accessor: (row) => row.supplier?.name || 'N/A',
        },
        {
            header: 'Invoice',
            accessor: (row) => row.invoice?.invoice_number || 'N/A',
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
            header: 'Category',
            accessor: 'category',
            cell: (value) => (
                <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(value)}`}>
                    {value.replace('_', ' ').toUpperCase()}
                </span>
            ),
        },
        {
            header: 'Amount',
            accessor: 'amount',
            cell: (value) => formatCurrency(value),
        },
        {
            header: 'Payment Method',
            accessor: 'payment_method',
            cell: (value) => value.replace('_', ' ').toUpperCase(),
        },
        {
            header: 'Transaction Date',
            accessor: 'transaction_date',
            cell: (value) => formatDate(value),
        },
        {
            header: 'Reference #',
            accessor: 'reference_number',
            cell: (value) => value || 'N/A',
        },
        {
            header: 'Actions',
            accessor: 'id',
            cell: (id, row) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => navigate(`/payments/${id}/edit`)}
                        className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        disabled={!hasPermission('edit payments')}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(row)}
                        className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        disabled={!hasPermission('delete payments')}
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
                Error loading payments: {error.message}
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Supplier Payments</h1>
                {hasPermission('create payments') && (
                    <button
                        onClick={() => navigate('/payments/create')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Add Payment
                    </button>
                )}
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                            <option value="payment">Payment</option>
                            <option value="receipt">Receipt</option>
                            <option value="refund">Refund</option>
                            <option value="adjustment">Adjustment</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                        </label>
                        <select
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="">All Categories</option>
                            <option value="supplier_payment">Supplier Payment</option>
                            <option value="customer_payment">Customer Payment</option>
                            <option value="salary">Salary</option>
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                            <option value="other">Other</option>
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

