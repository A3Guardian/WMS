import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../utils/api';
import DataTable from '../../components/DataTable';
import { formatCurrency } from '../../utils/formatters';
import { usePermissions } from '../../hooks/usePermissions';
import ProductFormModal from './ProductFormModal';
import ProductViewModal from './ProductViewModal';
import ProductMapModal from './ProductMapModal';

export default function ProductList() {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const { data, loading, error, refetch } = useQuery({
        queryKey: ['products', searchTerm],
        queryFn: async () => {
            const params = searchTerm ? { search: searchTerm } : {};
            const response = await api.get('/products', { params });
            return response.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/products/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Product deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete product', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const handleCreate = () => {
        setSelectedProduct(null);
        setIsCreateModalOpen(true);
    };

    const handleEdit = (product) => {
        setSelectedProduct(product);
        setIsEditModalOpen(true);
    };

    const handleView = (product) => {
        setSelectedProduct(product);
        setIsViewModalOpen(true);
    };

    const handleViewMap = (product) => {
        setSelectedProduct(product);
        setIsMapModalOpen(true);
    };

    const handleDelete = (product) => {
        if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
            deleteMutation.mutate(product.id);
        }
    };

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'sku', label: 'SKU' },
        { 
            key: 'price', 
            label: 'Price', 
            render: (value) => formatCurrency(value) 
        },
        { 
            key: 'deposit', 
            label: 'Deposit', 
            render: (value, row) => row.deposit?.name || '-' 
        },
        { 
            key: 'shelf', 
            label: 'Shelf', 
            render: (value, row) => row.shelf?.name || '-' 
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleView(row)}
                        className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                        title="View"
                    >
                        View
                    </button>
                    {row.deposit_id && (
                        <button
                            onClick={() => handleViewMap(row)}
                            className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                            title="View on Map"
                        >
                            Map
                        </button>
                    )}
                    {hasPermission('edit products') && (
                        <button
                            onClick={() => handleEdit(row)}
                            className="px-2 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                            title="Edit"
                        >
                            Edit
                        </button>
                    )}
                    {hasPermission('delete products') && (
                        <button
                            onClick={() => handleDelete(row)}
                            className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                            title="Delete"
                        >
                            Delete
                        </button>
                    )}
                </div>
            ),
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
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Products</h1>
                {hasPermission('create products') && (
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Product
                    </button>
                )}
            </div>

            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search products by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataTable
                    columns={columns}
                    data={data?.data || []}
                    loading={loading}
                />
                {data && data.total && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                        Showing {data.from || 0} to {data.to || 0} of {data.total} products
                    </div>
                )}
            </div>

            <ProductFormModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setSelectedProduct(null);
                }}
                product={null}
            />

            <ProductFormModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedProduct(null);
                }}
                product={selectedProduct}
            />

            <ProductViewModal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setSelectedProduct(null);
                }}
                product={selectedProduct}
                onViewMap={handleViewMap}
            />

            <ProductMapModal
                isOpen={isMapModalOpen}
                onClose={() => {
                    setIsMapModalOpen(false);
                    setSelectedProduct(null);
                }}
                product={selectedProduct}
            />
        </div>
    );
}
