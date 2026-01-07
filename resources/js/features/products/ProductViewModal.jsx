import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { formatCurrency } from '../../utils/formatters';

export default function ProductViewModal({ 
    isOpen, 
    onClose, 
    product,
    onViewMap
}) {
    if (!product) return null;

    const inventories = product.inventories || [];
    const totalQuantity = inventories.reduce((sum, inv) => sum + (inv.quantity || 0), 0);

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50">
                    <Dialog.Title className="text-2xl font-bold mb-4">Product Details</Dialog.Title>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <p className="mt-1 text-gray-900">{product.name}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">SKU</label>
                            <p className="mt-1 text-gray-900">{product.sku}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <p className="mt-1 text-gray-900">{product.description || '-'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Price</label>
                            <p className="mt-1 text-gray-900">{formatCurrency(product.price)}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Supplier</label>
                            <p className="mt-1 text-gray-900">{product.supplier?.name || '-'}</p>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Stock Locations
                            </label>
                            {inventories.length === 0 ? (
                                <p className="text-gray-500 text-sm">No inventory records found</p>
                            ) : (
                                <div className="space-y-3">
                                    {inventories.map((inv) => (
                                        <div key={inv.id} className="bg-gray-50 p-3 rounded-md border">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {inv.deposit?.name || 'Unknown Deposit'}
                                                        {inv.shelf && (
                                                            <span className="text-gray-600">
                                                                {' - '}{inv.shelf.name}
                                                            </span>
                                                        )}
                                                    </p>
                                                    {inv.location && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {inv.location}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-gray-900">
                                                        {inv.quantity || 0} units
                                                    </p>
                                                    {inv.reorder_level > 0 && (
                                                        <p className="text-xs text-gray-500">
                                                            Reorder: {inv.reorder_level}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {totalQuantity > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                    <p className="text-sm font-semibold text-gray-900">
                                        Total Stock: <span className="text-blue-600">{totalQuantity} units</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {inventories.length > 0 && inventories[0]?.deposit_id && (
                            <div className="mt-4">
                                <button
                                    onClick={() => {
                                        onClose();
                                        onViewMap(product);
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                    View on Deposit Map
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end mt-6">
                        <Dialog.Close asChild>
                            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                                Close
                            </button>
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}