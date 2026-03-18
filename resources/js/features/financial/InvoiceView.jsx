import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import api from "../../utils/api";
import PageHeader from "../../components/PageHeader";
import { formatCurrency, formatDate } from "../../utils/formatters";
import SearchableSelect from "../../components/SearchableSelect";
import {
    Banknote,
    Building2,
    Calendar,
    ClipboardList,
    Download,
    Hash,
    Package,
    Plus,
    Save,
    Trash2,
    User,
} from "lucide-react";
import { generateInvoicePdf } from "../../utils/invoicePdf";

function Badge({ children, className }) {
    return (
        <span className={`px-2 py-1 text-xs rounded-full ${className}`}>
            {children}
        </span>
    );
}

function getStatusColor(status) {
    const colors = {
        draft: "bg-gray-100 text-gray-800",
        sent: "bg-blue-100 text-blue-800",
        paid: "bg-green-100 text-green-800",
        overdue: "bg-red-100 text-red-800",
        cancelled: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
}

function getTypeColor(type) {
    return type === "income"
        ? "bg-green-100 text-green-800"
        : "bg-red-100 text-red-800";
}

export default function InvoiceView() {
    const { id } = useParams();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    const {
        data: invoice,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["invoice", id],
        queryFn: async () => {
            const res = await api.get(`/invoices/${id}`);
            return res.data;
        },
        enabled: !!id,
    });

    const {
        data: invoiceSettings,
        error: invoiceSettingsError,
    } = useQuery({
        queryKey: ["settings", "invoice-data"],
        queryFn: async () => {
            const res = await api.get("/settings/invoice-data");
            return res.data;
        },
    });

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-800 rounded">
                {t("invoices.view.errors.loadFailed")}: {error.message}
            </div>
        );
    }

    const items = invoice?.items ?? [];
    const isDraft = (invoice?.status || "").toLowerCase() === "draft";
    const isIncome = (invoice?.type || "").toLowerCase() === "income";
    const isExpense = (invoice?.type || "").toLowerCase() === "expense";

    const company = invoiceSettings?.company ?? {};
    const companyConfigured = Boolean(
        company?.name ||
            company?.cui ||
            company?.address ||
            company?.phone ||
            company?.email ||
            company?.bank ||
            company?.iban,
    );
    const companyPartner = {
        company_name: company?.name || t("invoices.view.companyNotConfigured"),
        name: company?.name || t("invoices.view.companyNotConfigured"),
        tax_number: company?.cui || "",
        phone: company?.phone || "",
        email: company?.email || "",
        billing_address: company?.address || "",
        billing_city: [company?.city, company?.county]
            .filter(Boolean)
            .join(", "),
        billing_country: "RO",
        registration_number: "",
        contact_person: "",
        bank_name: company?.bank || "",
        bank_iban: company?.iban || "",
    };

    const customerPartner = isIncome ? invoice?.customer : companyPartner;
    const supplierPartner = isExpense ? invoice?.supplier : companyPartner;

    const customerMissing = isIncome ? !invoice?.customer_id : false;
    const supplierMissing = isExpense ? !invoice?.supplier_id : false;

    const STATUS_OPTIONS = [
        { value: "draft", label: t("invoices.status.draft") },
        { value: "sent", label: t("invoices.status.sent") },
        { value: "paid", label: t("invoices.status.paid") },
        { value: "overdue", label: t("invoices.status.overdue") },
        { value: "cancelled", label: t("invoices.status.cancelled") },
    ];

    const fetchProducts = (params) =>
        api.get("/products?" + params).then((r) => r.data);

    const fetchCustomers = (params) =>
        api.get("/customers?" + params).then((r) => r.data);

    const fetchSuppliers = (params) =>
        api.get("/suppliers?" + params).then((r) => r.data);

    const [editItems, setEditItems] = useState([]);
    const [showCustomerSelect, setShowCustomerSelect] = useState(false);
    const [showSupplierSelect, setShowSupplierSelect] = useState(false);

    useEffect(() => {
        if (!invoice?.id) return;
        setEditItems(
            (items || []).map((it) => ({
                item_type:
                    it.item_type || (it.product_id ? "product" : "service"),
                product_id: it.product_id ? String(it.product_id) : "",
                product: it.product || null,
                name: it.name || it.product?.name || "",
                sku: it.sku || it.product?.sku || "",
                description: it.description || "",
                quantity: String(it.quantity ?? 1),
                unit_price: String(it.unit_price ?? 0),
                tax_rate: String(it.tax_rate ?? 0),
                discount_rate: String(it.discount_rate ?? 0),
            })),
        );
    }, [invoice?.id, items]);

    const addItemRow = (type = "product") => {
        setEditItems((prev) => [
            ...prev,
            {
                item_type: type,
                product_id: "",
                product: null,
                name: "",
                sku: "",
                description: "",
                quantity: "1",
                unit_price: "0",
                tax_rate: "0",
                discount_rate: "0",
            },
        ]);
    };

    const removeItemRow = (index) => {
        setEditItems((prev) => prev.filter((_, i) => i !== index));
    };

    const updateItemRow = (index, field, value) => {
        setEditItems((prev) => {
            const next = [...prev];
            if (!next[index]) return prev;
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const setItemProduct = (index, productId, product) => {
        setEditItems((prev) => {
            const next = [...prev];
            if (!next[index]) return prev;
            next[index] = {
                ...next[index],
                item_type: "product",
                product_id: productId != null ? String(productId) : "",
                product: product || null,
                name: product?.name || next[index].name,
                sku: product?.sku || next[index].sku,
                description: product?.description || next[index].description,
                unit_price:
                    product?.price != null
                        ? String(product.price)
                        : next[index].unit_price,
            };
            return next;
        });
    };

    const computed = useMemo(() => {
        const lines = editItems.map((row) => {
            const qty = parseFloat(row.quantity) || 0;
            const price = parseFloat(row.unit_price) || 0;
            const taxRate = parseFloat(row.tax_rate) || 0;
            const discountRate = parseFloat(row.discount_rate) || 0;
            const base = qty * price;
            const discount = base * (discountRate / 100);
            const subtotal = Math.max(0, base - discount);
            const tax = subtotal * (taxRate / 100);
            const total = subtotal + tax;
            return { subtotal, tax, total };
        });
        const subtotal = lines.reduce((acc, l) => acc + l.subtotal, 0);
        const tax = lines.reduce((acc, l) => acc + l.tax, 0);
        const total = lines.reduce((acc, l) => acc + l.total, 0);
        return { lines, subtotal, tax, total };
    }, [editItems]);

    const updateInvoiceStatusMutation = useMutation({
        mutationFn: async (status) => {
            const res = await api.put(`/invoices/${id}`, { status });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoice", id] });
            toast.success(t("invoices.view.toast.statusUpdated"));
        },
        onError: (e) => {
            toast.error(
                e.response?.data?.message || t("invoices.view.toast.statusUpdateFailed"),
            );
        },
    });

    const updateCustomerMutation = useMutation({
        mutationFn: async (customerId) => {
            const res = await api.put(`/invoices/${id}`, {
                customer_id: customerId || null,
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoice", id] });
            toast.success(t("invoices.view.toast.customerUpdated"));
            setShowCustomerSelect(false);
        },
        onError: (e) => {
            toast.error(
                e.response?.data?.message || t("invoices.view.toast.customerUpdateFailed"),
            );
        },
    });

    const updateSupplierMutation = useMutation({
        mutationFn: async (supplierId) => {
            const res = await api.put(`/invoices/${id}`, {
                supplier_id: supplierId || null,
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoice", id] });
            toast.success(t("invoices.view.toast.supplierUpdated"));
            setShowSupplierSelect(false);
        },
        onError: (e) => {
            toast.error(
                e.response?.data?.message || t("invoices.view.toast.supplierUpdateFailed"),
            );
        },
    });

    const saveItemsMutation = useMutation({
        mutationFn: async () => {
            const payloadItems = editItems
                .filter((row) => {
                    const qty = parseFloat(row.quantity);
                    const price = parseFloat(row.unit_price);
                    if (!Number.isFinite(qty) || qty <= 0) return false;
                    if (!Number.isFinite(price) || price < 0) return false;
                    if (row.item_type === "product") return !!row.product_id;
                    return !!row.name?.trim();
                })
                .map((row) => ({
                    item_type: row.item_type,
                    product_id:
                        row.item_type === "product" && row.product_id
                            ? Number(row.product_id)
                            : null,
                    name: row.name || null,
                    sku: row.sku || null,
                    description: row.description || null,
                    quantity: Number(row.quantity),
                    unit_price: Number(row.unit_price),
                    tax_rate: Number(row.tax_rate || 0),
                    discount_rate: Number(row.discount_rate || 0),
                }));

            const res = await api.put(`/invoices/${id}`, {
                items: payloadItems,
                subtotal: computed.subtotal,
                tax_amount: computed.tax,
                total_amount: computed.total,
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoice", id] });
            toast.success(t("invoices.view.toast.itemsUpdated"));
        },
        onError: (e) => {
            toast.error(
                e.response?.data?.message || t("invoices.view.toast.itemsUpdateFailed"),
            );
        },
    });

    const handleDownload = async () => {
        if (!invoice?.id) return;
        try {
            await generateInvoicePdf({
                invoice,
                items: invoice?.items ?? [],
                company: invoiceSettings?.company ?? {},
                logoUrl: invoiceSettings?.logo_url ?? null,
            });
        } catch (e) {
            toast.error(t("invoices.view.toast.pdfFailed"));
        }
    };

    return (
        <div>
            <PageHeader
                title={
                    invoice?.invoice_number
                        ? t("invoices.view.titleWithNumber", {
                              number: invoice.invoice_number,
                          })
                        : t("invoices.view.title")
                }
                actions={
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                        disabled={!invoice?.id}
                    >
                        <Download className="w-4 h-4" />
                        {t("invoices.view.actions.download")}
                    </button>
                }
            />

            <div className={"grid grid-cols-1 gap-6"}>
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white shadow-md rounded-lg p-6">
                        {isLoading ? (
                            <div className="text-gray-500">
                                {t("invoices.view.loading")}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex flex-wrap items-center gap-2">
                                    {invoice?.type && (
                                        <Badge
                                            className={getTypeColor(
                                                invoice.type,
                                            )}
                                        >
                                            {t(`invoices.type.${String(invoice.type).toLowerCase()}`, {
                                                defaultValue: String(invoice.type).toUpperCase(),
                                            })}
                                        </Badge>
                                    )}
                                    {invoice?.status && (
                                        <Badge
                                            className={getStatusColor(
                                                invoice.status,
                                            )}
                                        >
                                            {t(`invoices.status.${String(invoice.status).toLowerCase()}`, {
                                                defaultValue: String(invoice.status).toUpperCase(),
                                            })}
                                        </Badge>
                                    )}
                                    {!isDraft && (
                                        <span className="text-xs text-gray-500">
                                            {t("invoices.view.locked")}
                                        </span>
                                    )}
                                </div>

                                <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-violet-500" />
                                    {t("invoices.view.details.title")}
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                                            <Hash className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                            {t("invoices.view.details.invoiceNumber")}
                                        </div>
                                        <div className="text-gray-900 font-medium">
                                            {invoice?.invoice_number ?? "-"}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                                            <ClipboardList className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                            {t("invoices.view.details.status")}
                                        </div>
                                        <div className="mt-1 max-w-[200px]">
                                            <SearchableSelect
                                                value={invoice?.status ?? ""}
                                                onChange={(newStatus) => {
                                                    if (
                                                        newStatus &&
                                                        invoice?.id
                                                    ) {
                                                        updateInvoiceStatusMutation.mutate(
                                                            newStatus,
                                                        );
                                                    }
                                                }}
                                                options={STATUS_OPTIONS}
                                                placeholder={t("invoices.view.placeholders.status")}
                                                cacheKey="invoice-view-status"
                                                disabled={
                                                    updateInvoiceStatusMutation.isPending
                                                }
                                                className="min-h-[38px] text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                                            <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                            {t("invoices.view.details.issueDate")}
                                        </div>
                                        <div className="text-gray-900">
                                            {invoice?.issue_date
                                                ? formatDate(invoice.issue_date)
                                                : "-"}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                                            <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                            {t("invoices.view.details.total")}
                                        </div>
                                        <div className="text-gray-900 font-semibold">
                                            {formatCurrency(
                                                invoice?.total_amount,
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {(invoice?.description || invoice?.notes) && (
                                    <div className="mt-4 pt-4 border-t space-y-3">
                                        {invoice?.description && (
                                            <div>
                                                <div className="text-sm text-gray-500">
                                                    {t("invoices.view.details.description")}
                                                </div>
                                                <div className="text-gray-900 whitespace-pre-wrap">
                                                    {invoice.description}
                                                </div>
                                            </div>
                                        )}
                                        {invoice?.notes && (
                                            <div>
                                                <div className="text-sm text-gray-500">
                                                    {t("invoices.view.details.notes")}
                                                </div>
                                                <div className="text-gray-900 whitespace-pre-wrap">
                                                    {invoice.notes}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-slate-600" />
                                {t("invoices.view.customer.title")}
                            </h2>

                            {isLoading ? (
                                <div className="text-gray-500">
                                    {t("common.loading")}
                                </div>
                            ) : isIncome && customerMissing && isDraft ? (
                                <div className="max-w-xl">
                                    <div className="text-sm text-gray-600 mb-2">
                                        {t("invoices.view.customer.selectHint")}
                                    </div>
                                    <SearchableSelect
                                        value=""
                                        onChange={(val) => {
                                            if (!val) return;
                                            updateCustomerMutation.mutate(
                                                Number(val),
                                            );
                                        }}
                                        fetchOptions={fetchCustomers}
                                        displayValue={(p) =>
                                            p?.company_name || p?.name || ""
                                        }
                                        placeholder={t("invoices.view.customer.placeholders.select")}
                                        cacheKey="invoice-view-customer"
                                        disabled={
                                            updateCustomerMutation.isPending
                                        }
                                    />
                                </div>
                            ) : (
                                <>
                                    {!isIncome && invoiceSettingsError && (
                                        <div className="mb-4 p-3 rounded bg-yellow-50 text-yellow-800 text-sm">
                                            {t("invoices.view.company.loadFailed")}
                                        </div>
                                    )}
                                    {!isIncome && !invoiceSettingsError && !companyConfigured && (
                                        <div className="mb-4 p-3 rounded bg-yellow-50 text-yellow-800 text-sm">
                                            {t("invoices.view.company.notConfiguredHint")}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-gray-500">
                                                {t("invoices.view.partner.name")}
                                            </div>
                                            <div className="font-medium text-gray-900">
                                                {customerPartner?.company_name ||
                                                    customerPartner?.name ||
                                                    "—"}
                                            </div>
                                            <div className="text-gray-700">
                                                {customerPartner?.email || "—"}
                                            </div>
                                            <div className="text-gray-700">
                                                {customerPartner?.phone || "—"}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500">
                                                {t("invoices.view.partner.company")}
                                            </div>
                                            <div className="text-gray-700">
                                                {t("invoices.view.partner.taxId")}{" "}
                                                {customerPartner?.tax_number ||
                                                    "—"}
                                            </div>
                                            <div className="text-gray-700">
                                                {t("invoices.view.partner.registration")}{" "}
                                                {customerPartner?.registration_number ||
                                                    "—"}
                                            </div>
                                            <div className="text-gray-700">
                                                {t("invoices.view.partner.contact")}{" "}
                                                {customerPartner?.contact_person ||
                                                    "—"}
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <div className="text-gray-500">
                                                {t("invoices.view.partner.billingAddress")}
                                            </div>
                                            <div className="text-gray-900">
                                                {[
                                                    customerPartner?.billing_address,
                                                    [
                                                        customerPartner?.billing_postcode,
                                                        customerPartner?.billing_city,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" "),
                                                    customerPartner?.billing_country,
                                                ]
                                                    .filter(Boolean)
                                                    .join(", ") || "—"}
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <div className="text-gray-500">
                                                {t("invoices.view.partner.bank")}
                                            </div>
                                            <div className="text-gray-900">
                                                {[
                                                    customerPartner?.bank_name,
                                                    customerPartner?.bank_iban,
                                                ]
                                                    .filter(Boolean)
                                                    .join(" • ") || "—"}
                                            </div>
                                        </div>
                                    </div>

                                    {isIncome && isDraft && (
                                        <div className="mt-4 pt-4 border-t">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowCustomerSelect(
                                                        (v) => !v,
                                                    )
                                                }
                                                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
                                            >
                                                <Building2 className="w-4 h-4 text-indigo-500" />
                                                {showCustomerSelect
                                                    ? t("common.cancel")
                                                    : t("invoices.view.customer.change")}
                                            </button>
                                            {showCustomerSelect && (
                                                <div className="mt-3 max-w-xl">
                                                    <SearchableSelect
                                                        value=""
                                                        onChange={(val) => {
                                                            if (!val) return;
                                                            updateCustomerMutation.mutate(
                                                                Number(val),
                                                            );
                                                        }}
                                                        fetchOptions={
                                                            fetchCustomers
                                                        }
                                                        displayValue={(p) =>
                                                            p?.company_name ||
                                                            p?.name ||
                                                            ""
                                                        }
                                                        placeholder={t("invoices.view.customer.placeholders.select")}
                                                        cacheKey="invoice-view-customer-change"
                                                        disabled={
                                                            updateCustomerMutation.isPending
                                                        }
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="bg-white shadow-md rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-slate-600" />
                                {t("invoices.view.supplier.title")}
                            </h2>

                            {isLoading ? (
                                <div className="text-gray-500">
                                    {t("common.loading")}
                                </div>
                            ) : isExpense && supplierMissing && isDraft ? (
                                <div className="max-w-xl">
                                    <div className="text-sm text-gray-600 mb-2">
                                        {t("invoices.view.supplier.selectHint")}
                                    </div>
                                    <SearchableSelect
                                        value=""
                                        onChange={(val) => {
                                            if (!val) return;
                                            updateSupplierMutation.mutate(
                                                Number(val),
                                            );
                                        }}
                                        fetchOptions={fetchSuppliers}
                                        displayValue={(p) =>
                                            p?.company_name || p?.name || ""
                                        }
                                        placeholder={t("invoices.view.supplier.placeholders.select")}
                                        cacheKey="invoice-view-supplier"
                                        disabled={
                                            updateSupplierMutation.isPending
                                        }
                                    />
                                </div>
                            ) : (
                                <>
                                    {!isExpense && invoiceSettingsError && (
                                        <div className="mb-4 p-3 rounded bg-yellow-50 text-yellow-800 text-sm">
                                            {t("invoices.view.company.loadFailed")}
                                        </div>
                                    )}
                                    {!isExpense && !invoiceSettingsError && !companyConfigured && (
                                        <div className="mb-4 p-3 rounded bg-yellow-50 text-yellow-800 text-sm">
                                            {t("invoices.view.company.notConfiguredHint")}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-gray-500">
                                                {t("invoices.view.partner.name")}
                                            </div>
                                            <div className="font-medium text-gray-900">
                                                {supplierPartner?.company_name ||
                                                    supplierPartner?.name ||
                                                    "—"}
                                            </div>
                                            <div className="text-gray-700">
                                                {supplierPartner?.email || "—"}
                                            </div>
                                            <div className="text-gray-700">
                                                {supplierPartner?.phone || "—"}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500">
                                                {t("invoices.view.partner.company")}
                                            </div>
                                            <div className="text-gray-700">
                                                {t("invoices.view.partner.taxId")}{" "}
                                                {supplierPartner?.tax_number ||
                                                    "—"}
                                            </div>
                                            <div className="text-gray-700">
                                                {t("invoices.view.partner.registration")}{" "}
                                                {supplierPartner?.registration_number ||
                                                    "—"}
                                            </div>
                                            <div className="text-gray-700">
                                                {t("invoices.view.partner.contact")}{" "}
                                                {supplierPartner?.contact_person ||
                                                    "—"}
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <div className="text-gray-500">
                                                {t("invoices.view.partner.billingAddress")}
                                            </div>
                                            <div className="text-gray-900">
                                                {[
                                                    supplierPartner?.billing_address,
                                                    [
                                                        supplierPartner?.billing_postcode,
                                                        supplierPartner?.billing_city,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" "),
                                                    supplierPartner?.billing_country,
                                                ]
                                                    .filter(Boolean)
                                                    .join(", ") || "—"}
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <div className="text-gray-500">
                                                {t("invoices.view.partner.bank")}
                                            </div>
                                            <div className="text-gray-900">
                                                {[
                                                    supplierPartner?.bank_name,
                                                    supplierPartner?.bank_iban,
                                                ]
                                                    .filter(Boolean)
                                                    .join(" • ") || "—"}
                                            </div>
                                        </div>
                                    </div>

                                    {isExpense && isDraft && (
                                        <div className="mt-4 pt-4 border-t">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowSupplierSelect(
                                                        (v) => !v,
                                                    )
                                                }
                                                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
                                            >
                                                <Building2 className="w-4 h-4 text-indigo-500" />
                                                {showSupplierSelect
                                                    ? t("common.cancel")
                                                    : t("invoices.view.supplier.change")}
                                            </button>
                                            {showSupplierSelect && (
                                                <div className="mt-3 max-w-xl">
                                                    <SearchableSelect
                                                        value=""
                                                        onChange={(val) => {
                                                            if (!val) return;
                                                            updateSupplierMutation.mutate(
                                                                Number(val),
                                                            );
                                                        }}
                                                        fetchOptions={
                                                            fetchSuppliers
                                                        }
                                                        displayValue={(p) =>
                                                            p?.company_name ||
                                                            p?.name ||
                                                            ""
                                                        }
                                                        placeholder={t("invoices.view.supplier.placeholders.select")}
                                                        cacheKey="invoice-view-supplier-change"
                                                        disabled={
                                                            updateSupplierMutation.isPending
                                                        }
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {!isLoading && (
                <div className="mt-6 bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="p-6 border-b">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-lg font-semibold flex items-center gap-2">
                                    <Package className="w-5 h-5 text-indigo-500" />
                                    {t("invoices.view.items.title")}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {isDraft
                                        ? t("invoices.view.items.editableHint")
                                        : t("invoices.view.items.lockedHint")}
                                </div>
                            </div>
                            {isDraft && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => addItemRow("product")}
                                        className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
                                    >
                                        <Plus className="w-4 h-4" />
                                        {t("invoices.view.items.addProduct")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => addItemRow("service")}
                                        className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
                                    >
                                        <Plus className="w-4 h-4" />
                                        {t("invoices.view.items.addService")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            saveItemsMutation.mutate()
                                        }
                                        disabled={saveItemsMutation.isPending}
                                        className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md text-white disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" />
                                        {t("invoices.view.items.save")}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t("invoices.view.items.table.item")}
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t("invoices.view.items.table.qty")}
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t("invoices.view.items.table.price")}
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t("invoices.view.items.table.total")}
                                    </th>
                                    {isDraft && (
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {t("invoices.view.items.table.actions")}
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isDraft ? (
                                    editItems.map((row, index) => {
                                        const line = computed.lines[index] || {
                                            total: 0,
                                        };
                                        return (
                                            <tr key={index}>
                                                <td className="px-6 py-3 text-sm text-gray-900 align-top">
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        <SearchableSelect
                                                            value={
                                                                row.item_type
                                                            }
                                                            onChange={(v) =>
                                                                updateItemRow(
                                                                    index,
                                                                    "item_type",
                                                                    v,
                                                                )
                                                            }
                                                            options={[
                                                                {
                                                                    value: "product",
                                                                    label: t("invoices.view.items.type.product"),
                                                                },
                                                                {
                                                                    value: "service",
                                                                    label: t("invoices.view.items.type.service"),
                                                                },
                                                            ]}
                                                            placeholder={t("invoices.view.items.placeholders.type")}
                                                            className="min-w-[140px]"
                                                        />
                                                        {row.item_type ===
                                                        "product" ? (
                                                            <SearchableSelect
                                                                value={
                                                                    row.product_id
                                                                }
                                                                onChange={(
                                                                    val,
                                                                    opt,
                                                                ) =>
                                                                    setItemProduct(
                                                                        index,
                                                                        val,
                                                                        opt,
                                                                    )
                                                                }
                                                                fetchOptions={
                                                                    fetchProducts
                                                                }
                                                                displayValue={(
                                                                    p,
                                                                ) =>
                                                                    `${p?.sku ? `${p.sku} - ` : ""}${p?.name || ""}`
                                                                }
                                                                searchParam="search"
                                                                placeholder={t("invoices.view.items.placeholders.selectProduct")}
                                                                cacheKey="invoice-view-products"
                                                                className="min-w-[220px] text-sm"
                                                            />
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={row.name}
                                                                onChange={(e) =>
                                                                    updateItemRow(
                                                                        index,
                                                                        "name",
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="px-2 py-1.5 border border-gray-300 rounded text-sm min-w-[220px]"
                                                                placeholder={t("invoices.view.items.placeholders.serviceName")}
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        <input
                                                            type="text"
                                                            value={
                                                                row.description
                                                            }
                                                            onChange={(e) =>
                                                                updateItemRow(
                                                                    index,
                                                                    "description",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                            placeholder={t("invoices.view.items.placeholders.descriptionOptional")}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-700 text-right align-top">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step="0.001"
                                                        value={row.quantity}
                                                        onChange={(e) =>
                                                            updateItemRow(
                                                                index,
                                                                "quantity",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-24 text-right px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                    />
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-700 text-right align-top">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        value={row.unit_price}
                                                        onChange={(e) =>
                                                            updateItemRow(
                                                                index,
                                                                "unit_price",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-28 text-right px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                    />
                                                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                                                        <div>
                                                            <div className="text-gray-500">
                                                                {t("invoices.view.items.taxPercent")}
                                                            </div>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={100}
                                                                step="0.01"
                                                                value={
                                                                    row.tax_rate
                                                                }
                                                                onChange={(e) =>
                                                                    updateItemRow(
                                                                        index,
                                                                        "tax_rate",
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="w-full text-right px-2 py-1 border border-gray-300 rounded"
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-500">
                                                                Disc %
                                                            </div>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={100}
                                                                step="0.01"
                                                                value={
                                                                    row.discount_rate
                                                                }
                                                                onChange={(e) =>
                                                                    updateItemRow(
                                                                        index,
                                                                        "discount_rate",
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="w-full text-right px-2 py-1 border border-gray-300 rounded"
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-900 font-medium text-right align-top whitespace-nowrap">
                                                    {formatCurrency(line.total)}
                                                </td>
                                                <td className="px-6 py-3 text-right align-top">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeItemRow(index)
                                                        }
                                                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                                                            title={t("invoices.view.items.actions.remove")}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : Array.isArray(items) && items.length > 0 ? (
                                    items.map((it, idx) => {
                                        const name =
                                            it?.product?.name ||
                                            it?.product_name ||
                                            it?.name ||
                                            it?.description ||
                                            `Item ${idx + 1}`;
                                        const qty =
                                            it?.qty ?? it?.quantity ?? "";
                                        const price =
                                            it?.price ??
                                            it?.unit_price ??
                                            it?.unitPrice ??
                                            null;
                                        const total =
                                            it?.line_total ??
                                            it?.total ??
                                            it?.amount ??
                                            null;
                                        return (
                                            <tr key={it?.id ?? idx}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="font-medium">
                                                        {name}
                                                    </div>
                                                    {(it?.sku ||
                                                        it?.product?.sku) && (
                                                        <div className="text-xs text-gray-500">
                                                            SKU:{" "}
                                                            {it?.sku ||
                                                                it?.product
                                                                    ?.sku}
                                                        </div>
                                                    )}
                                                    {it?.item_type && (
                                                        <div className="text-xs text-gray-500">
                                                            Type:{" "}
                                                            {String(
                                                                it.item_type,
                                                            ).toUpperCase()}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                                                    {qty}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                                                    {price != null
                                                        ? formatCurrency(price)
                                                        : ""}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">
                                                    {total != null
                                                        ? formatCurrency(total)
                                                        : ""}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={isDraft ? 5 : 4}
                                            className="px-6 py-6 text-sm text-gray-500 text-center"
                                        >
                                            {t("invoices.view.items.empty")}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {isDraft && (
                        <div className="p-6 border-t flex items-center justify-end gap-6 text-sm text-gray-700">
                            <div>
                                <span className="text-gray-500">
                                    {t("invoices.view.items.summary.subtotal")}:
                                </span>{" "}
                                <span className="font-semibold">
                                    {formatCurrency(computed.subtotal)}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">
                                    {t("invoices.view.items.summary.tax")}:
                                </span>{" "}
                                <span className="font-semibold">
                                    {formatCurrency(computed.tax)}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">
                                    {t("invoices.view.items.summary.total")}:
                                </span>{" "}
                                <span className="font-semibold">
                                    {formatCurrency(computed.total)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
