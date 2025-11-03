import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';

export default function SupplierList() {
    const { data, loading, error } = useFetch('suppliers', '/suppliers');

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'contact_person', label: 'Contact Person' },
    ];

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Suppliers</h1>
            <DataTable
                columns={columns}
                data={data?.data || []}
                loading={loading}
            />
        </div>
    );
}

