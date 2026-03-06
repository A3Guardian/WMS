import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';
import PageHeader from '../../components/PageHeader';

export default function InventoryPage() {
    const { data, loading, error } = useFetch('inventory', '/inventory');

    const columns = [
        { key: 'product.name', label: 'Product' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'location', label: 'Location' },
        { key: 'reorder_level', label: 'Reorder Level' },
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
            <PageHeader title="Inventory" />
            <DataTable
                columns={columns}
                data={data?.data || []}
                loading={loading}
            />
        </div>
    );
}

