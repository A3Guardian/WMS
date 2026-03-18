import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2 } from "lucide-react";
import DataTable from "../../components/DataTable";
import SearchableSelect from "../../components/SearchableSelect";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import { formatDate, formatCurrency } from "../../utils/formatters";
import PageHeader from "../../components/PageHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import SupplierPaymentFormModal from "./SupplierPaymentFormModal";

export default function SupplierPaymentList() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: routePaymentId } = useParams();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [typeFilter, setTypeFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [supplierFilter, setSupplierFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [search, setSearch] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState(null);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [formModalMode, setFormModalMode] = useState("create"); // "create" | "edit"
    const [selectedPaymentId, setSelectedPaymentId] = useState(null);

    const { data, isLoading, error } = useQuery({
        queryKey: [
            "payments",
            page,
            perPage,
            typeFilter,
            categoryFilter,
            supplierFilter,
            dateFrom,
            dateTo,
        ],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (typeFilter) params.append("type", typeFilter);
            if (categoryFilter) params.append("category", categoryFilter);
            if (supplierFilter) params.append("supplier_id", supplierFilter);
            if (dateFrom) params.append("date_from", dateFrom);
            if (dateTo) params.append("date_to", dateTo);
            const response = await api.get(`/payments?${params.toString()}`);
            return response.data;
        },
    });

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const deleteMutation = useMutation({
        mutationFn: async (paymentId) => {
            const response = await api.delete(`/payments/${paymentId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payments"] });
            toast.success(t("payments.toast.deleted"));
        },
        onError: (error) => {
            toast.error(t("payments.toast.deleteFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const handleDeleteClick = (payment) => {
        setPaymentToDelete(payment);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!paymentToDelete) return;
        deleteMutation.mutate(paymentToDelete.id, {
            onSettled: () => setPaymentToDelete(null),
        });
    };

    const handleOpenCreate = () => {
        setSelectedPaymentId(null);
        setFormModalMode("create");
        setFormModalOpen(true);
    };

    const handleOpenEdit = (payment) => {
        setSelectedPaymentId(payment?.id);
        setFormModalMode("edit");
        setFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        setFormModalOpen(false);
        setSelectedPaymentId(null);
        if (
            location.pathname.endsWith("/create") ||
            location.pathname.endsWith("/edit")
        ) {
            navigate("/payments");
        }
    };

    useEffect(() => {
        if (location.pathname.endsWith("/payments/create")) {
            handleOpenCreate();
            return;
        }
        if (location.pathname.endsWith("/edit") && routePaymentId) {
            setSelectedPaymentId(routePaymentId);
            setFormModalMode("edit");
            setFormModalOpen(true);
        }
    }, [location.pathname, routePaymentId]);

    const getTypeColor = (type) => {
        const colors = {
            payment: "bg-blue-100 text-blue-800",
            receipt: "bg-green-100 text-green-800",
            refund: "bg-yellow-100 text-yellow-800",
            adjustment: "bg-gray-100 text-gray-800",
        };
        return colors[type] || "bg-gray-100 text-gray-800";
    };

    const getCategoryColor = (category) => {
        const colors = {
            supplier_payment: "bg-red-100 text-red-800",
            customer_payment: "bg-green-100 text-green-800",
            salary: "bg-purple-100 text-purple-800",
            expense: "bg-orange-100 text-orange-800",
            income: "bg-green-100 text-green-800",
            other: "bg-gray-100 text-gray-800",
        };
        return colors[category] || "bg-gray-100 text-gray-800";
    };

    const pageData = data?.data || [];
    const filteredData = React.useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return pageData;
        return pageData.filter((row) =>
            JSON.stringify(row).toLowerCase().includes(s),
        );
    }, [pageData, search]);

    const columns = [
        {
            header: t("payments.list.table.transactionNumber"),
            accessor: "transaction_number",
        },
        {
            header: t("payments.list.table.partner"),
            accessor: (row) => {
                if (row?.category === "customer_payment") {
                    return (
                        row.customer?.company_name ||
                        row.customer?.name ||
                        t("common.na")
                    );
                }
                return (
                    row.supplier?.company_name ||
                    row.supplier?.name ||
                    t("common.na")
                );
            },
        },
        {
            header: t("payments.list.table.invoice"),
            accessor: (row) => row.invoice?.invoice_number || t("common.na"),
        },
        {
            header: t("payments.list.table.type"),
            accessor: "type",
            cell: (value) => (
                <span
                    className={`px-2 py-1 text-xs rounded-full ${getTypeColor(value)}`}
                >
                    {t(`payments.type.${value}`, {
                        defaultValue: value.toUpperCase(),
                    })}
                </span>
            ),
        },
        {
            header: t("payments.list.table.category"),
            accessor: "category",
            cell: (value) => (
                <span
                    className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(value)}`}
                >
                    {t(`payments.category.${value}`, {
                        defaultValue: value.replace("_", " ").toUpperCase(),
                    })}
                </span>
            ),
        },
        {
            header: t("payments.list.table.amount"),
            accessor: "amount",
            cell: (value) => formatCurrency(value),
        },
        {
            header: t("payments.list.table.paymentMethod"),
            accessor: "payment_method",
            cell: (value) =>
                t(`payments.method.${value}`, {
                    defaultValue: value.replace("_", " ").toUpperCase(),
                }),
        },
        {
            header: t("payments.list.table.transactionDate"),
            accessor: "transaction_date",
            cell: (value) => formatDate(value),
        },
        {
            header: t("payments.list.table.referenceNumber"),
            accessor: "reference_number",
            cell: (value) => value || t("common.na"),
        },
        {
            header: t("payments.list.table.actions"),
            accessor: "id",
            cell: (id, row) => (
                <div className="flex items-center justify-end gap-1">
                    {hasPermission("edit payments") && (
                        <button
                            type="button"
                            onClick={() => handleOpenEdit(row)}
                            className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title={t("payments.actions.edit")}
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    {hasPermission("delete payments") && (
                        <button
                            type="button"
                            onClick={() => handleDeleteClick(row)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title={t("payments.actions.delete")}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    if (error) {
        return (
            <div className="text-red-500 p-4">
                {t("payments.errors.loadFailed")}: {error.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={t("payments.list.title")}
                actions={
                    hasPermission("create payments") && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            {t("payments.actions.add")}
                        </button>
                    )
                }
            />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("payments.filters.type")}
                        </label>
                        <SearchableSelect
                            value={typeFilter}
                            onChange={(v) => {
                                setTypeFilter(v || "");
                                setPage(1);
                            }}
                            options={[
                                { value: "", label: t("payments.filters.allTypes") },
                                { value: "payment", label: t("payments.type.payment") },
                                { value: "receipt", label: t("payments.type.receipt") },
                                { value: "refund", label: t("payments.type.refund") },
                                { value: "adjustment", label: t("payments.type.adjustment") },
                            ]}
                            placeholder={t("payments.filters.allTypes")}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("payments.filters.category")}
                        </label>
                        <SearchableSelect
                            value={categoryFilter}
                            onChange={(v) => {
                                setCategoryFilter(v || "");
                                setPage(1);
                            }}
                            options={[
                                { value: "", label: t("payments.filters.allCategories") },
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
                            placeholder={t("payments.filters.allCategories")}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("payments.filters.supplier")}
                        </label>
                        <SearchableSelect
                            value={supplierFilter}
                            onChange={(v) => {
                                setSupplierFilter(v || "");
                                setPage(1);
                            }}
                            fetchOptions={(params) =>
                                api
                                    .get("/suppliers?" + params)
                                    .then((r) => r.data)
                            }
                            displayValue={(sup) => sup?.name}
                            placeholder={t("payments.filters.allSuppliers")}
                            cacheKey="supplier-payment-list-suppliers"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("payments.filters.dateFrom")}
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                                setDateFrom(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("payments.filters.dateTo")}
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                                setDateTo(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataTable
                    columns={columns}
                    data={filteredData}
                    loading={isLoading}
                    perPage={perPage}
                    pagination={{
                        currentPage: data?.current_page || 1,
                        lastPage: data?.last_page || 1,
                        perPage: data?.per_page || 15,
                        total: data?.total || 0,
                        onPageChange: setPage,
                        onPerPageChange: handlePerPageChange,
                    }}
                    searchValue={search}
                    onSearchChange={setSearch}
                    searchPlaceholder={t("payments.list.searchPlaceholder")}
                    totalRecordName={t("payments.list.totalRecordName")}
                />
            </div>
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t("payments.confirmDelete.title")}
                description={
                    paymentToDelete
                        ? t("payments.confirmDelete.description", {
                              number: paymentToDelete.transaction_number,
                          })
                        : ""
                }
                confirmLabel={t("payments.confirmDelete.confirm")}
                cancelLabel={t("common.cancel")}
                onConfirm={handleConfirmDelete}
            />
            <SupplierPaymentFormModal
                isOpen={formModalOpen}
                onClose={handleCloseFormModal}
                paymentId={selectedPaymentId}
                mode={formModalMode}
            />
        </div>
    );
}
