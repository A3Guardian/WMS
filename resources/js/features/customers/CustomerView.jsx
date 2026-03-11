import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../utils/api";
import { formatCurrency, formatDate } from "../../utils/formatters";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import { Building2, Mail, Phone, MapPin, User } from "lucide-react";

export default function CustomerView() {
    const { id } = useParams();
    const customerId = id;

    const {
        data: customer,
        isLoading: loadingCustomer,
        error: customerError,
    } = useQuery({
        queryKey: ["customer", customerId],
        queryFn: async () => {
            const res = await api.get(`/customers/${customerId}`);
            return res.data;
        },
        enabled: !!customerId,
    });

    const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
        queryKey: ["invoices", "by-customer", customerId],
        queryFn: async () => {
            const params = new URLSearchParams({
                customer_id: customerId,
                per_page: "100",
            });
            const res = await api.get(`/invoices?${params.toString()}`);
            return res.data;
        },
        enabled: !!customerId,
    });

    const { data: ordersData, isLoading: loadingOrders } = useQuery({
        queryKey: ["orders", "by-customer", customerId],
        queryFn: async () => {
            const params = new URLSearchParams({
                customer_id: customerId,
                per_page: "100",
            });
            const res = await api.get(`/orders?${params.toString()}`);
            return res.data;
        },
        enabled: !!customerId,
    });

    const invoices = invoicesData?.data || [];
    const orders = ordersData?.data || [];

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
    const ordersCount = orders.length;

    if (customerError) {
        return (
            <div className="p-4 bg-red-50 text-red-800 rounded">
                Failed to load customer: {customerError.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader title={customer?.name || "Customer details"} />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                {loadingCustomer ? (
                    <div className="text-gray-500">Loading customer...</div>
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
                                    Core information about this customer.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-4 gap-y-6">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <User className="w-4 h-4 text-blue-500 mt-1" />
                                    <div>
                                        <div className="text-xs font-medium text-gray-500">
                                            Name / Company
                                        </div>
                                        <div className="text-sm text-gray-900">
                                            {customer?.company_name ||
                                                customer?.name ||
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
                                            {customer?.contact_person || "-"}
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
                                            {customer?.email || "-"}
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
                                            {customer?.phone || "-"}
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
                                            {customer?.billing_address || "-"}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {[
                                                customer?.billing_postcode,
                                                customer?.billing_city,
                                                customer?.billing_country,
                                            ]
                                                .filter(Boolean)
                                                .join(", ") || ""}
                                        </div>

                                        <div className="text-xs text-gray-600 mt-1">
                                            <span className="font-medium">
                                                Phone:
                                            </span>{" "}
                                            {customer?.billing_phone || "-"}
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
                                            {customer?.shipping_address || "-"}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {[
                                                customer?.shipping_postcode,
                                                customer?.shipping_city,
                                                customer?.shipping_country,
                                            ]
                                                .filter(Boolean)
                                                .join(", ") || ""}
                                        </div>

                                        <div className="text-xs text-gray-600 mt-1">
                                            <span className="font-medium">
                                                Phone:
                                            </span>{" "}
                                            {customer?.shipping_phone || "-"}
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
                                            {customer?.tax_number || "-"}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                Reg:
                                            </span>{" "}
                                            {customer?.registration_number ||
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
                                            {customer?.bank_name || "-"}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                IBAN:
                                            </span>{" "}
                                            {customer?.bank_iban || "-"}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                SWIFT:
                                            </span>{" "}
                                            {customer?.bank_swift || "-"}
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
                                            {customer?.payment_terms_days ??
                                                "-"}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                Credit limit:
                                            </span>{" "}
                                            {customer?.credit_limit != null
                                                ? formatCurrency(
                                                      customer.credit_limit,
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
                            Customer ID
                        </div>
                        <div className="mt-1 text-slate-900">
                            {customer?.id ?? "-"}
                        </div>
                        <div className="text-xs text-slate-500">
                            Created:{" "}
                            {customer?.created_at
                                ? formatDate(customer.created_at)
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
                            Orders / Credit
                        </div>
                        <div className="mt-1 text-emerald-900 font-semibold">
                            Orders: {ordersCount}
                        </div>
                        <div className="text-xs text-emerald-700">
                            Limit:{" "}
                            {customer?.credit_limit != null
                                ? formatCurrency(customer.credit_limit)
                                : "-"}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white shadow-md rounded-lg p-4">
                    <h2 className="text-lg font-semibold mb-3">
                        Invoices for this customer
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

                <div className="bg-white shadow-md rounded-lg p-4">
                    <h2 className="text-lg font-semibold mb-3">
                        Orders placed by this customer
                    </h2>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <DataTable
                            columns={[
                                {
                                    key: "order_number",
                                    label: "Order #",
                                },
                                {
                                    key: "created_at",
                                    label: "Created at",
                                    render: (v) => formatDate(v),
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
                            data={orders}
                            loading={loadingOrders}
                            perPage={10}
                            pagination={null}
                            totalRecordName="orders"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
