import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';
import { formatCurrency } from '../../utils/formatters';

export default function ProductList() {
    const { data, loading, error } = useFetch('products', '/products');

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'sku', label: 'SKU' },
        { key: 'price', label: 'Price', render: (value) => formatCurrency(value) },
        { key: 'description', label: 'Description' },
    ];

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Products</h1>
            <DataTable
                columns={columns}
                data={data?.data || []}
                loading={loading}
            />
        </div>
    );
}

