import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "../../utils/api";
import DataTable from "../../components/DataTable";
import { formatCurrency } from "../../utils/formatters";
import { usePermissions } from "../../hooks/usePermissions";
import { Eye, MapPin, Pencil, Trash2, ImageOff } from "lucide-react";
import ProductFormModal from "./ProductFormModal";
import ProductViewModal from "./ProductViewModal";
import ProductMapModal from "./ProductMapModal";
import PageHeader from "../../components/PageHeader";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function ProductList() {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [perPage, setPerPage] = useState(20);
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const { data, loading, error, refetch } = useQuery({
        queryKey: ["products", searchTerm],
        queryFn: async () => {
            const params = searchTerm ? { search: searchTerm } : {};
            const response = await api.get("/products", { params });
            return response.data;
        },
    });

    const allData = data?.data || [];
    const displayData = allData.slice((page - 1) * perPage, page * perPage);
    const lastPage = Math.max(1, Math.ceil(allData.length / perPage));

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/products/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast.success("Product deleted successfully");
        },
        onError: (error) => {
            toast.error("Failed to delete product", {
                description:
                    error.response?.data?.message || "An error occurred",
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

    const handleDeleteClick = (product) => {
        setProductToDelete(product);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!productToDelete) return;
        deleteMutation.mutate(productToDelete.id, {
            onSettled: () => setProductToDelete(null),
        });
    };

    const columns = [
        {
            key: "image",
            label: "Image",
            render: (_, row) => {
                const images = row.images || [];
                const mainImage =
                    images.find((img) => img.display_type === 1) || images[0];
                if (mainImage?.url) {
                    return (
                        <div className="w-12 h-12 flex-shrink-0 rounded border border-gray-200 overflow-hidden bg-gray-50">
                            <img
                                src={mainImage.url}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        </div>
                    );
                }
                return (
                    <div
                        className="w-12 h-12 flex-shrink-0 rounded border border-gray-200 bg-gray-100 flex flex-col items-center justify-center text-gray-400"
                        title="No image"
                    >
                        <ImageOff className="w-5 h-5 flex-shrink-0" />
                        <span className="text-[10px] leading-tight mt-0.5">
                            No image
                        </span>
                    </div>
                );
            },
        },
        { key: "name", label: "Name" },
        { key: "sku", label: "SKU" },
        {
            key: "price",
            label: "Price",
            render: (value) => formatCurrency(value),
        },
        {
            key: "total_stock",
            label: "Total Stock",
            render: (value, row) =>
                row.total_inventory_quantity ??
                (row.inventories || []).reduce(
                    (s, inv) => s + (inv.quantity ?? 0),
                    0,
                ),
        },
        {
            key: "actions",
            label: "Actions",
            align: "right",
            render: (value, row) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={() => handleView(row)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    {row.inventories &&
                        row.inventories.length > 0 &&
                        row.inventories[0]?.deposit_id && (
                            <button
                                onClick={() => handleViewMap(row)}
                                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="View on Map"
                            >
                                <MapPin className="w-4 h-4" />
                            </button>
                        )}
                    {hasPermission("edit products") && (
                        <button
                            onClick={() => handleEdit(row)}
                            className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Edit"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    {hasPermission("delete products") && (
                        <button
                            onClick={() => handleDeleteClick(row)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
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

    return (
        <div>
            <PageHeader
                title="Products"
                actions={
                    hasPermission("create products") && (
                        <button
                            onClick={handleCreate}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4v16m8-8H4"
                                />
                            </svg>
                            Add Product
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
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder="Search products by name or SKU..."
                    pagination={{
                        currentPage: page,
                        lastPage,
                        total: allData.length,
                        onPageChange: setPage,
                    }}
                    totalRecordName="products"
                />
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
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete product?"
                description={
                    productToDelete
                        ? `Are you sure you want to delete "${productToDelete.name}"?`
                        : ""
                }
                confirmLabel="Yes, delete"
                cancelLabel="Cancel"
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
