import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as Dialog from '@radix-ui/react-dialog';
import api from '../../utils/api';

export default function ProductFormModal({ 
    isOpen, 
    onClose, 
    product = null 
}) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        description: '',
        price: '',
        supplier_id: '',
        quantity: '',
        deposit_id: '',
        shelf_id: '',
        reorder_level: '',
    });

    const { data: depositsData } = useQuery({
        queryKey: ['deposits'],
        queryFn: async () => {
            const response = await api.get('/deposits');
            return response.data?.data || response.data || [];
        },
    });

    const { data: suppliersData } = useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const response = await api.get('/suppliers?per_page=100');
            return response.data?.data || response.data || [];
        },
    });

    const { data: shelvesData } = useQuery({
        queryKey: ['shelves', formData.deposit_id],
        queryFn: async () => {
            if (!formData.deposit_id) return [];
            const response = await api.get(`/deposits/${formData.deposit_id}/shelves`);
            return response.data?.data || response.data || [];
        },
        enabled: !!formData.deposit_id,
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post('/products', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            toast.success('Product created successfully');
            handleClose();
        },
        onError: (error) => {
            toast.error('Failed to create product', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await api.put(`/products/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Product updated successfully');
            handleClose();
        },
        onError: (error) => {
            toast.error('Failed to update product', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
    });

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                sku: product.sku || '',
                description: product.description || '',
                price: product.price || '',
                supplier_id: product.supplier_id || '',
                quantity: '',
                deposit_id: '',
                shelf_id: '',
                reorder_level: '',
            });
        } else {
            setFormData({
                name: '',
                sku: '',
                description: '',
                price: '',
                supplier_id: '',
                quantity: '',
                deposit_id: '',
                shelf_id: '',
                reorder_level: '',
            });
        }
    }, [product, isOpen]);

    const handleClose = () => {
        setFormData({
            name: '',
            sku: '',
            description: '',
            price: '',
            supplier_id: '',
            quantity: '',
            deposit_id: '',
            shelf_id: '',
            reorder_level: '',
        });
        onClose();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (product) {
            const submitData = {
                name: formData.name,
                sku: formData.sku,
                description: formData.description,
                price: parseFloat(formData.price) || 0,
                supplier_id: formData.supplier_id || null,
            };
            updateMutation.mutate({ id: product.id, data: submitData });
        } else {
            const submitData = {
                name: formData.name,
                sku: formData.sku,
                description: formData.description,
                price: parseFloat(formData.price) || 0,
                supplier_id: formData.supplier_id || null,
                ...(formData.quantity && {
                    quantity: parseInt(formData.quantity) || 0,
                    deposit_id: formData.deposit_id || null,
                    shelf_id: formData.shelf_id || null,
                    reorder_level: parseInt(formData.reorder_level) || 0,
                }),
            };
            createMutation.mutate(submitData);
        }
    };

    const handleDepositChange = (depositId) => {
        setFormData({
            ...formData,
            deposit_id: depositId,
            shelf_id: '', 
        });
    };

    const isEditMode = !!product;

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => {
            if (!open) {
                handleClose();
            }
        }}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50">
                    <Dialog.Title className="text-2xl font-bold mb-4">
                        {product ? 'Edit Product' : 'Create Product'}
                    </Dialog.Title>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                SKU *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Price *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Supplier
                            </label>
                            <select
                                value={formData.supplier_id}
                                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Supplier</option>
                                {(suppliersData || []).map((supplier) => (
                                    <option key={supplier.id} value={supplier.id}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {!isEditMode && (
                            <>
                                <div className="border-t pt-4 mt-4">
                                    <h3 className="text-lg font-semibold mb-3 text-gray-800">
                                        Initial Inventory (Optional)
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Add initial stock location and quantity when creating the product.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Initial Quantity
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Deposit
                                    </label>
                                    <select
                                        value={formData.deposit_id}
                                        onChange={(e) => handleDepositChange(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select Deposit</option>
                                        {(depositsData || []).map((deposit) => (
                                            <option key={deposit.id} value={deposit.id}>
                                                {deposit.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {formData.deposit_id && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Shelf
                                        </label>
                                        <select
                                            value={formData.shelf_id}
                                            onChange={(e) => setFormData({ ...formData, shelf_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Shelf</option>
                                            {(shelvesData || []).map((shelf) => (
                                                <option key={shelf.id} value={shelf.id}>
                                                    {shelf.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reorder Level
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.reorder_level}
                                        onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                        placeholder="0"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Minimum stock level before reordering
                                    </p>
                                </div>
                            </>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                            </Dialog.Close>
                            <button
                                type="submit"
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}