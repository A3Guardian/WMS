import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Eye, Pencil, Trash2, Plus, Download } from "lucide-react";
import DataTable from "../../components/DataTable";
import SearchableSelect from "../../components/SearchableSelect";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import { formatDate, formatCurrency } from "../../utils/formatters";
import PageHeader from "../../components/PageHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import InvoiceFormModal from "./InvoiceFormModal";
import { generateInvoicePdf } from "../../utils/invoicePdf";

export default function InvoiceList() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: routeInvoiceId } = useParams();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [supplierFilter, setSupplierFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [search, setSearch] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [formModalMode, setFormModalMode] = useState("create"); // "create" | "edit"
    const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

    const handleOpenCreate = () => {
        setSelectedInvoiceId(null);
        setFormModalMode("create");
        setFormModalOpen(true);
    };

    const handleOpenEdit = (invoice) => {
        setSelectedInvoiceId(invoice?.id);
        setFormModalMode("edit");
        setFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        setFormModalOpen(false);
        setSelectedInvoiceId(null);
        if (
            location.pathname.endsWith("/create") ||
            location.pathname.endsWith("/edit")
        ) {
            navigate("/invoices");
        }
    };

    useEffect(() => {
        if (location.pathname.endsWith("/invoices/create")) {
            handleOpenCreate();
            return;
        }
        if (location.pathname.endsWith("/edit") && routeInvoiceId) {
            setSelectedInvoiceId(routeInvoiceId);
            setFormModalMode("edit");
            setFormModalOpen(true);
        }
    }, [location.pathname, routeInvoiceId]);

    const { data, isLoading, error } = useQuery({
        queryKey: [
            "invoices",
            page,
            perPage,
            typeFilter,
            statusFilter,
            supplierFilter,
            categoryFilter,
            dateFrom,
            dateTo,
        ],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (typeFilter) params.append("type", typeFilter);
            if (statusFilter) params.append("status", statusFilter);
            if (supplierFilter) params.append("supplier_id", supplierFilter);
            if (categoryFilter) params.append("category", categoryFilter);
            if (dateFrom) params.append("date_from", dateFrom);
            if (dateTo) params.append("date_to", dateTo);
            const response = await api.get(`/invoices?${params.toString()}`);
            return response.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (invoiceId) => {
            const response = await api.delete(`/invoices/${invoiceId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            toast.success(t("invoices.toast.deleted"));
        },
        onError: (error) => {
            toast.error(t("invoices.toast.deleteFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const handleDeleteClick = (invoice) => {
        setInvoiceToDelete(invoice);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!invoiceToDelete) return;
        deleteMutation.mutate(invoiceToDelete.id, {
            onSettled: () => setInvoiceToDelete(null),
        });
    };

    const handleDownloadInvoice = async (invoiceId) => {
        try {
            const [invRes, settingsRes] = await Promise.all([
                api.get(`/invoices/${invoiceId}`),
                api.get("/settings/invoice-data"),
            ]);
            const inv = invRes.data;
            const settings = settingsRes.data;
            await generateInvoicePdf({
                invoice: inv,
                items: inv?.items ?? [],
                company: settings?.company ?? {},
                logoUrl: settings?.logo_url ?? null,
            });
            toast.success(t("invoices.toast.downloaded"));
        } catch (e) {
            toast.error(
                e.response?.data?.message || t("invoices.toast.downloadFailed"),
            );
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            draft: "bg-gray-100 text-gray-800",
            sent: "bg-blue-100 text-blue-800",
            paid: "bg-green-100 text-green-800",
            overdue: "bg-red-100 text-red-800",
            cancelled: "bg-gray-100 text-gray-800",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    const getTypeColor = (type) => {
        return type === "income"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800";
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
            header: t("invoices.list.table.invoiceNumber"),
            accessor: "invoice_number",
        },
        {
            header: t("invoices.list.table.partner"),
            accessor: (row) => {
                if (row?.type === "income") {
                    return (
                        row.customer?.company_name ||
                        row.customer?.name ||
                        t("common.na")
                    );
                }
                if (row?.type === "expense") {
                    return (
                        row.supplier?.company_name ||
                        row.supplier?.name ||
                        t("common.na")
                    );
                }
                return t("common.na");
            },
        },
        {
            header: t("invoices.list.table.type"),
            accessor: "type",
            cell: (value) => (
                <span
                    className={`px-2 py-1 text-xs rounded-full ${getTypeColor(value)}`}
                >
                    {t(`invoices.type.${value}`, {
                        defaultValue: value.toUpperCase(),
                    })}
                </span>
            ),
        },
        {
            header: t("invoices.list.table.status"),
            accessor: "status",
            cell: (value) => (
                <span
                    className={`px-2 py-1 text-xs rounded-full ${getStatusColor(value)}`}
                >
                    {t(`invoices.status.${value}`, {
                        defaultValue: value.toUpperCase(),
                    })}
                </span>
            ),
        },
        {
            header: t("invoices.list.table.issueDate"),
            accessor: "issue_date",
            cell: (value) => formatDate(value),
        },
        {
            header: t("invoices.list.table.dueDate"),
            accessor: "due_date",
            cell: (value) => (value ? formatDate(value) : t("common.na")),
        },
        {
            header: t("invoices.list.table.totalAmount"),
            accessor: "total_amount",
            cell: (value) => formatCurrency(value),
        },
        {
            header: t("invoices.list.table.category"),
            accessor: "category",
            cell: (value) => value || t("common.na"),
        },
        {
            header: t("invoices.list.table.actions"),
            accessor: "id",
            cell: (id, row) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        type="button"
                        onClick={() => navigate(`/invoices/${id}`)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={t("invoices.actions.view")}
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDownloadInvoice(id)}
                        className="p-2 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                        title={t("invoices.actions.download")}
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    {hasPermission("edit invoices") && (
                        <button
                            type="button"
                            onClick={() => handleOpenEdit(row)}
                            className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title={t("invoices.actions.edit")}
                            disabled={row?.status !== "draft"}
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    {hasPermission("delete invoices") && (
                        <button
                            type="button"
                            onClick={() => handleDeleteClick(row)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title={t("invoices.actions.delete")}
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
                {t("invoices.errors.loadFailed")}: {error.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={t("invoices.list.title")}
                actions={
                    hasPermission("create invoices") && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            {t("invoices.actions.add")}
                        </button>
                    )
                }
            />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("invoices.filters.type")}
                        </label>
                        <SearchableSelect
                            value={typeFilter}
                            onChange={(v) => {
                                setTypeFilter(v || "");
                                setPage(1);
                            }}
                            options={[
                                {
                                    value: "",
                                    label: t("invoices.filters.allTypes"),
                                },
                                {
                                    value: "income",
                                    label: t("invoices.type.income"),
                                },
                                {
                                    value: "expense",
                                    label: t("invoices.type.expense"),
                                },
                            ]}
                            placeholder={t("invoices.filters.allTypes")}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("invoices.filters.status")}
                        </label>
                        <SearchableSelect
                            value={statusFilter}
                            onChange={(v) => {
                                setStatusFilter(v || "");
                                setPage(1);
                            }}
                            options={[
                                {
                                    value: "",
                                    label: t("invoices.filters.allStatuses"),
                                },
                                {
                                    value: "draft",
                                    label: t("invoices.status.draft"),
                                },
                                {
                                    value: "sent",
                                    label: t("invoices.status.sent"),
                                },
                                {
                                    value: "paid",
                                    label: t("invoices.status.paid"),
                                },
                                {
                                    value: "overdue",
                                    label: t("invoices.status.overdue"),
                                },
                                {
                                    value: "cancelled",
                                    label: t("invoices.status.cancelled"),
                                },
                            ]}
                            placeholder={t("invoices.filters.allStatuses")}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("invoices.filters.supplier")}
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
                            placeholder={t("invoices.filters.allSuppliers")}
                            cacheKey="invoice-list-suppliers"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("invoices.filters.category")}
                        </label>
                        <input
                            type="text"
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setPage(1);
                            }}
                            placeholder={t("invoices.filters.categoryPlaceholder")}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("invoices.filters.dateFrom")}
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
                            {t("invoices.filters.dateTo")}
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
                    pagination={
                        data
                            ? {
                                  currentPage: data.current_page || 1,
                                  lastPage: data.last_page || 1,
                                  perPage: data.per_page || 15,
                                  total: data.total || 0,
                                  onPageChange: setPage,
                                  onPerPageChange: handlePerPageChange,
                              }
                            : undefined
                    }
                    searchValue={search}
                    onSearchChange={setSearch}
                    searchPlaceholder={t("invoices.list.searchPlaceholder")}
                    totalRecordName={t("invoices.list.totalRecordName")}
                />
            </div>
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t("invoices.confirmDelete.title")}
                description={
                    invoiceToDelete
                        ? t("invoices.confirmDelete.description", {
                              number: invoiceToDelete.invoice_number,
                          })
                        : ""
                }
                confirmLabel={t("invoices.confirmDelete.confirm")}
                cancelLabel={t("common.cancel")}
                onConfirm={handleConfirmDelete}
            />
            <InvoiceFormModal
                isOpen={formModalOpen}
                onClose={handleCloseFormModal}
                invoiceId={selectedInvoiceId}
                mode={formModalMode}
            />
        </div>
    );
}
