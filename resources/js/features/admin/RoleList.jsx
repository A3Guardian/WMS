import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';
import { usePermissions } from '../../hooks/usePermissions';

export default function RoleList() {
    const { hasPermission } = usePermissions();
    const { data, loading, error } = useFetch('roles', '/admin/roles');

    if (!hasPermission('view roles')) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to view roles.
            </div>
        );
    }

    const columns = [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Role Name' },
        { 
            key: 'permissions', 
            label: 'Permissions', 
            render: (permissions) => {
                if (!permissions || permissions.length === 0) return 'No permissions';
                return permissions.map(p => p.name).join(', ');
            }
        },
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
            <h1 className="text-3xl font-bold mb-6">Roles & Permissions</h1>
            <DataTable
                columns={columns}
                data={data || []}
                loading={loading}
            />
        </div>
    );
}

