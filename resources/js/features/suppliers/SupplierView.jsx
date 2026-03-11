import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../utils/api";
import { formatCurrency, formatDate } from "../../utils/formatters";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import { Building2, Mail, Phone, MapPin, User } from "lucide-react";

export default function SupplierView() {
    const { id } = useParams();
    const supplierId = id;

    const {
        data: supplier,
        isLoading: loadingSupplier,
        error: supplierError,
    } = useQuery({
        queryKey: ["supplier", supplierId],
        queryFn: async () => {
            const res = await api.get(`/suppliers/${supplierId}`);
            return res.data;
        },
        enabled: !!supplierId,
    });

    const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
        queryKey: ["invoices", "by-supplier", supplierId],
        queryFn: async () => {
            const params = new URLSearchParams({
                supplier_id: supplierId,
                per_page: "100",
            });
            const res = await api.get(`/invoices?${params.toString()}`);
            return res.data;
        },
        enabled: !!supplierId,
    });

    const { data: productsData, isLoading: loadingProducts } = useQuery({
        queryKey: ["products", "by-supplier", supplierId],
        queryFn: async () => {
            const params = new URLSearchParams({
                supplier_id: supplierId,
            });
            const res = await api.get(`/products?${params.toString()}`);
            return res.data;
        },
        enabled: !!supplierId,
    });

    const invoices = invoicesData?.data || [];
    const products = productsData?.data || [];

    const invoiceCount = invoices.length;
    const totalInvoiced = invoices.reduce(
        (sum, inv) => sum + (Number(inv.total_amount ?? 0) || 0),
        0,
    );
    const outstandingAmount = invoices
        .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled")
        .reduce((sum, inv) => sum + (Number(inv.total_amount ?? 0) || 0), 0);
    const overdueCount = invoices.filter((inv) => {
        if (!inv.due_date) return false;
        const due = new Date(inv.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return (
            due < today && inv.status !== "paid" && inv.status !== "cancelled"
        );
    }).length;

    if (supplierError) {
        return (
            <div className="p-4 bg-red-50 text-red-800 rounded">
                Failed to load supplier: {supplierError.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader title={supplier?.name || "Supplier details"} />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                {loadingSupplier ? (
                    <div className="text-gray-500">Loading supplier...</div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                                <Building2 className="w-5 h-5" />
                            </span>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Company details
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Core information about this supplier.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-4 gap-y-6 mt-4">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <User className="w-4 h-4 text-blue-500 mt-1" />
                                    <div>
                                        <div className="text-xs font-medium text-gray-500">
                                            Name / Company
                                        </div>
                                        <div className="text-sm text-gray-900">
                                            {supplier?.company_name ||
                                                supplier?.name ||
                                                "-"}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <User className="w-4 h-4 text-purple-500 mt-1" />
                                    <div>
                                        <div className="text-xs font-medium text-gray-500">
                                            Contact person
                                        </div>
                                        <div className="text-sm text-gray-900">
                                            {supplier?.contact_person || "-"}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Mail className="w-4 h-4 text-emerald-500 mt-1" />
                                    <div>
                                        <div className="text-xs font-medium text-gray-500">
                                            Email
                                        </div>
                                        <div className="text-sm text-gray-900">
                                            {supplier?.email || "-"}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Phone className="w-4 h-4 text-orange-500 mt-1" />
                                    <div>
                                        <div className="text-xs font-medium text-gray-500">
                                            Main phone
                                        </div>
                                        <div className="text-sm text-gray-900">
                                            {supplier?.phone || "-"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-4 h-4 text-blue-500 mt-1" />
                                    <div className="flex-1">
                                        <div className="text-xs font-medium text-gray-500">
                                            Billing address
                                        </div>
                                        <div className="text-sm text-gray-900 whitespace-pre-line">
                                            {supplier?.billing_address || "-"}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {[
                                                supplier?.billing_postcode,
                                                supplier?.billing_city,
                                                supplier?.billing_country,
                                            ]
                                                .filter(Boolean)
                                                .join(", ") || ""}
                                        </div>

                                        <div className="text-xs text-gray-600 mt-1">
                                            <span className="font-medium">
                                                Phone:
                                            </span>{" "}
                                            {supplier?.billing_phone || "-"}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <MapPin className="w-4 h-4 text-green-500 mt-1" />
                                    <div className="flex-1">
                                        <div className="text-xs font-medium text-gray-500">
                                            Shipping address
                                        </div>
                                        <div className="text-sm text-gray-900 whitespace-pre-line">
                                            {supplier?.shipping_address || "-"}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {[
                                                supplier?.shipping_postcode,
                                                supplier?.shipping_city,
                                                supplier?.shipping_country,
                                            ]
                                                .filter(Boolean)
                                                .join(", ") || ""}
                                        </div>

                                        <div className="text-xs text-gray-600 mt-1">
                                            <span className="font-medium">
                                                Phone:
                                            </span>{" "}
                                            {supplier?.shipping_phone || "-"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-start gap-3">
                                    <Building2 className="w-4 h-4 text-amber-500 mt-1" />
                                    <div>
                                        <div className="text-xs font-medium text-gray-500">
                                            Tax / Registration
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                Tax:
                                            </span>{" "}
                                            {supplier?.tax_number || "-"}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                Reg:
                                            </span>{" "}
                                            {supplier?.registration_number ||
                                                "-"}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Building2 className="w-4 h-4 text-cyan-600 mt-1" />
                                    <div>
                                        <div className="text-xs font-medium text-gray-500">
                                            Banking
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                Bank:
                                            </span>{" "}
                                            {supplier?.bank_name || "-"}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                IBAN:
                                            </span>{" "}
                                            {supplier?.bank_iban || "-"}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                SWIFT:
                                            </span>{" "}
                                            {supplier?.bank_swift || "-"}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <User className="w-4 h-4 text-indigo-600 mt-1" />
                                    <div>
                                        <div className="text-xs font-medium text-gray-500">
                                            Payment terms
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                Days:
                                            </span>{" "}
                                            {supplier?.payment_terms_days ??
                                                "-"}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                Credit limit:
                                            </span>{" "}
                                            {supplier?.credit_limit != null
                                                ? formatCurrency(
                                                      supplier.credit_limit,
                                                  )
                                                : "-"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-slate-50">
                        <div className="text-xs font-semibold uppercase text-slate-500">
                            Supplier ID
                        </div>
                        <div className="mt-1 text-slate-900">
                            {supplier?.id ?? "-"}
                        </div>
                        <div className="text-xs text-slate-500">
                            Created:{" "}
                            {supplier?.created_at
                                ? formatDate(supplier.created_at)
                                : "-"}
                        </div>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50">
                        <div className="text-xs font-semibold uppercase text-blue-600">
                            Invoices
                        </div>
                        <div className="mt-1 text-blue-900 font-semibold">
                            {invoiceCount}
                        </div>
                        <div className="text-xs text-blue-700">
                            Total: {formatCurrency(totalInvoiced)}
                        </div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50">
                        <div className="text-xs font-semibold uppercase text-amber-600">
                            Outstanding
                        </div>
                        <div className="mt-1 text-amber-900 font-semibold">
                            {formatCurrency(outstandingAmount)}
                        </div>
                        <div className="text-xs text-amber-700">
                            Overdue invoices: {overdueCount}
                        </div>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50">
                        <div className="text-xs font-semibold uppercase text-emerald-600">
                            Credit
                        </div>
                        <div className="mt-1 text-emerald-900 font-semibold">
                            Limit:{" "}
                            {supplier?.credit_limit != null
                                ? formatCurrency(supplier.credit_limit)
                                : "-"}
                        </div>
                        <div className="text-xs text-emerald-700">
                            Terms:{" "}
                            {supplier?.payment_terms_days != null
                                ? `${supplier.payment_terms_days} days`
                                : "-"}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white shadow-md rounded-lg p-4">
                    <h2 className="text-lg font-semibold mb-3">
                        Invoices from this supplier
                    </h2>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <DataTable
                            columns={[
                                {
                                    key: "invoice_number",
                                    label: "Invoice #",
                                },
                                {
                                    key: "issue_date",
                                    label: "Issue date",
                                    render: (v) => formatDate(v),
                                },
                                {
                                    key: "due_date",
                                    label: "Due date",
                                    render: (v) => (v ? formatDate(v) : "-"),
                                },
                                {
                                    key: "status",
                                    label: "Status",
                                },
                                {
                                    key: "total_amount",
                                    label: "Total",
                                    align: "right",
                                    render: (v) => formatCurrency(v),
                                },
                            ]}
                            data={invoices}
                            loading={loadingInvoices}
                            perPage={10}
                            pagination={null}
                            totalRecordName="invoices"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
