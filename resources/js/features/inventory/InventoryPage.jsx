import React, { useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import DataTable from "../../components/DataTable";
import PageHeader from "../../components/PageHeader";
import InventoryActivityModal from "./InventoryActivityModal";
import InventoryFormModal from "./InventoryFormModal";
import ProductMapModal from "../products/ProductMapModal";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import { History, Plus, Pencil, Trash2, MapPin } from "lucide-react";

export default function InventoryPage() {
    const queryClient = useQueryClient();
    const { data, loading, error } = useFetch("inventory", "/inventory");
    const { hasPermission } = usePermissions();
    const [activityModalOpen, setActivityModalOpen] = useState(false);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [mapModalOpen, setMapModalOpen] = useState(false);
    const [selectedInventory, setSelectedInventory] = useState(null);
    const [inventoryForMap, setInventoryForMap] = useState(null);
    const [perPage, setPerPage] = useState(20);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

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
            toast.success("Inventory record deleted");
            setSelectedInventory(null);
        },
        onError: (err) => {
            toast.error(
                err.response?.data?.message || "Failed to delete inventory",
            );
        },
    });

    const handleDelete = (row) => {
        const location =
            [row.deposit?.name, row.shelf?.name].filter(Boolean).join(" – ") ||
            "this location";
        if (
            window.confirm(
                `Delete inventory for "${row.product?.name}" at ${location}?`,
            )
        ) {
            deleteMutation.mutate(row.id);
        }
    };

    const columns = [
        {
            key: "product",
            label: "Product",
            render: (_, row) => (
                <div>
                    <div className="font-medium text-gray-900">
                        {row.product?.name ?? "-"}
                    </div>
                    {row.product?.sku && (
                        <div className="text-xs text-gray-500 mt-0.5">
                            SKU: {row.product.sku}
                        </div>
                    )}
                </div>
            ),
        },
        { key: "quantity", label: "Stock" },
        {
            key: "location",
            label: "Location",
            render: (_, row) => {
                const parts = [row.deposit?.name, row.shelf?.name].filter(
                    Boolean,
                );
                return parts.length ? parts.join(" – ") : "-";
            },
        },
        { key: "reorder_level", label: "Reorder Level" },
        {
            key: "actions",
            label: "Actions",
            align: "right",
            render: (_, row) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={() => {
                            setSelectedInventory(row);
                            setActivityModalOpen(true);
                        }}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View history"
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
                            title="View location in deposit"
                        >
                            <MapPin className="w-4 h-4" />
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
                                title="Edit inventory"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(row)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
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
                    {isPermissionError ? "Permission Denied" : "Error"}
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
                title="Inventory"
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
                            Add inventory
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
                    searchPlaceholder="Search inventory..."
                    pagination={{
                        currentPage: page,
                        lastPage,
                        total: filteredData.length,
                        onPageChange: setPage,
                    }}
                    totalRecordName="inventory records"
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
        </div>
    );
}
