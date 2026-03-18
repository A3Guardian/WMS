import React, { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "../../hooks/useForm";
import api from "../../utils/api";
import { usePermissions } from "../../hooks/usePermissions";
import SearchableSelect from "../../components/SearchableSelect";

export default function SupplierPaymentFormModal({
    isOpen,
    onClose,
    paymentId = null,
    mode = "create", // "create" | "edit"
}) {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const isEdit = mode === "edit";

    const fetchSuppliers = (params) =>
        api.get("/suppliers?" + params).then((r) => r.data);
    const fetchCustomers = (params) =>
        api.get("/customers?" + params).then((r) => r.data);
    const fetchInvoices = (params) =>
        api.get("/invoices?" + params).then((r) => r.data);

    const { data: paymentData } = useQuery({
        queryKey: ["payment", paymentId],
        queryFn: async () => {
            const response = await api.get(`/payments/${paymentId}`);
            return response.data;
        },
        enabled: isEdit && !!paymentId && isOpen,
    });

    const initialValues = {
        supplier_id: "",
        customer_id: "",
        invoice_id: "",
        type: "payment",
        category: "supplier_payment",
        amount: "",
        payment_method: "bank_transfer",
        transaction_date: new Date().toISOString().split("T")[0],
        description: "",
        notes: "",
        reference_number: "",
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
                invoice_id: formValues.invoice_id || null,
                type: formValues.type,
                category: formValues.category,
                amount: parseFloat(formValues.amount || 0),
                payment_method: formValues.payment_method,
                transaction_date: formValues.transaction_date,
                description: formValues.description || null,
                notes: formValues.notes || null,
                reference_number: formValues.reference_number || null,
            };

            if (isEdit) {
                await api.put(`/payments/${paymentId}`, submitData);
                toast.success("Payment updated successfully");
            } else {
                await api.post("/payments", submitData);
                toast.success("Payment created successfully");
            }

            queryClient.invalidateQueries({ queryKey: ["payments"] });
            onClose();
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || "An error occurred";
            toast.error(
                isEdit
                    ? "Failed to update payment"
                    : "Failed to create payment",
                { description: errorMessage },
            );
            throw error;
        }
    });

    useEffect(() => {
        if (!isOpen) return;
        if (paymentData && isEdit) {
            setValues({
                supplier_id: paymentData.supplier_id || "",
                customer_id: paymentData.customer_id || "",
                invoice_id: paymentData.invoice_id || "",
                type: paymentData.type || "payment",
                category: paymentData.category || "supplier_payment",
                amount: paymentData.amount || "",
                payment_method: paymentData.payment_method || "bank_transfer",
                transaction_date: paymentData.transaction_date
                    ? paymentData.transaction_date.split("T")[0]
                    : new Date().toISOString().split("T")[0],
                description: paymentData.description || "",
                notes: paymentData.notes || "",
                reference_number: paymentData.reference_number || "",
            });
        }

        if (!paymentId && !isEdit) {
            setValues(initialValues);
        }
    }, [isOpen, paymentData, paymentId, isEdit, setValues]);

    useEffect(() => {
        if (!isOpen) return;
        if (values.category === "supplier_payment" && values.customer_id) {
            setValues((prev) => ({ ...prev, customer_id: "" }));
        }
        if (values.category === "customer_payment" && values.supplier_id) {
            setValues((prev) => ({ ...prev, supplier_id: "" }));
        }
    }, [isOpen, values.category]);

    if (isEdit && !hasPermission("edit payments")) return null;
    if (!isEdit && !hasPermission("create payments")) return null;

    const title = isEdit ? "Edit Payment" : "Create Payment";

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
                        Manage payment details.
                    </Dialog.Description>

                    <form
                        onSubmit={handleSubmit}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Transaction Number
                            </label>
                            <input
                                type="text"
                                value={
                                    isEdit
                                        ? paymentData?.transaction_number || ""
                                        : "Auto-generated"
                                }
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                            />
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
                                cacheKey="payment-modal-suppliers"
                                disabled={
                                    values.category === "customer_payment"
                                }
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
                                cacheKey="payment-modal-customers"
                                disabled={
                                    values.category === "supplier_payment"
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Invoice
                            </label>
                            <SearchableSelect
                                value={values.invoice_id || ""}
                                onChange={(v) =>
                                    handleChange({
                                        target: {
                                            name: "invoice_id",
                                            value: v || "",
                                        },
                                    })
                                }
                                fetchOptions={fetchInvoices}
                                displayValue={(inv) =>
                                    inv
                                        ? `${inv.invoice_number} - ${inv.supplier?.name || inv.customer?.name || "N/A"} (${inv.type})`
                                        : ""
                                }
                                placeholder="Select Invoice (Optional)"
                                cacheKey="payment-modal-invoices"
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
                                    { value: "payment", label: "Payment" },
                                    { value: "receipt", label: "Receipt" },
                                    { value: "refund", label: "Refund" },
                                    {
                                        value: "adjustment",
                                        label: "Adjustment",
                                    },
                                ]}
                                placeholder="Select type"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category <span className="text-red-500">*</span>
                            </label>
                            <SearchableSelect
                                value={values.category}
                                onChange={(v) =>
                                    handleChange({
                                        target: { name: "category", value: v },
                                    })
                                }
                                options={[
                                    {
                                        value: "supplier_payment",
                                        label: "Supplier Payment",
                                    },
                                    {
                                        value: "customer_payment",
                                        label: "Customer Payment",
                                    },
                                    { value: "salary", label: "Salary" },
                                    { value: "expense", label: "Expense" },
                                    { value: "income", label: "Income" },
                                    { value: "other", label: "Other" },
                                ]}
                                placeholder="Select category"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="amount"
                                value={values.amount}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Payment Method{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <SearchableSelect
                                value={values.payment_method}
                                onChange={(v) =>
                                    handleChange({
                                        target: {
                                            name: "payment_method",
                                            value: v,
                                        },
                                    })
                                }
                                options={[
                                    { value: "cash", label: "Cash" },
                                    {
                                        value: "bank_transfer",
                                        label: "Bank Transfer",
                                    },
                                    { value: "check", label: "Check" },
                                    {
                                        value: "credit_card",
                                        label: "Credit Card",
                                    },
                                    {
                                        value: "debit_card",
                                        label: "Debit Card",
                                    },
                                    { value: "other", label: "Other" },
                                ]}
                                placeholder="Select method"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Transaction Date{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="transaction_date"
                                value={values.transaction_date}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Reference Number
                            </label>
                            <input
                                type="text"
                                name="reference_number"
                                value={values.reference_number}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
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
                                placeholder="Payment description"
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
                                      ? "Update Payment"
                                      : "Create Payment"}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
