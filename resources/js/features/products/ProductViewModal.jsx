import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { formatCurrency } from "../../utils/formatters";

export default function ProductViewModal({
    isOpen,
    onClose,
    product,
    onViewMap,
}) {
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedDepositId, setSelectedDepositId] = useState(null);
    if (!product) return null;

    const images = Array.isArray(product.images) ? product.images : [];
    const mainImage = images.find((img) => img.display_type === 1) || images[0];
    const inventories = product.inventories || [];
    const totalQuantity = inventories.reduce(
        (sum, inv) => sum + (inv.quantity || 0),
        0,
    );

    const byDeposit = inventories.reduce((acc, inv) => {
        const key = inv.deposit_id ?? inv.deposit?.id ?? "none";
        if (!acc[key]) acc[key] = { deposit: inv.deposit, items: [] };
        acc[key].items.push(inv);
        return acc;
    }, {});
    const depositKeys = Object.keys(byDeposit);
    const currentDepositId = selectedDepositId ?? depositKeys[0] ?? null;
    const currentGroup = currentDepositId ? byDeposit[currentDepositId] : null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50">
                    <Dialog.Title className="text-2xl font-bold mb-4">
                        Product Details
                    </Dialog.Title>
                    <div className="space-y-4">
                        {images.length > 0 && (
                            <div className="border-b pb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Images
                                </label>
                                <div className="flex gap-3 flex-wrap">
                                    <div className="flex-shrink-0">
                                        <img
                                            src={
                                                (selectedImage || mainImage)
                                                    ?.url
                                            }
                                            alt={product.name}
                                            className="w-48 h-48 object-cover rounded-lg border border-gray-200"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-2 items-start">
                                        {images.map((img) => (
                                            <button
                                                key={img.url}
                                                type="button"
                                                onClick={() =>
                                                    setSelectedImage(img)
                                                }
                                                className={`w-14 h-14 rounded border overflow-hidden flex-shrink-0 ${
                                                    (selectedImage?.url ||
                                                        mainImage?.url) ===
                                                    img.url
                                                        ? "border-blue-500 ring-2 ring-blue-300"
                                                        : "border-gray-200"
                                                }`}
                                            >
                                                <img
                                                    src={img.url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Name
                            </label>
                            <p className="mt-1 text-gray-900">{product.name}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                SKU
                            </label>
                            <p className="mt-1 text-gray-900">{product.sku}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Description
                            </label>
                            <p className="mt-1 text-gray-900">
                                {product.description || "-"}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Price
                            </label>
                            <p className="mt-1 text-gray-900">
                                {formatCurrency(product.price)}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Supplier
                            </label>
                            <p className="mt-1 text-gray-900">
                                {product.supplier?.name || "-"}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Product type
                            </label>
                            <p className="mt-1 text-gray-900">
                                {product.origin === "manufactured"
                                    ? "Fabricat intern"
                                    : product.origin === "both"
                                    ? "Atât cumpărat, cât și fabricat"
                                    : "Cumpărat de la furnizor"}
                            </p>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Stock Locations
                            </label>
                            {inventories.length === 0 ? (
                                <p className="text-gray-500 text-sm">
                                    No inventory records found
                                </p>
                            ) : (
                                <>
                                    {depositKeys.length > 1 && (
                                        <div className="flex flex-wrap gap-1 mb-3 border-b border-gray-200 pb-2">
                                            {depositKeys.map((dId) => {
                                                const group = byDeposit[dId];
                                                const name =
                                                    group?.deposit?.name ||
                                                    "Unknown";
                                                const isSelected =
                                                    dId === currentDepositId;
                                                return (
                                                    <button
                                                        key={dId}
                                                        type="button"
                                                        onClick={() =>
                                                            setSelectedDepositId(
                                                                dId,
                                                            )
                                                        }
                                                        className={`px-3 py-1.5 rounded-t text-sm font-medium transition-colors ${
                                                            isSelected
                                                                ? "bg-blue-100 text-blue-800 border border-b-0 border-gray-200 -mb-px"
                                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                        }`}
                                                    >
                                                        {name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {currentGroup && (
                                        <div className="space-y-3">
                                            {currentGroup.items.map((inv) => (
                                                <div
                                                    key={inv.id}
                                                    className="bg-gray-50 p-3 rounded-md border"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-medium text-gray-900">
                                                                {inv.shelf
                                                                    ? inv.shelf
                                                                          .name
                                                                    : "No shelf"}
                                                            </p>
                                                            {inv.deposit && (
                                                                <p className="text-xs text-gray-500 mt-0.5">
                                                                    {
                                                                        inv
                                                                            .deposit
                                                                            .name
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-semibold text-gray-900">
                                                                {inv.quantity ||
                                                                    0}{" "}
                                                                units
                                                            </p>
                                                            {inv.reorder_level >
                                                                0 && (
                                                                <p className="text-xs text-gray-500">
                                                                    Reorder:{" "}
                                                                    {
                                                                        inv.reorder_level
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                            {totalQuantity > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                    <p className="text-sm font-semibold text-gray-900">
                                        Total Stock:{" "}
                                        <span className="text-blue-600">
                                            {totalQuantity} units
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {inventories.length > 0 &&
                            currentGroup?.items?.[0]?.deposit_id && (
                                <div className="mt-4">
                                    <button
                                        onClick={() => {
                                            onClose();
                                            onViewMap({
                                                ...product,
                                                inventories: currentGroup.items,
                                            });
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
