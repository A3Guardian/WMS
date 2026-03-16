import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import DataTable from "../../components/DataTable";
import PageHeader from "../../components/PageHeader";
import SearchableSelect from "../../components/SearchableSelect";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { ORDER_STATUS_LABELS } from "../../utils/constants";
import api from "../../utils/api";
import OrderFormModal from "./OrderFormModal";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "../../hooks/usePermissions";
import ConfirmDialog from "../../components/ConfirmDialog";

const STATUS_OPTIONS = [
    { value: "", label: "Toate" },
    { value: "pending", label: ORDER_STATUS_LABELS.pending },
    { value: "processing", label: ORDER_STATUS_LABELS.processing },
    { value: "completed", label: ORDER_STATUS_LABELS.completed },
    { value: "cancelled", label: ORDER_STATUS_LABELS.cancelled },
];

export default function OrderList() {
    const navigate = useNavigate();
    const { hasRole } = usePermissions();
    const queryClient = useQueryClient();
    const [perPage, setPerPage] = useState(20);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [customerFilter, setCustomerFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState(null);

    const params = new URLSearchParams();
    params.set("per_page", String(perPage));
    params.set("page", String(page));
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (customerFilter) params.set("customer_id", customerFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    params.set("sort_by", "created_at");
    params.set("sort_order", "desc");

    const isEmployee = hasRole("Employee");
    useEffect(() => {
        if (isEmployee) navigate("/tasks", { replace: true });
    }, [isEmployee, navigate]);

    const { data, loading, error } = useQuery({
        queryKey: ["orders", params.toString()],
        queryFn: async () => {
            const res = await api.get("/orders?" + params.toString());
            return res.data;
        },
        enabled: !isEmployee,
    });

    const fetchCustomers = (queryString) =>
        api.get("/customers?" + queryString).then((r) => r.data);

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/orders/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            toast.success("Comandă ștearsă");
            setDeletingId(null);
        },
        onError: (err) => {
            toast.error(
                err.response?.data?.message || "Eroare la ștergerea comenzii",
            );
            setDeletingId(null);
        },
    });

    const pagination = data?.meta
        ? {
              currentPage: data.meta.current_page,
              lastPage: data.meta.last_page,
              total: data.meta.total,
              onPageChange: setPage,
          }
        : null;
    const list = data?.data ?? data ?? [];
    const displayData = Array.isArray(list) ? list : [];

    const handleCreate = () => {
        setEditingOrder(null);
        setModalOpen(true);
    };

    const handleEdit = (order) => {
        setEditingOrder(order);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingOrder(null);
    };

    const handleDeleteClick = (order) => {
        setOrderToDelete(order);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!orderToDelete) return;
        setDeletingId(orderToDelete.id);
        deleteMutation.mutate(orderToDelete.id, {
            onSettled: () => {
                setDeletingId(null);
                setOrderToDelete(null);
            },
        });
    };

    const columns = [
        { key: "order_number", label: "Nr. comandă" },
        {
            key: "customer",
            label: "Client",
            render: (_, row) =>
                row.customer?.name || row.customer?.company_name || "-",
        },
        {
            key: "status",
            label: "Status",
            render: (value) => ORDER_STATUS_LABELS[value] || value,
        },
        {
            key: "total_amount",
            label: "Total",
            render: (value) => formatCurrency(value),
        },
        {
            key: "created_at",
            label: "Data",
            render: (value) => formatDate(value),
        },
        {
            key: "actions",
            label: "Acțiuni",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <Link
                        to={`/orders/${row.id}`}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-blue-50"
                        title="Vizualizare"
                    >
                        <Eye className="w-4 h-4" />
                    </Link>
                    <button
                        type="button"
                        onClick={() => handleEdit(row)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-blue-50"
                        title="Editează"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeleteClick(row)}
                        disabled={deletingId === row.id}
                        className="p-1.5 text-gray-600 hover:text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                        title="Șterge"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    if (isEmployee) return null;

    if (error) {
        const errorMessage =
            error?.response?.data?.message || error?.message || "Eroare";
        const isPermissionError = error?.response?.status === 403;
        return (
            <div>
                <PageHeader title="Comenzi" />
                <div
                    className={`p-4 rounded ${isPermissionError ? "bg-yellow-50 text-yellow-800" : "bg-red-50 text-red-800"}`}
                >
                    <p className="font-semibold">
                        {isPermissionError ? "Acces interzis" : "Eroare"}
                    </p>
                    <p>{errorMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Comenzi"
                actions={
                    <button
                        type="button"
                        onClick={handleCreate}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4" />
                        Comandă nouă
                    </button>
                }
            />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data de la
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                                setDateFrom(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data până la
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                                setDateTo(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Client
                        </label>
                        <SearchableSelect
                            value={customerFilter}
                            onChange={(v) => {
                                setCustomerFilter(v || "");
                                setPage(1);
                            }}
                            fetchOptions={fetchCustomers}
                            displayValue={(opt) =>
                                opt?.company_name || opt?.name || opt?.email
                            }
                            placeholder="Toți clienții"
                            cacheKey="orders-filter-customers"
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
                            options={STATUS_OPTIONS}
                            placeholder="Toate"
                            cacheKey="orders-filter-status"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataTable
                    columns={columns}
                    data={displayData}
                    loading={loading}
                    perPage={perPage}
                    onPerPageChange={(newPerPage) => {
                        setPerPage(newPerPage);
                        setPage(1);
                    }}
                    pagination={pagination}
                    searchValue={search}
                    onSearchChange={(v) => {
                        setSearch(v);
                        setPage(1);
                    }}
                    searchPlaceholder="Caută nr. comandă sau client..."
                    totalRecordName="comenzi"
                />
            </div>
            <OrderFormModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                order={editingOrder}
            />
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Ștergi comanda?"
                description={
                    orderToDelete
                        ? `Sigur vrei să ștergi comanda ${orderToDelete.order_number || orderToDelete.id}?`
                        : ""
                }
                confirmLabel="Da, șterge"
                cancelLabel="Anulează"
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
