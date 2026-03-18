import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
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
            toast.success("Invoice deleted successfully");
        },
        onError: (error) => {
            toast.error("Failed to delete invoice", {
                description:
                    error.response?.data?.message || "An error occurred",
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
            toast.success("Invoice downloaded");
        } catch (e) {
            toast.error(
                e.response?.data?.message || "Failed to download invoice",
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
            header: "Invoice #",
            accessor: "invoice_number",
        },
        {
            header: "Partner",
            accessor: (row) => {
                if (row?.type === "income") {
                    return (
                        row.customer?.company_name ||
                        row.customer?.name ||
                        "N/A"
                    );
                }
                if (row?.type === "expense") {
                    return (
                        row.supplier?.company_name ||
                        row.supplier?.name ||
                        "N/A"
                    );
                }
                return "N/A";
            },
        },
        {
            header: "Type",
            accessor: "type",
            cell: (value) => (
                <span
                    className={`px-2 py-1 text-xs rounded-full ${getTypeColor(value)}`}
                >
                    {value.toUpperCase()}
                </span>
            ),
        },
        {
            header: "Status",
            accessor: "status",
            cell: (value) => (
                <span
                    className={`px-2 py-1 text-xs rounded-full ${getStatusColor(value)}`}
                >
                    {value.toUpperCase()}
                </span>
            ),
        },
        {
            header: "Issue Date",
            accessor: "issue_date",
            cell: (value) => formatDate(value),
        },
        {
            header: "Due Date",
            accessor: "due_date",
            cell: (value) => (value ? formatDate(value) : "N/A"),
        },
        {
            header: "Total Amount",
            accessor: "total_amount",
            cell: (value) => formatCurrency(value),
        },
        {
            header: "Category",
            accessor: "category",
            cell: (value) => value || "N/A",
        },
        {
            header: "Actions",
            accessor: "id",
            cell: (id, row) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        type="button"
                        onClick={() => navigate(`/invoices/${id}`)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View invoice"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDownloadInvoice(id)}
                        className="p-2 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                        title="Download invoice"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    {hasPermission("edit invoices") && (
                        <button
                            type="button"
                            onClick={() => handleOpenEdit(row)}
                            className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Edit invoice"
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
                            title="Delete invoice"
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
                Error loading invoices: {error.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Invoices"
                actions={
                    hasPermission("create invoices") && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Invoice
                        </button>
                    )
                }
            />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type
                        </label>
                        <SearchableSelect
                            value={typeFilter}
                            onChange={(v) => {
                                setTypeFilter(v || "");
                                setPage(1);
                            }}
                            options={[
                                { value: "", label: "All Types" },
                                { value: "income", label: "Income" },
                                { value: "expense", label: "Expense" },
                            ]}
                            placeholder="All Types"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <SearchableSelect
                            value={statusFilter}
                            onChange={(v) => {
                                setStatusFilter(v || "");
                                setPage(1);
                            }}
                            options={[
                                { value: "", label: "All Statuses" },
                                { value: "draft", label: "Draft" },
                                { value: "sent", label: "Sent" },
                                { value: "paid", label: "Paid" },
                                { value: "overdue", label: "Overdue" },
                                { value: "cancelled", label: "Cancelled" },
                            ]}
                            placeholder="All Statuses"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Supplier
                        </label>
                        <SearchableSelect
                            value={supplierFilter}
                            onChange={(v) => {
                                setSupplierFilter(v || "");
                                setPage(1);
                            }}
                            fetchOptions={(params) => api.get("/suppliers?" + params).then((r) => r.data)}
                            displayValue={(sup) => sup?.name}
                            placeholder="All Suppliers"
                            cacheKey="invoice-list-suppliers"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                        </label>
                        <input
                            type="text"
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Category"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date From
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
                            Date To
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
                    searchPlaceholder="Search invoices..."
                    totalRecordName="invoices"
                />
            </div>
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete invoice?"
                description={
                    invoiceToDelete
                        ? `Are you sure you want to delete invoice ${invoiceToDelete.invoice_number}?`
                        : ""
                }
                confirmLabel="Yes, delete"
                cancelLabel="Cancel"
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
