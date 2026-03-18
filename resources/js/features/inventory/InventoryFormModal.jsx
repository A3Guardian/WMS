import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import api from "../../utils/api";
import SearchableSelect from "../../components/SearchableSelect";

export default function InventoryFormModal({
    isOpen,
    onClose,
    inventory = null,
}) {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const isEdit = !!inventory;
    const [formData, setFormData] = useState({
        product_id: "",
        deposit_id: "",
        shelf_id: "",
        quantity: "",
        reorder_level: "",
    });

    const { data: shelvesData } = useQuery({
        queryKey: ["shelves", formData.deposit_id],
        queryFn: async () => {
            if (!formData.deposit_id) return [];
            const res = await api.get(
                `/deposits/${formData.deposit_id}/shelves`
            );
            return res.data?.data || res.data || [];
        },
        enabled: isOpen && !!formData.deposit_id,
    });

    const fetchProducts = (params) => api.get("/products?" + params).then((r) => r.data);
    const fetchDeposits = (params) => api.get("/deposits?" + params).then((r) => r.data);

    useEffect(() => {
        if (inventory) {
            setFormData({
                product_id: String(inventory.product_id ?? ""),
                deposit_id: String(inventory.deposit_id ?? inventory.deposit?.id ?? ""),
                shelf_id: String(inventory.shelf_id ?? inventory.shelf?.id ?? ""),
                quantity: String(inventory.quantity ?? ""),
                reorder_level: String(inventory.reorder_level ?? ""),
            });
        } else {
            setFormData({
                product_id: "",
                deposit_id: "",
                shelf_id: "",
                quantity: "",
                reorder_level: "",
            });
        }
    }, [inventory, isOpen]);

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const res = await api.post("/inventory", data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventory"] });
            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast.success(t("inventory.toast.created"));
            onClose();
        },
        onError: (err) => {
            toast.error(
                err.response?.data?.message || t("inventory.toast.createFailed")
            );
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const res = await api.put(`/inventory/${id}`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventory"] });
            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast.success(t("inventory.toast.updated"));
            onClose();
        },
        onError: (err) => {
            toast.error(
                err.response?.data?.message || t("inventory.toast.updateFailed")
            );
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            product_id: isEdit ? undefined : Number(formData.product_id),
            deposit_id: formData.deposit_id || null,
            shelf_id: formData.shelf_id || null,
            quantity: parseInt(formData.quantity, 10) || 0,
            reorder_level: parseInt(formData.reorder_level, 10) || 0,
        };
        if (isEdit) {
            updateMutation.mutate({ id: inventory.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const shelves = Array.isArray(shelvesData)
        ? shelvesData
        : shelvesData?.data || shelvesData || [];

    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50">
                    <Dialog.Title className="text-xl font-bold mb-4">
                        {isEdit
                            ? t("inventory.form.editTitle")
                            : t("inventory.form.createTitle")}
                    </Dialog.Title>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isEdit && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("inventory.form.product")} *
                                </label>
                                <SearchableSelect
                                    value={formData.product_id || ""}
                                    onChange={(v) =>
                                        setFormData({
                                            ...formData,
                                            product_id: v || "",
                                        })
                                    }
                                    fetchOptions={fetchProducts}
                                    displayValue={(p) => (p ? `${p.name} (${p.sku || ""})` : "")}
                                    placeholder={t("inventory.form.selectProduct")}
                                    cacheKey="inventory-products"
                                />
                            </div>
                        )}
                        {isEdit && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("inventory.form.product")}
                                </label>
                                <p className="py-2 text-gray-900">
                                    {inventory.product?.name ?? t("common.dash")}
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("inventory.form.deposit")} *
                            </label>
                            <SearchableSelect
                                value={formData.deposit_id || ""}
                                onChange={(v) =>
                                    setFormData({
                                        ...formData,
                                        deposit_id: v || "",
                                        shelf_id: "",
                                    })
                                }
                                fetchOptions={fetchDeposits}
                                displayValue={(d) => d?.name}
                                placeholder={t("inventory.form.selectDeposit")}
                                cacheKey="inventory-deposits"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("inventory.form.shelf")}
                            </label>
                            <SearchableSelect
                                value={formData.shelf_id || ""}
                                onChange={(v) =>
                                    setFormData({
                                        ...formData,
                                        shelf_id: v || "",
                                    })
                                }
                                options={shelves.map((s) => ({ id: s.id, name: s.name }))}
                                displayValue={(s) => s?.name}
                                placeholder={t("inventory.form.selectShelf")}
                                disabled={!formData.deposit_id}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("inventory.form.quantity")} *
                            </label>
                            <input
                                type="number"
                                min="0"
                                required
                                value={formData.quantity}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        quantity: e.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("inventory.form.reorderLevel")}
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.reorder_level}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        reorder_level: e.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="0"
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                                >
                                    {t("common.cancel")}
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
                                    ? t("common.saving")
                                    : t("common.save")}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
