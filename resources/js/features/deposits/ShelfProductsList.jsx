import React from 'react';

export default function ShelfProductsList({ products, isLoading, error }) {
    if (error) {
        return (
            <p className="text-sm text-red-500 mb-2">
                Error loading products: {error.message}
            </p>
        );
    }

    if (isLoading) {
        return <p className="text-sm text-gray-500">Loading products...</p>;
    }

    if (!Array.isArray(products) || products.length === 0) {
        return <p className="text-sm text-gray-500">No products assigned to this shelf</p>;
    }

    return (
        <div className="space-y-2 max-h-60 overflow-y-auto">
            {products.map((product) => {
                const available = product.available ?? 0;
                const totalInventory = product.total_inventory ?? 0;
                const currentQuantity = product.quantity_on_shelf ?? 0;

                return (
                    <div key={product.id} className="p-2 bg-gray-50 rounded border border-gray-200">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {product.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                                SKU: {product.sku}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                                Quantity on Shelf: <span className="font-semibold">{currentQuantity}</span> | 
                                Total Inventory: <span className="font-semibold">{totalInventory}</span> | 
                                Available: <span className="font-semibold text-green-600">{available}</span>
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

