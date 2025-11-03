import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';

export default function InventoryPage() {
    const { data, loading, error } = useFetch('inventory', '/inventory');

    const columns = [
        { key: 'product.name', label: 'Product' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'location', label: 'Location' },
        { key: 'reorder_level', label: 'Reorder Level' },
    ];

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Inventory</h1>
            <DataTable
                columns={columns}
                data={data?.data || []}
                loading={loading}
            />
        </div>
    );
}

