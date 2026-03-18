import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import api from "../../utils/api";
import { formatCurrency, formatDate } from "../../utils/formatters";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import { Building2, Mail, Phone, MapPin, User } from "lucide-react";

export default function SupplierView() {
    const { id } = useParams();
    const supplierId = id;
    const { t } = useTranslation();

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

    useQuery({
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
                {t("suppliers.errors.loadFailed")}: {supplierError.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader title={supplier?.name || t("suppliers.view.title")} />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                {loadingSupplier ? (
                    <div className="text-gray-500">{t("common.loading")}</div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                                <Building2 className="w-5 h-5" />
                            </span>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {t("suppliers.view.companyDetailsTitle")}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {t("suppliers.view.companyDetailsDescription")}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-4 gap-y-6 mt-4">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <User className="w-4 h-4 text-blue-500 mt-1" />
                                    <div>
                                        <div className="text-xs font-medium text-gray-500">
                                            {t("suppliers.view.fields.nameOrCompany")}
                                        </div>
                                        <div className="text-sm text-gray-900">
                                            {supplier?.company_name ||
                                                supplier?.name ||
                                                t("common.dash")}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <User className="w-4 h-4 text-purple-500 mt-1" />
                                    <div>
                                        <div className="text-xs font-medium text-gray-500">
                                            {t("suppliers.view.fields.contactPerson")}
                                        </div>
                                        <div className="text-sm text-gray-900">
                                            {supplier?.contact_person || t("common.dash")}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Mail className="w-4 h-4 text-emerald-500 mt-1" />
                                    <div>
                                        <div className="text-xs font-medium text-gray-500">
                                            {t("suppliers.table.email")}
                                        </div>
                                        <div className="text-sm text-gray-900">
                                            {supplier?.email || t("common.dash")}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Phone className="w-4 h-4 text-orange-500 mt-1" />
                                    <div>
                                        <div className="text-xs font-medium text-gray-500">
                                            {t("suppliers.view.fields.mainPhone")}
                                        </div>
                                        <div className="text-sm text-gray-900">
                                            {supplier?.phone || t("common.dash")}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-4 h-4 text-blue-500 mt-1" />
                                    <div className="flex-1">
                                        <div className="text-xs font-medium text-gray-500">
                                            {t("suppliers.view.fields.billingAddress")}
                                        </div>
                                        <div className="text-sm text-gray-900 whitespace-pre-line">
                                            {supplier?.billing_address || t("common.dash")}
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
                                                {t("suppliers.table.phone")}:
                                            </span>{" "}
                                            {supplier?.billing_phone || t("common.dash")}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <MapPin className="w-4 h-4 text-green-500 mt-1" />
                                    <div className="flex-1">
                                        <div className="text-xs font-medium text-gray-500">
                                            {t("suppliers.view.fields.shippingAddress")}
                                        </div>
                                        <div className="text-sm text-gray-900 whitespace-pre-line">
                                            {supplier?.shipping_address || t("common.dash")}
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
                                                {t("suppliers.table.phone")}:
                                            </span>{" "}
                                            {supplier?.shipping_phone || t("common.dash")}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-start gap-3">
                                    <Building2 className="w-4 h-4 text-amber-500 mt-1" />
                                    <div>
                                        <div className="text-xs font-medium text-gray-500">
                                            {t("suppliers.view.fields.taxRegistration")}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                {t("suppliers.view.fields.tax")}:
                                            </span>{" "}
                                            {supplier?.tax_number || t("common.dash")}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                {t("suppliers.view.fields.registration")}:
                                            </span>{" "}
                                            {supplier?.registration_number ||
                                                t("common.dash")}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Building2 className="w-4 h-4 text-cyan-600 mt-1" />
                                    <div>
                                        <div className="text-xs font-medium text-gray-500">
                                            {t("suppliers.view.fields.banking")}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                {t("suppliers.view.fields.bank")}:
                                            </span>{" "}
                                            {supplier?.bank_name || t("common.dash")}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                IBAN:
                                            </span>{" "}
                                            {supplier?.bank_iban || t("common.dash")}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                SWIFT:
                                            </span>{" "}
                                            {supplier?.bank_swift || t("common.dash")}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <User className="w-4 h-4 text-indigo-600 mt-1" />
                                    <div>
                                        <div className="text-xs font-medium text-gray-500">
                                            {t("suppliers.view.fields.paymentTerms")}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                {t("suppliers.view.fields.days")}:
                                            </span>{" "}
                                            {supplier?.payment_terms_days ??
                                                t("common.dash")}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">
                                                {t("suppliers.view.fields.creditLimit")}:
                                            </span>{" "}
                                            {supplier?.credit_limit != null
                                                ? formatCurrency(
                                                      supplier.credit_limit,
                                                  )
                                                : t("common.dash")}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">
                    {t("suppliers.view.overview.title")}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-slate-50">
                        <div className="text-xs font-semibold uppercase text-slate-500">
                            {t("suppliers.view.overview.supplierId")}
                        </div>
                        <div className="mt-1 text-slate-900">
                            {supplier?.id ?? t("common.dash")}
                        </div>
                        <div className="text-xs text-slate-500">
                            {t("suppliers.view.overview.created")}:{" "}
                            {supplier?.created_at
                                ? formatDate(supplier.created_at)
                                : t("common.dash")}
                        </div>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50">
                        <div className="text-xs font-semibold uppercase text-blue-600">
                            {t("suppliers.view.overview.invoices")}
                        </div>
                        <div className="mt-1 text-blue-900 font-semibold">
                            {invoiceCount}
                        </div>
                        <div className="text-xs text-blue-700">
                            {t("suppliers.view.overview.total")}:{" "}
                            {formatCurrency(totalInvoiced)}
                        </div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50">
                        <div className="text-xs font-semibold uppercase text-amber-600">
                            {t("suppliers.view.overview.outstanding")}
                        </div>
                        <div className="mt-1 text-amber-900 font-semibold">
                            {formatCurrency(outstandingAmount)}
                        </div>
                        <div className="text-xs text-amber-700">
                            {t("suppliers.view.overview.overdueInvoices")}:{" "}
                            {overdueCount}
                        </div>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50">
                        <div className="text-xs font-semibold uppercase text-emerald-600">
                            {t("suppliers.view.overview.credit")}
                        </div>
                        <div className="mt-1 text-emerald-900 font-semibold">
                            {t("suppliers.view.overview.limit")}:{" "}
                            {supplier?.credit_limit != null
                                ? formatCurrency(supplier.credit_limit)
                                : t("common.dash")}
                        </div>
                        <div className="text-xs text-emerald-700">
                            {t("suppliers.view.overview.terms")}:{" "}
                            {supplier?.payment_terms_days != null
                                ? t("suppliers.view.overview.termsDays", {
                                      count: supplier.payment_terms_days,
                                  })
                                : t("common.dash")}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white shadow-md rounded-lg p-4">
                    <h2 className="text-lg font-semibold mb-3">
                        {t("suppliers.view.invoices.title")}
                    </h2>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <DataTable
                            columns={[
                                {
                                    key: "invoice_number",
                                    label: t("suppliers.view.invoices.table.invoiceNumber"),
                                },
                                {
                                    key: "issue_date",
                                    label: t("suppliers.view.invoices.table.issueDate"),
                                    render: (v) => formatDate(v),
                                },
                                {
                                    key: "due_date",
                                    label: t("suppliers.view.invoices.table.dueDate"),
                                    render: (v) =>
                                        v ? formatDate(v) : t("common.dash"),
                                },
                                {
                                    key: "status",
                                    label: t("suppliers.view.invoices.table.status"),
                                },
                                {
                                    key: "total_amount",
                                    label: t("suppliers.view.invoices.table.total"),
                                    align: "right",
                                    render: (v) => formatCurrency(v),
                                },
                            ]}
                            data={invoices}
                            loading={loadingInvoices}
                            perPage={10}
                            pagination={null}
                            totalRecordName={t("suppliers.view.invoices.totalRecordName")}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
