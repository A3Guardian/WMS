import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ORDER_STATUS_LABELS } from '../../utils/constants';

export default function OrderList() {
    const { data, loading, error } = useFetch('orders', '/orders');

    const columns = [
        { key: 'order_number', label: 'Order Number' },
        { key: 'supplier.name', label: 'Supplier' },
        { key: 'status', label: 'Status', render: (value) => ORDER_STATUS_LABELS[value] || value },
        { key: 'total_amount', label: 'Total', render: (value) => formatCurrency(value) },
        { key: 'created_at', label: 'Date', render: (value) => formatDate(value) },
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
            <h1 className="text-3xl font-bold mb-6">Orders</h1>
            <DataTable
                columns={columns}
                data={data?.data || []}
                loading={loading}
            />
        </div>
    );
}

