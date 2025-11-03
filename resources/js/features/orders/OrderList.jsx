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
        return <div className="text-red-500">Error: {error}</div>;
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

