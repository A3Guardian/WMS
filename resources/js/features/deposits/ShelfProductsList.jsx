import React from "react";
import { useTranslation } from "react-i18next";

export default function ShelfProductsList({ products, isLoading, error }) {
    const { t } = useTranslation();

    if (error) {
        return (
            <p className="text-sm text-red-500 mb-2">
                {t("deposits.shelfProducts.errorLoading")}: {error.message}
            </p>
        );
    }

    if (isLoading) {
        return (
            <p className="text-sm text-gray-500">
                {t("deposits.shelfProducts.loading")}
            </p>
        );
    }

    if (!Array.isArray(products) || products.length === 0) {
        return (
            <p className="text-sm text-gray-500">
                {t("deposits.shelfProducts.empty")}
            </p>
        );
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
                                {t("deposits.shelfProducts.sku")}: {product.sku}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                                {t("deposits.shelfProducts.quantityOnShelf")}:{" "}
                                <span className="font-semibold">
                                    {currentQuantity}
                                </span>{" "}
                                | {t("deposits.shelfProducts.totalInventory")}:{" "}
                                <span className="font-semibold">
                                    {totalInventory}
                                </span>{" "}
                                | {t("deposits.shelfProducts.available")}:{" "}
                                <span className="font-semibold text-green-600">
                                    {available}
                                </span>
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

