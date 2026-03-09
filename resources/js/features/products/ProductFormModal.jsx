import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery, useQueries } from "@tanstack/react-query";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import api from "../../utils/api";
import { Plus, Trash2, Upload, Star } from "lucide-react";

const emptyInventoryRow = () => ({
    deposit_id: "",
    shelf_id: "",
    quantity: "",
    reorder_level: "",
});

export default function ProductFormModal({ isOpen, onClose, product = null }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        description: "",
        price: "",
        supplier_id: "",
        inventories: [emptyInventoryRow()],
        images: [],
    });

    const { data: depositsData } = useQuery({
        queryKey: ["deposits"],
        queryFn: async () => {
            const response = await api.get("/deposits");
            return response.data?.data || response.data || [];
        },
    });

    const depositIds = [...new Set(
        (formData.inventories || [])
            .map((inv) => inv.deposit_id)
            .filter(Boolean)
    )];

    const shelfQueries = useQueries({
        queries: depositIds.map((depositId) => ({
            queryKey: ["shelves", depositId],
            queryFn: async () => {
                const response = await api.get(
                    `/deposits/${depositId}/shelves`
                );
                return response.data?.data || response.data || [];
            },
        })),
    });

    const shelvesByDeposit = Object.fromEntries(
        depositIds.map((id, i) => [id, shelfQueries[i]?.data || []])
    );

    const { data: suppliersData } = useQuery({
        queryKey: ["suppliers"],
        queryFn: async () => {
            const response = await api.get("/suppliers?per_page=100");
            return response.data?.data ?? response.data ?? [];
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post("/products", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            queryClient.invalidateQueries({ queryKey: ["inventory"] });
            toast.success("Product created successfully");
            handleClose();
        },
        onError: (error) => {
            toast.error("Failed to create product", {
                description:
                    error.response?.data?.message || "An error occurred",
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await api.put(`/products/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            queryClient.invalidateQueries({ queryKey: ["inventory"] });
            toast.success("Product updated successfully");
            handleClose();
        },
        onError: (error) => {
            toast.error("Failed to update product", {
                description:
                    error.response?.data?.message || "An error occurred",
            });
        },
    });

    const uploadImageMutation = useMutation({
        mutationFn: async ({ productId, file, displayType }) => {
            const formData = new FormData();
            formData.append("image", file);
            formData.append("display_type", displayType);
            const res = await api.post(
                `/products/${productId}/images`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            if (data.product && data.product.images) {
                setFormData((prev) => ({
                    ...prev,
                    images: data.product.images,
                }));
            }
            toast.success("Image uploaded");
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Upload failed");
        },
    });

    const deleteImageMutation = useMutation({
        mutationFn: async ({ productId, url }) => {
            await api.delete(`/products/${productId}/images`, {
                params: { url },
            });
        },
        onSuccess: (_, { url }) => {
            setFormData((prev) => ({
                ...prev,
                images: (prev.images || []).filter((img) => img.url !== url),
            }));
            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast.success("Image removed");
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Delete failed");
        },
    });

    const setMainImageMutation = useMutation({
        mutationFn: async ({ id, images }) => {
            const updated = images.map((img, i) => ({
                url: img.url,
                display_type: i === 0 ? 1 : 0,
            }));
            const res = await api.put(`/products/${id}`, { images: updated });
            return res.data;
        },
        onSuccess: (data) => {
            if (data.images) {
                setFormData((prev) => ({ ...prev, images: data.images }));
            }
            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast.success("Main image updated");
        },
    });

    useEffect(() => {
        if (product) {
            const inventories =
                product.inventories?.length > 0
                    ? product.inventories.map((inv) => ({
                          id: inv.id,
                          deposit_id: String(inv.deposit_id ?? inv.deposit?.id ?? ""),
                          shelf_id: String(inv.shelf_id ?? inv.shelf?.id ?? ""),
                          quantity: String(inv.quantity ?? ""),
                          reorder_level: String(inv.reorder_level ?? ""),
                      }))
                    : [emptyInventoryRow()];
            setFormData({
                name: product.name || "",
                sku: product.sku || "",
                description: product.description || "",
                price: product.price ?? "",
                supplier_id: product.supplier_id ?? "",
                inventories,
                images: Array.isArray(product.images) ? product.images : [],
            });
        } else {
            setFormData({
                name: "",
                sku: "",
                description: "",
                price: "",
                supplier_id: "",
                inventories: [emptyInventoryRow()],
                images: [],
            });
        }
    }, [product, isOpen]);

    const handleClose = () => {
        setFormData({
            name: "",
            sku: "",
            description: "",
            price: "",
            supplier_id: "",
            inventories: [emptyInventoryRow()],
            images: [],
        });
        onClose();
    };

    const updateInventoryRow = (index, field, value) => {
        const next = [...formData.inventories];
        next[index] = { ...next[index], [field]: value };
        if (field === "deposit_id") {
            next[index].shelf_id = "";
        }
        setFormData({ ...formData, inventories: next });
    };

    const addInventoryRow = () => {
        setFormData({
            ...formData,
            inventories: [...formData.inventories, emptyInventoryRow()],
        });
    };

    const removeInventoryRow = (index) => {
        if (formData.inventories.length <= 1) return;
        const next = formData.inventories.filter((_, i) => i !== index);
        setFormData({ ...formData, inventories: next });
    };

    const sortedImages = [...(formData.images || [])].sort(
        (a, b) => (b.display_type || 0) - (a.display_type || 0)
    );

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file || !product?.id) return;
        const displayType = e.target.dataset.displayType === "1" ? 1 : 0;
        uploadImageMutation.mutate({
            productId: product.id,
            file,
            displayType,
        });
        e.target.value = "";
    };

    const handleDeleteImage = (url) => {
        if (!product?.id) return;
        deleteImageMutation.mutate({ productId: product.id, url });
    };

    const handleSetMain = (img) => {
        if (!product?.id || !formData.images?.length) return;
        const rest = formData.images.filter((i) => i.url !== img.url);
        const updated = [img, ...rest].map((i, index) => ({
            url: i.url,
            display_type: index === 0 ? 1 : 0,
        }));
        setMainImageMutation.mutate({ id: product.id, images: updated });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const inventoriesPayload = formData.inventories
            .filter(
                (row) =>
                    row.deposit_id &&
                    (row.quantity !== "" && Number(row.quantity) >= 0)
            )
            .map((row) => ({
                ...(row.id && { id: row.id }),
                deposit_id: row.deposit_id || null,
                shelf_id: row.shelf_id || null,
                quantity: parseInt(row.quantity, 10) || 0,
                reorder_level: parseInt(row.reorder_level, 10) || 0,
            }));

        if (product) {
            const submitData = {
                name: formData.name,
                sku: formData.sku,
                description: formData.description,
                price: parseFloat(formData.price) || 0,
                supplier_id: formData.supplier_id || null,
                inventories: inventoriesPayload,
            };
            updateMutation.mutate({ id: product.id, data: submitData });
        } else {
            const submitData = {
                name: formData.name,
                sku: formData.sku,
                description: formData.description,
                price: parseFloat(formData.price) || 0,
                supplier_id: formData.supplier_id || null,
                inventories: inventoriesPayload,
            };
            createMutation.mutate(submitData);
        }
    };

    const isEditMode = !!product;
    const suppliers = Array.isArray(suppliersData)
        ? suppliersData
        : suppliersData?.data || [];
    const deposits = Array.isArray(depositsData)
        ? depositsData
        : depositsData?.data || depositsData || [];

    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    handleClose();
                }
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50">
                    <Dialog.Title className="text-2xl font-bold mb-4">
                        {product ? "Edit Product" : "Create Product"}
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
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
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
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        sku: e.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        description: e.target.value,
                                    })
                                }
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
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        price: e.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Supplier
                            </label>
                            <select
                                value={formData.supplier_id}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        supplier_id: e.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Supplier</option>
                                {suppliers.map((supplier) => (
                                    <option
                                        key={supplier.id}
                                        value={supplier.id}
                                    >
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h3 className="text-lg font-semibold mb-2 text-gray-800">
                                {isEditMode
                                    ? "Inventory locations"
                                    : "Initial inventory (optional)"}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">
                                {isEditMode
                                    ? "Edit quantities and reorder levels, add or remove locations."
                                    : "Add one or more locations with quantities."}
                            </p>

                            {(formData.inventories || []).map((row, index) => (
                                <div
                                    key={row.id || index}
                                    className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 rounded-lg mb-2"
                                >
                                    <div className="flex-1 min-w-[120px]">
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Deposit
                                        </label>
                                        <select
                                            value={row.deposit_id}
                                            onChange={(e) =>
                                                updateInventoryRow(
                                                    index,
                                                    "deposit_id",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                        >
                                            <option value="">
                                                Select deposit
                                            </option>
                                            {deposits.map((d) => (
                                                <option key={d.id} value={d.id}>
                                                    {d.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[100px]">
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Shelf
                                        </label>
                                        <select
                                            value={row.shelf_id}
                                            onChange={(e) =>
                                                updateInventoryRow(
                                                    index,
                                                    "shelf_id",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                            disabled={!row.deposit_id}
                                        >
                                            <option value="">
                                                Shelf
                                            </option>
                                            {(shelvesByDeposit[row.deposit_id] || []).map(
                                                (s) => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.name}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </div>
                                    <div className="w-20">
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Qty
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={row.quantity}
                                            onChange={(e) =>
                                                updateInventoryRow(
                                                    index,
                                                    "quantity",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="w-20">
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Reorder
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={row.reorder_level}
                                            onChange={(e) =>
                                                updateInventoryRow(
                                                    index,
                                                    "reorder_level",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                            placeholder="0"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeInventoryRow(index)}
                                        disabled={
                                            formData.inventories.length <= 1
                                        }
                                        className="p-1.5 text-gray-500 hover:text-red-600 disabled:opacity-40"
                                        title="Remove location"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addInventoryRow}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add location
                            </button>
                        </div>

                        {isEditMode && product?.id && (
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-lg font-semibold mb-2 text-gray-800">
                                    Product images
                                </h3>
                                <p className="text-sm text-gray-600 mb-3">
                                    Main image (display_type 1) and additional images. Upload or set as main.
                                </p>
                                <div className="flex flex-wrap gap-3 mb-3">
                                    {sortedImages.map((img) => (
                                        <div
                                            key={img.url}
                                            className="relative group border rounded-lg overflow-hidden bg-gray-100"
                                            style={{ width: 80, height: 80 }}
                                        >
                                            <img
                                                src={img.url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                            {img.display_type === 1 && (
                                                <span className="absolute top-0 left-0 bg-blue-600 text-white text-xs px-1 rounded-br">
                                                    Main
                                                </span>
                                            )}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                                                {img.display_type !== 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetMain(img)}
                                                        className="p-1.5 bg-white rounded hover:bg-gray-100"
                                                        title="Set as main"
                                                    >
                                                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteImage(img.url)}
                                                    className="p-1.5 bg-white rounded hover:bg-red-50 text-red-600"
                                                    title="Remove"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <label className="inline-flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md cursor-pointer text-sm">
                                        <Upload className="w-4 h-4" />
                                        Add (additional)
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/gif,image/webp"
                                            className="hidden"
                                            data-display-type="0"
                                            onChange={handleImageUpload}
                                            disabled={uploadImageMutation.isPending}
                                        />
                                    </label>
                                    <label className="inline-flex items-center gap-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-md cursor-pointer text-sm">
                                        <Upload className="w-4 h-4" />
                                        Add as main
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/gif,image/webp"
                                            className="hidden"
                                            data-display-type="1"
                                            onChange={handleImageUpload}
                                            disabled={uploadImageMutation.isPending}
                                        />
                                    </label>
                                </div>
                            </div>
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
                                disabled={
                                    createMutation.isPending ||
                                    updateMutation.isPending
                                }
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {createMutation.isPending ||
                                updateMutation.isPending
                                    ? "Saving..."
                                    : "Save"}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
