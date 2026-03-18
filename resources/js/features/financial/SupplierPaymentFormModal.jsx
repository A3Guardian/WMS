import React, { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();
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
                toast.success(t("payments.toast.updated"));
            } else {
                await api.post("/payments", submitData);
                toast.success(t("payments.toast.created"));
            }

            queryClient.invalidateQueries({ queryKey: ["payments"] });
            onClose();
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || t("common.genericError");
            toast.error(
                isEdit
                    ? t("payments.toast.updateFailed")
                    : t("payments.toast.createFailed"),
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

    const title = isEdit
        ? t("payments.modal.editTitle")
        : t("payments.modal.createTitle");

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
                        {t("payments.modal.description")}
                    </Dialog.Description>

                    <form
                        onSubmit={handleSubmit}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("payments.fields.transactionNumber")}
                            </label>
                            <input
                                type="text"
                                value={
                                    isEdit
                                        ? paymentData?.transaction_number || ""
                                        : t("payments.autoGenerated")
                                }
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("payments.fields.supplier")}
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
                                placeholder={t("payments.placeholders.selectSupplierOptional")}
                                cacheKey="payment-modal-suppliers"
                                disabled={
                                    values.category === "customer_payment"
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("payments.fields.customer")}
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
                                placeholder={t("payments.placeholders.selectCustomerOptional")}
                                cacheKey="payment-modal-customers"
                                disabled={
                                    values.category === "supplier_payment"
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("payments.fields.invoice")}
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
                                placeholder={t("payments.placeholders.selectInvoiceOptional")}
                                cacheKey="payment-modal-invoices"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("payments.fields.type")}{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <SearchableSelect
                                value={values.type}
                                onChange={(v) =>
                                    handleChange({
                                        target: { name: "type", value: v },
                                    })
                                }
                                options={[
                                    {
                                        value: "payment",
                                        label: t("payments.type.payment"),
                                    },
                                    {
                                        value: "receipt",
                                        label: t("payments.type.receipt"),
                                    },
                                    { value: "refund", label: t("payments.type.refund") },
                                    {
                                        value: "adjustment",
                                        label: t("payments.type.adjustment"),
                                    },
                                ]}
                                placeholder={t("payments.placeholders.selectType")}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("payments.fields.category")}{" "}
                                <span className="text-red-500">*</span>
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
                                        label: t("payments.category.supplier_payment"),
                                    },
                                    {
                                        value: "customer_payment",
                                        label: t("payments.category.customer_payment"),
                                    },
                                    { value: "salary", label: t("payments.category.salary") },
                                    { value: "expense", label: t("payments.category.expense") },
                                    { value: "income", label: t("payments.category.income") },
                                    { value: "other", label: t("payments.category.other") },
                                ]}
                                placeholder={t("payments.placeholders.selectCategory")}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("payments.fields.amount")}{" "}
                                <span className="text-red-500">*</span>
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
                                {t("payments.fields.paymentMethod")}{" "}
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
                                    { value: "cash", label: t("payments.method.cash") },
                                    {
                                        value: "bank_transfer",
                                        label: t("payments.method.bank_transfer"),
                                    },
                                    { value: "check", label: t("payments.method.check") },
                                    {
                                        value: "credit_card",
                                        label: t("payments.method.credit_card"),
                                    },
                                    {
                                        value: "debit_card",
                                        label: t("payments.method.debit_card"),
                                    },
                                    { value: "other", label: t("payments.method.other") },
                                ]}
                                placeholder={t("payments.placeholders.selectMethod")}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("payments.fields.transactionDate")}{" "}
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
                                {t("payments.fields.referenceNumber")}
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
                                {t("payments.fields.description")}
                            </label>
                            <textarea
                                name="description"
                                value={values.description}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder={t("payments.placeholders.description")}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("payments.fields.notes")}
                            </label>
                            <textarea
                                name="notes"
                                value={values.notes}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder={t("payments.placeholders.notes")}
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
                                    {t("common.cancel")}
                                </button>
                            </Dialog.Close>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting
                                    ? t("common.saving")
                                    : isEdit
                                      ? t("payments.actions.update")
                                      : t("payments.actions.create")}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
