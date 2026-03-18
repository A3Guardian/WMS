import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import api from "../../utils/api";
import SearchableSelect from "../../components/SearchableSelect";
import { Plus, Trash2 } from "lucide-react";

const emptyItemRow = () => ({
    product_id: "",
    quantity: "",
    price: "",
});

const STATUS_OPTIONS = [
    { value: "pending", labelKey: "orders.status.pending" },
    { value: "processing", labelKey: "orders.status.processing" },
    { value: "completed", labelKey: "orders.status.completed" },
    { value: "cancelled", labelKey: "orders.status.cancelled" },
];

export default function OrderFormModal({ isOpen, onClose, order = null }) {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        customer_id: "",
        status: "pending",
        notes: "",
        items: [emptyItemRow()],
    });

    const fetchCustomers = (params) =>
        api.get("/customers?" + params).then((r) => r.data);
    const fetchProducts = (params) =>
        api.get("/products?" + params).then((r) => r.data);

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const res = await api.post("/orders", data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            toast.success(t("orders.toast.created"));
            handleClose();
        },
        onError: (err) => {
            toast.error(
                err.response?.data?.message || t("orders.toast.createFailed"),
            );
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const res = await api.put(`/orders/${id}`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            toast.success(t("orders.toast.updated"));
            handleClose();
        },
        onError: (err) => {
            toast.error(
                err.response?.data?.message || t("orders.toast.updateFailed"),
            );
        },
    });

    useEffect(() => {
        if (order) {
            const items =
                order.items?.length > 0
                    ? order.items.map((it) => ({
                          product_id: String(it.product_id ?? it.product?.id ?? ""),
                          quantity: String(it.quantity ?? ""),
                          price: String(it.price ?? ""),
                      }))
                    : [emptyItemRow()];
            setFormData({
                customer_id: order.customer_id ? String(order.customer_id) : "",
                status: order.status || "pending",
                notes: order.notes || "",
                items,
            });
        } else {
            setFormData({
                customer_id: "",
                status: "pending",
                notes: "",
                items: [emptyItemRow()],
            });
        }
    }, [order, isOpen]);

    const handleClose = () => {
        setFormData({
            customer_id: "",
            status: "pending",
            notes: "",
            items: [emptyItemRow()],
        });
        onClose();
    };

    const updateItemRow = (index, field, value) => {
        const next = [...formData.items];
        next[index] = { ...next[index], [field]: value };
        setFormData({ ...formData, items: next });
    };

    const addItemRow = () => {
        setFormData({
            ...formData,
            items: [...formData.items, emptyItemRow()],
        });
    };

    const removeItemRow = (index) => {
        if (formData.items.length <= 1) return;
        setFormData({
            ...formData,
            items: formData.items.filter((_, i) => i !== index),
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const itemsPayload = formData.items
            .filter(
                (row) =>
                    row.product_id &&
                    Number(row.quantity) >= 1 &&
                    Number(row.price) >= 0
            )
            .map((row) => ({
                product_id: Number(row.product_id),
                quantity: Number(row.quantity),
                price: parseFloat(row.price) || 0,
            }));

        if (itemsPayload.length === 0) {
            toast.error(t("orders.form.itemsRequired"));
            return;
        }

        const payload = {
            customer_id: formData.customer_id || null,
            status: formData.status,
            notes: formData.notes.trim() || null,
            items: itemsPayload,
        };

        if (order) {
            updateMutation.mutate({ id: order.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const isEdit = !!order;
    const isPending =
        createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) handleClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl z-50">
                    <Dialog.Title className="text-2xl font-bold mb-1">
                        {order
                            ? t("orders.form.editTitle")
                            : t("orders.form.createTitle")}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-500 mb-4">
                        {t("orders.form.description")}
                    </Dialog.Description>
                    {isEdit && order?.order_number && (
                        <p className="text-sm text-gray-500 mb-4">
                            {t("orders.form.orderNumber")}:{" "}
                            <strong>{order.order_number}</strong>
                        </p>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("orders.form.customer")}
                            </label>
                            <SearchableSelect
                                value={formData.customer_id || ""}
                                onChange={(v) =>
                                    setFormData({
                                        ...formData,
                                        customer_id: v || "",
                                    })
                                }
                                fetchOptions={fetchCustomers}
                                displayValue={(opt) =>
                                    opt?.company_name || opt?.name || opt?.email
                                }
                                placeholder={t("orders.form.selectCustomer")}
                                cacheKey="order-customers"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("orders.form.status")}
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        status: e.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <option
                                        key={opt.value}
                                        value={opt.value}
                                    >
                                        {t(opt.labelKey)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("orders.form.notes")}
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        notes: e.target.value,
                                    })
                                }
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder={t("orders.form.notesPlaceholder")}
                            />
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                {t("orders.form.itemsTitle")}
                            </h3>
                            {formData.items.map((row, index) => (
                                <div
                                    key={index}
                                    className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 rounded-lg mb-2"
                                >
                                    <div className="flex-1 min-w-[180px]">
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            {t("orders.form.item.product")}
                                        </label>
                                        <SearchableSelect
                                            value={row.product_id || ""}
                                            onChange={(v) =>
                                                updateItemRow(
                                                    index,
                                                    "product_id",
                                                    v || ""
                                                )
                                            }
                                            fetchOptions={fetchProducts}
                                            displayValue={(opt) =>
                                                opt?.name
                                                    ? `${opt.name}${opt.sku ? ` (${opt.sku})` : ""}`
                                                    : opt?.sku
                                            }
                                            placeholder={t(
                                                "orders.form.item.selectProduct",
                                            )}
                                            cacheKey="order-products"
                                            className="min-h-[34px] px-2 py-1.5 text-sm"
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            {t("orders.form.item.quantity")}
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={row.quantity}
                                            onChange={(e) =>
                                                updateItemRow(
                                                    index,
                                                    "quantity",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                            placeholder="1"
                                        />
                                    </div>
                                    <div className="w-28">
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            {t("orders.form.item.price")}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={row.price}
                                            onChange={(e) =>
                                                updateItemRow(
                                                    index,
                                                    "price",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeItemRow(index)}
                                        disabled={formData.items.length <= 1}
                                        className="p-1.5 text-gray-500 hover:text-red-600 disabled:opacity-40"
                                        title={t("orders.form.item.removeLine")}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addItemRow}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
                            >
                                <Plus className="w-4 h-4" />
                                {t("orders.form.item.addProduct")}
                            </button>
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
                                disabled={isPending}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isPending ? t("common.saving") : t("common.save")}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
