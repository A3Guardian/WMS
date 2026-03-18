import React, { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "../../hooks/useForm";
import api from "../../utils/api";
import { usePermissions } from "../../hooks/usePermissions";
import SearchableSelect from "../../components/SearchableSelect";
import { Plus, Trash2 } from "lucide-react";

export default function InvoiceFormModal({
    isOpen,
    onClose,
    invoiceId = null,
    mode = "create", // "create" | "edit"
}) {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const isEdit = mode === "edit";

    const { data: invoiceData } = useQuery({
        queryKey: ["invoice", invoiceId],
        queryFn: async () => {
            const response = await api.get(`/invoices/${invoiceId}`);
            return response.data;
        },
        enabled: isEdit && !!invoiceId && isOpen,
    });

    const fetchSuppliers = (params) =>
        api.get("/suppliers?" + params).then((r) => r.data);

    const fetchCustomers = (params) =>
        api.get("/customers?" + params).then((r) => r.data);

    const fetchProducts = (params) =>
        api.get("/products?" + params).then((r) => r.data);

    const [items, setItems] = useState([]);

    const initialValues = {
        supplier_id: "",
        customer_id: "",
        type: "income",
        status: "draft",
        issue_date: new Date().toISOString().split("T")[0],
        due_date: "",
        paid_date: "",
        subtotal: "",
        tax_amount: "",
        discount_amount: "",
        total_amount: "",
        category: "",
        description: "",
        notes: "",
    };

    const {
        values,
        errors,
        isSubmitting,
        handleChange,
        handleSubmit,
        setValues,
    } = useForm(initialValues, async (formValues) => {
        try {
            const submitData = {
                supplier_id: formValues.supplier_id || null,
                customer_id: formValues.customer_id || null,
                type: formValues.type,
                status: formValues.status,
                issue_date: formValues.issue_date,
                due_date: formValues.due_date || null,
                paid_date: formValues.paid_date || null,
                subtotal: parseFloat(formValues.subtotal || 0),
                tax_amount: parseFloat(formValues.tax_amount || 0),
                discount_amount: parseFloat(formValues.discount_amount || 0),
                total_amount: parseFloat(formValues.total_amount || 0),
                category: formValues.category || null,
                description: formValues.description || null,
                notes: formValues.notes || null,
                items: items.map((it) => ({
                    item_type: it.item_type,
                    product_id: it.product_id || null,
                    name: it.name || null,
                    sku: it.sku || null,
                    description: it.description || null,
                    quantity: parseFloat(it.quantity || 0),
                    unit: it.unit || null,
                    unit_price: parseFloat(it.unit_price || 0),
                    tax_rate: parseFloat(it.tax_rate || 0),
                    discount_rate: parseFloat(it.discount_rate || 0),
                })),
            };

            if (isEdit) {
                await api.put(`/invoices/${invoiceId}`, submitData);
                toast.success("Invoice updated successfully");
            } else {
                await api.post("/invoices", submitData);
                toast.success("Invoice created successfully");
            }

            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            onClose();
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || "An error occurred";
            toast.error(
                isEdit ? "Failed to update invoice" : "Failed to create invoice",
                { description: errorMessage },
            );
            throw error;
        }
    });

    useEffect(() => {
        if (!isOpen) return;

        if (invoiceData && isEdit) {
            setValues({
                supplier_id: invoiceData.supplier_id || "",
                    customer_id: invoiceData.customer_id || "",
                type: invoiceData.type || "income",
                status: invoiceData.status || "draft",
                issue_date: invoiceData.issue_date
                    ? invoiceData.issue_date.split("T")[0]
                    : new Date().toISOString().split("T")[0],
                due_date: invoiceData.due_date
                    ? invoiceData.due_date.split("T")[0]
                    : "",
                paid_date: invoiceData.paid_date
                    ? invoiceData.paid_date.split("T")[0]
                    : "",
                subtotal: invoiceData.subtotal || "",
                tax_amount: invoiceData.tax_amount || "",
                discount_amount: invoiceData.discount_amount || "",
                total_amount: invoiceData.total_amount || "",
                category: invoiceData.category || "",
                description: invoiceData.description || "",
                notes: invoiceData.notes || "",
            });

            const loadedItems = Array.isArray(invoiceData.items)
                ? invoiceData.items
                : [];
            setItems(
                loadedItems.map((it) => ({
                    item_type: it.item_type || (it.product_id ? "product" : "service"),
                    product_id: it.product_id || it.product?.id || null,
                    name: it.name || it.product?.name || "",
                    sku: it.sku || it.product?.sku || "",
                    description: it.description || "",
                    quantity: it.quantity ?? 1,
                    unit: it.unit || "",
                    unit_price: it.unit_price ?? 0,
                    tax_rate: it.tax_rate ?? 0,
                    discount_rate: it.discount_rate ?? 0,
                })),
            );
        }

        if (!invoiceId && !isEdit) {
            setValues(initialValues);
            setItems([]);
        }
    }, [invoiceData, invoiceId, isEdit, isOpen, setValues]);

    const itemTotals = useMemo(() => {
        const calcLine = (it) => {
            const qty = parseFloat(it.quantity || 0);
            const price = parseFloat(it.unit_price || 0);
            const taxRate = parseFloat(it.tax_rate || 0);
            const discountRate = parseFloat(it.discount_rate || 0);
            const base = qty * price;
            const discount = base * (discountRate / 100);
            const subtotal = Math.max(0, base - discount);
            const tax = subtotal * (taxRate / 100);
            const total = subtotal + tax;
            return { subtotal, tax, total };
        };

        const lines = items.map(calcLine);
        const subtotal = lines.reduce((acc, l) => acc + l.subtotal, 0);
        const tax = lines.reduce((acc, l) => acc + l.tax, 0);
        const total = lines.reduce((acc, l) => acc + l.total, 0);
        return { lines, subtotal, tax, total };
    }, [items]);

    useEffect(() => {
        if (!isOpen) return;
        if (items.length === 0) return;
        // Keep invoice subtotal aligned with line items subtotal
        setValues((prev) => ({
            ...prev,
            subtotal: itemTotals.subtotal.toFixed(2),
        }));
    }, [isOpen, items.length, itemTotals.subtotal]);

    useEffect(() => {
        if (!isOpen) return;
        if (values.type === "income" && values.supplier_id) {
            setValues((prev) => ({ ...prev, supplier_id: "" }));
        }
        if (values.type === "expense" && values.customer_id) {
            setValues((prev) => ({ ...prev, customer_id: "" }));
        }
    }, [isOpen, values.type]);

    const calculatedTotal = useMemo(() => {
        const subtotal = parseFloat(values.subtotal || 0);
        const tax = parseFloat(values.tax_amount || 0);
        const discount = parseFloat(values.discount_amount || 0);
        return subtotal + tax - discount;
    }, [values.subtotal, values.tax_amount, values.discount_amount]);

    useEffect(() => {
        if (!isOpen) return;
        if (calculatedTotal > 0 && !values.total_amount) {
            setValues({ ...values, total_amount: calculatedTotal.toFixed(2) });
        }
    }, [calculatedTotal, isOpen]);

    if (isEdit && !hasPermission("edit invoices")) return null;
    if (!isEdit && !hasPermission("create invoices")) return null;

    const title = isEdit ? "Edit Invoice" : "Create Invoice";

    const addProductItem = () => {
        setItems((prev) => [
            ...prev,
            {
                item_type: "product",
                product_id: null,
                name: "",
                sku: "",
                description: "",
                quantity: 1,
                unit: "",
                unit_price: 0,
                tax_rate: 0,
                discount_rate: 0,
            },
        ]);
    };

    const addServiceItem = () => {
        setItems((prev) => [
            ...prev,
            {
                item_type: "service",
                product_id: null,
                name: "",
                sku: "",
                description: "",
                quantity: 1,
                unit: "",
                unit_price: 0,
                tax_rate: 0,
                discount_rate: 0,
            },
        ]);
    };

    const updateItem = (idx, patch) => {
        setItems((prev) =>
            prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
        );
    };

    const removeItem = (idx) => {
        setItems((prev) => prev.filter((_, i) => i !== idx));
    };

    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl z-50 max-h-[90vh] overflow-y-auto">
                    <Dialog.Title className="text-2xl font-bold mb-1">
                        {title}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-500 mb-4">
                        Manage invoice details.
                    </Dialog.Description>

                    <form
                        onSubmit={handleSubmit}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Invoice Number
                            </label>
                            <input
                                type="text"
                                value={
                                    isEdit
                                        ? invoiceData?.invoice_number || ""
                                        : "Auto-generated"
                                }
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Auto-generated if not provided.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Supplier
                            </label>
                            <SearchableSelect
                                value={values.supplier_id || ""}
                                onChange={(v) =>
                                    handleChange({
                                        target: {
                                            name: "supplier_id",
                                            value: v || "",
                                        },
                                    })
                                }
                                fetchOptions={fetchSuppliers}
                                displayValue={(sup) => sup?.name}
                                placeholder="Select Supplier (Optional)"
                                cacheKey="invoice-modal-suppliers"
                                disabled={values.type === "income"}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Customer
                            </label>
                            <SearchableSelect
                                value={values.customer_id || ""}
                                onChange={(v) =>
                                    handleChange({
                                        target: {
                                            name: "customer_id",
                                            value: v || "",
                                        },
                                    })
                                }
                                fetchOptions={fetchCustomers}
                                displayValue={(c) => c?.company_name || c?.name}
                                placeholder="Select Customer (Optional)"
                                cacheKey="invoice-modal-customers"
                                disabled={values.type === "expense"}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type <span className="text-red-500">*</span>
                            </label>
                            <SearchableSelect
                                value={values.type}
                                onChange={(v) =>
                                    handleChange({
                                        target: { name: "type", value: v },
                                    })
                                }
                                options={[
                                    { value: "income", label: "Income" },
                                    { value: "expense", label: "Expense" },
                                ]}
                                placeholder="Select type"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <SearchableSelect
                                value={values.status}
                                onChange={(v) =>
                                    handleChange({
                                        target: { name: "status", value: v },
                                    })
                                }
                                options={[
                                    { value: "draft", label: "Draft" },
                                    { value: "sent", label: "Sent" },
                                    { value: "paid", label: "Paid" },
                                    { value: "overdue", label: "Overdue" },
                                    { value: "cancelled", label: "Cancelled" },
                                ]}
                                placeholder="Select status"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Issue Date{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="issue_date"
                                value={values.issue_date}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Due Date
                            </label>
                            <input
                                type="date"
                                name="due_date"
                                value={values.due_date}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Paid Date
                            </label>
                            <input
                                type="date"
                                name="paid_date"
                                value={values.paid_date}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category
                            </label>
                            <input
                                type="text"
                                name="category"
                                value={values.category}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder="e.g., Office Supplies, Services"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Subtotal{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="subtotal"
                                value={values.subtotal}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tax Amount
                            </label>
                            <input
                                type="number"
                                name="tax_amount"
                                value={values.tax_amount}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Discount Amount
                            </label>
                            <input
                                type="number"
                                name="discount_amount"
                                value={values.discount_amount}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Total Amount{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="total_amount"
                                value={values.total_amount}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Calculated: {calculatedTotal.toFixed(2)}
                            </p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={values.description}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder="Invoice description"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                            </label>
                            <textarea
                                name="notes"
                                value={values.notes}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder="Additional notes"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <div className="text-sm font-medium text-gray-900">
                                        Items
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Add products or services to be stored on the invoice.
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={addProductItem}
                                        className="px-3 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 inline-flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Product
                                    </button>
                                    <button
                                        type="button"
                                        onClick={addServiceItem}
                                        className="px-3 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 inline-flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Service
                                    </button>
                                </div>
                            </div>

                            {items.length === 0 ? (
                                <div className="p-4 border border-dashed rounded-md text-sm text-gray-500">
                                    No items yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto border rounded-md">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Type / Product
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Name
                                                </th>
                                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                                    Qty
                                                </th>
                                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                                    Unit price
                                                </th>
                                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                                    Tax %
                                                </th>
                                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                                    Disc %
                                                </th>
                                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                                    Line total
                                                </th>
                                                <th className="px-3 py-2" />
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {items.map((it, idx) => {
                                                const line = itemTotals.lines[idx] || {
                                                    total: 0,
                                                };
                                                return (
                                                    <tr key={idx}>
                                                        <td className="px-3 py-2 align-top w-[260px]">
                                                            <div className="space-y-2">
                                                                <SearchableSelect
                                                                    value={it.item_type}
                                                                    onChange={(v) =>
                                                                        updateItem(idx, {
                                                                            item_type:
                                                                                v ||
                                                                                "product",
                                                                            product_id:
                                                                                v ===
                                                                                "service"
                                                                                    ? null
                                                                                    : it.product_id,
                                                                        })
                                                                    }
                                                                    options={[
                                                                        {
                                                                            value: "product",
                                                                            label: "Product",
                                                                        },
                                                                        {
                                                                            value: "service",
                                                                            label: "Service",
                                                                        },
                                                                    ]}
                                                                    placeholder="Type"
                                                                />

                                                                {it.item_type ===
                                                                "product" ? (
                                                                    <SearchableSelect
                                                                        value={
                                                                            it.product_id ||
                                                                            ""
                                                                        }
                                                                        onChange={async (
                                                                            v,
                                                                        ) => {
                                                                            const id =
                                                                                v ||
                                                                                null;
                                                                            if (
                                                                                !id
                                                                            ) {
                                                                                updateItem(
                                                                                    idx,
                                                                                    {
                                                                                        product_id:
                                                                                            null,
                                                                                        name: "",
                                                                                        sku: "",
                                                                                    },
                                                                                );
                                                                                return;
                                                                            }
                                                                            try {
                                                                                const res =
                                                                                    await api.get(
                                                                                        `/products/${id}`,
                                                                                    );
                                                                                const p =
                                                                                    res.data;
                                                                                updateItem(
                                                                                    idx,
                                                                                    {
                                                                                        product_id:
                                                                                            id,
                                                                                        name:
                                                                                            p?.name ||
                                                                                            "",
                                                                                        sku:
                                                                                            p?.sku ||
                                                                                            "",
                                                                                        unit_price:
                                                                                            p?.price ??
                                                                                            0,
                                                                                        description:
                                                                                            p?.description ||
                                                                                            "",
                                                                                    },
                                                                                );
                                                                            } catch {
                                                                                updateItem(
                                                                                    idx,
                                                                                    {
                                                                                        product_id:
                                                                                            id,
                                                                                    },
                                                                                );
                                                                            }
                                                                        }}
                                                                        fetchOptions={
                                                                            fetchProducts
                                                                        }
                                                                        displayValue={(
                                                                            p,
                                                                        ) =>
                                                                            `${p?.sku ? `${p.sku} - ` : ""}${p?.name || ""}`
                                                                        }
                                                                        placeholder="Select product"
                                                                        cacheKey="invoice-modal-products"
                                                                    />
                                                                ) : (
                                                                    <div className="text-xs text-gray-500">
                                                                        Service line
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 align-top">
                                                            <input
                                                                type="text"
                                                                value={it.name}
                                                                onChange={(e) =>
                                                                    updateItem(
                                                                        idx,
                                                                        {
                                                                            name: e
                                                                                .target
                                                                                .value,
                                                                        },
                                                                    )
                                                                }
                                                                placeholder={
                                                                    it.item_type ===
                                                                    "service"
                                                                        ? "Service name"
                                                                        : "Item name"
                                                                }
                                                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={
                                                                    it.description ||
                                                                    ""
                                                                }
                                                                onChange={(e) =>
                                                                    updateItem(
                                                                        idx,
                                                                        {
                                                                            description:
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                        },
                                                                    )
                                                                }
                                                                placeholder="Description (optional)"
                                                                className="w-full mt-2 px-2 py-1 border border-gray-300 rounded"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 align-top">
                                                            <input
                                                                type="number"
                                                                value={it.quantity}
                                                                onChange={(e) =>
                                                                    updateItem(
                                                                        idx,
                                                                        {
                                                                            quantity:
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                        },
                                                                    )
                                                                }
                                                                step="0.001"
                                                                min="0"
                                                                className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 align-top">
                                                            <input
                                                                type="number"
                                                                value={
                                                                    it.unit_price
                                                                }
                                                                onChange={(e) =>
                                                                    updateItem(
                                                                        idx,
                                                                        {
                                                                            unit_price:
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                        },
                                                                    )
                                                                }
                                                                step="0.01"
                                                                min="0"
                                                                className="w-28 px-2 py-1 border border-gray-300 rounded text-right"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 align-top">
                                                            <input
                                                                type="number"
                                                                value={it.tax_rate}
                                                                onChange={(e) =>
                                                                    updateItem(
                                                                        idx,
                                                                        {
                                                                            tax_rate:
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                        },
                                                                    )
                                                                }
                                                                step="0.01"
                                                                min="0"
                                                                max="100"
                                                                className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 align-top">
                                                            <input
                                                                type="number"
                                                                value={
                                                                    it.discount_rate
                                                                }
                                                                onChange={(e) =>
                                                                    updateItem(
                                                                        idx,
                                                                        {
                                                                            discount_rate:
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                        },
                                                                    )
                                                                }
                                                                step="0.01"
                                                                min="0"
                                                                max="100"
                                                                className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 align-top text-right font-medium whitespace-nowrap">
                                                            {line.total.toFixed(
                                                                2,
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 align-top text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeItem(
                                                                        idx,
                                                                    )
                                                                }
                                                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                                                                title="Remove"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {items.length > 0 && (
                                <div className="mt-3 flex items-center justify-end text-sm text-gray-700 gap-6">
                                    <div>
                                        <span className="text-gray-500">
                                            Items subtotal:
                                        </span>{" "}
                                        <span className="font-semibold">
                                            {itemTotals.subtotal.toFixed(2)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">
                                            Items tax:
                                        </span>{" "}
                                        <span className="font-semibold">
                                            {itemTotals.tax.toFixed(2)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">
                                            Items total:
                                        </span>{" "}
                                        <span className="font-semibold">
                                            {itemTotals.total.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {errors.form && (
                            <div className="md:col-span-2 mt-2 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                                {errors.form}
                            </div>
                        )}

                        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                    onClick={onClose}
                                >
                                    Cancel
                                </button>
                            </Dialog.Close>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting
                                    ? "Saving..."
                                    : isEdit
                                      ? "Update Invoice"
                                      : "Create Invoice"}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

