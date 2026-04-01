import React, { useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import * as Dialog from "@radix-ui/react-dialog";
import DataTable from "../../components/DataTable";
import PageHeader from "../../components/PageHeader";
import InventoryActivityModal from "./InventoryActivityModal";
import InventoryFormModal from "./InventoryFormModal";
import ProductMapModal from "../products/ProductMapModal";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import { History, Plus, Pencil, Trash2, MapPin, Barcode } from "lucide-react";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function InventoryPage() {
    const queryClient = useQueryClient();
    const { data, loading, error } = useFetch("inventory", "/inventory");
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const [activityModalOpen, setActivityModalOpen] = useState(false);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [mapModalOpen, setMapModalOpen] = useState(false);
    const [selectedInventory, setSelectedInventory] = useState(null);
    const [inventoryForMap, setInventoryForMap] = useState(null);
    const [perPage, setPerPage] = useState(20);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [inventoryToDelete, setInventoryToDelete] = useState(null);
    const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
    const [barcodeProduct, setBarcodeProduct] = useState(null);

    const productIdForMap =
        inventoryForMap?.product_id ?? inventoryForMap?.product?.id ?? null;

    const { data: productForMap } = useQuery({
        queryKey: ["product-for-map", productIdForMap],
        queryFn: async () => {
            if (!productIdForMap) return null;
            const res = await api.get(`/products/${productIdForMap}`);
            return res.data;
        },
        enabled: mapModalOpen && !!productIdForMap,
    });

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/inventory/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventory"] });
            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast.success(t("inventory.toast.deleted"));
            setSelectedInventory(null);
        },
        onError: (err) => {
            toast.error(
                err.response?.data?.message || t("inventory.toast.deleteFailed"),
            );
        },
    });

    const handleDeleteClick = (row) => {
        setInventoryToDelete(row);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!inventoryToDelete) return;
        deleteMutation.mutate(inventoryToDelete.id, {
            onSettled: () => setInventoryToDelete(null),
        });
    };
    const downloadBarcode = (svgContent, fileName) => {
        if (!svgContent) return;
        const blob = new Blob([svgContent], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const columns = [
        {
            key: "product",
            label: t("inventory.table.product"),
            render: (_, row) => (
                <div>
                    <div className="font-medium text-gray-900">
                        {row.product?.name ?? t("common.dash")}
                    </div>
                    {row.product?.sku && (
                        <div className="text-xs text-gray-500 mt-0.5">
                            SKU: {row.product.sku}
                        </div>
                    )}
                </div>
            ),
        },
        { key: "quantity", label: t("inventory.table.stock") },
        {
            key: "location",
            label: t("inventory.table.location"),
            render: (_, row) => {
                const parts = [row.deposit?.name, row.shelf?.name].filter(
                    Boolean,
                );
                return parts.length ? parts.join(" – ") : t("common.dash");
            },
        },
        { key: "reorder_level", label: t("inventory.table.reorderLevel") },
        {
            key: "actions",
            label: t("inventory.table.actions"),
            align: "right",
            render: (_, row) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={() => {
                            setSelectedInventory(row);
                            setActivityModalOpen(true);
                        }}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={t("inventory.actions.viewHistory")}
                    >
                        <History className="w-4 h-4" />
                    </button>
                    {row.deposit_id && (
                        <button
                            onClick={() => {
                                setInventoryForMap(row);
                                setMapModalOpen(true);
                            }}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title={t("inventory.actions.viewLocation")}
                        >
                            <MapPin className="w-4 h-4" />
                        </button>
                    )}
                    {row.product?.barcode_svg && (
                        <button
                            onClick={() => {
                                setBarcodeProduct(row.product);
                                setBarcodeModalOpen(true);
                            }}
                            className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title={t("barcode.viewProduct")}
                        >
                            <Barcode className="w-4 h-4" />
                        </button>
                    )}
                    {hasPermission("manage inventory") && (
                        <>
                            <button
                                onClick={() => {
                                    setSelectedInventory(row);
                                    setFormModalOpen(true);
                                }}
                                className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                title={t("inventory.actions.edit")}
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDeleteClick(row)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title={t("inventory.actions.delete")}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    if (error) {
        const errorMessage =
            error?.response?.data?.message || error?.message || "Unknown error";
        const isPermissionError = error?.response?.status === 403;

        return (
            <div
                className={`p-4 rounded ${isPermissionError ? "bg-yellow-50 text-yellow-800" : "bg-red-50 text-red-800"}`}
            >
                <p className="font-semibold">
                    {isPermissionError
                        ? t("inventory.errors.permissionDenied")
                        : t("inventory.errors.error")}
                </p>
                <p>{errorMessage}</p>
            </div>
        );
    }

    const allData = data?.data || data || [];
    const filteredData = React.useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return allData;
        return allData.filter((row) =>
            JSON.stringify(row).toLowerCase().includes(s),
        );
    }, [allData, search]);
    const displayData = filteredData.slice(
        (page - 1) * perPage,
        page * perPage,
    );
    const lastPage = Math.max(1, Math.ceil(filteredData.length / perPage));

    return (
        <div>
            <PageHeader
                title={t("inventory.title")}
                actions={
                    hasPermission("manage inventory") && (
                        <button
                            onClick={() => {
                                setSelectedInventory(null);
                                setFormModalOpen(true);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            {t("inventory.actions.add")}
                        </button>
                    )
                }
            />
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataTable
                    columns={columns}
                    data={displayData}
                    loading={loading}
                    perPage={perPage}
                    onPerPageChange={handlePerPageChange}
                    searchValue={search}
                    onSearchChange={setSearch}
                    searchPlaceholder={t("inventory.searchPlaceholder")}
                    pagination={{
                        currentPage: page,
                        lastPage,
                        total: filteredData.length,
                        onPageChange: setPage,
                    }}
                    totalRecordName={t("inventory.totalRecordName")}
                />
            </div>
            <InventoryActivityModal
                isOpen={activityModalOpen}
                onClose={() => {
                    setActivityModalOpen(false);
                    setSelectedInventory(null);
                }}
                inventory={selectedInventory}
            />
            <InventoryFormModal
                isOpen={formModalOpen}
                onClose={() => {
                    setFormModalOpen(false);
                    setSelectedInventory(null);
                }}
                inventory={selectedInventory}
            />
            <ProductMapModal
                isOpen={mapModalOpen}
                onClose={() => {
                    setMapModalOpen(false);
                    setInventoryForMap(null);
                }}
                product={
                    productForMap ||
                    (inventoryForMap && productIdForMap
                        ? {
                              id: productIdForMap,
                              name:
                                  inventoryForMap.product?.name ||
                                  `Product #${productIdForMap}`,
                              inventories: [inventoryForMap],
                          }
                        : null)
                }
            />
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t("inventory.confirmDelete.title")}
                description={
                    inventoryToDelete
                        ? t("inventory.confirmDelete.description", {
                              name: inventoryToDelete.product?.name,
                              location:
                                  [inventoryToDelete.deposit?.name, inventoryToDelete.shelf?.name]
                                      .filter(Boolean)
                                      .join(" – ") || t("inventory.confirmDelete.thisLocation"),
                          })
                        : ""
                }
                confirmLabel={t("inventory.confirmDelete.confirm")}
                cancelLabel={t("common.cancel")}
                onConfirm={handleConfirmDelete}
            />

            <Dialog.Root
                open={barcodeModalOpen}
                onOpenChange={(open) => {
                    setBarcodeModalOpen(open);
                    if (!open) setBarcodeProduct(null);
                }}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50">
                        <Dialog.Title className="text-lg font-semibold text-gray-900">
                            {t("barcode.productTitle")}
                        </Dialog.Title>
                        <div className="mt-4 text-center">
                            <p className="text-sm text-gray-600 mb-2">
                                {barcodeProduct?.name}{" "}
                                {barcodeProduct?.sku
                                    ? `(${barcodeProduct.sku})`
                                    : ""}
                            </p>
                            {barcodeProduct?.barcode_svg ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        downloadBarcode(
                                            barcodeProduct.barcode_svg,
                                            `barcode-product-${barcodeProduct.sku || barcodeProduct.id}.svg`,
                                        )
                                    }
                                    className="border rounded-md p-3 inline-block hover:bg-gray-50"
                                    title={t("barcode.downloadHint")}
                                >
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: barcodeProduct.barcode_svg,
                                        }}
                                    />
                                </button>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    {t("barcode.notAvailable")}
                                </p>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <Dialog.Close asChild>
                                <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                                    {t("common.close")}
                                </button>
                            </Dialog.Close>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}
