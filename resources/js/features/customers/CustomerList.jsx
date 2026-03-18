import React, { useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import DataTable from "../../components/DataTable";
import PageHeader from "../../components/PageHeader";
import { usePermissions } from "../../hooks/usePermissions";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import api from "../../utils/api";
import CustomerFormModal from "./CustomerFormModal";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function CustomerList() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { data, loading, error } = useFetch("customers", "/customers");
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [perPage, setPerPage] = useState(20);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const allData = data?.data || [];
    const filteredData = React.useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return allData;
        return allData.filter((row) =>
            JSON.stringify(row).toLowerCase().includes(s),
        );
    }, [allData, search]);
    const displayData = filteredData.slice(
        (page - 1) * perPage,
        page * perPage,
    );
    const lastPage = Math.max(1, Math.ceil(filteredData.length / perPage));

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/customers/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            toast.success(t("customers.toast.deleted"));
            setSelectedCustomer(null);
        },
        onError: (err) => {
            toast.error(
                err.response?.data?.message || t("customers.toast.deleteFailed"),
            );
        },
    });

    const handleDeleteClick = (row) => {
        setCustomerToDelete(row);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!customerToDelete) return;
        deleteMutation.mutate(customerToDelete.id, {
            onSettled: () => setCustomerToDelete(null),
        });
    };

    const columns = [
        { key: "name", label: t("customers.table.name") },
        { key: "email", label: t("customers.table.email") },
        { key: "phone", label: t("customers.table.phone") },
        { key: "contact_person", label: t("customers.table.contactPerson") },
        {
            key: "actions",
            label: t("customers.table.actions"),
            align: "right",
            render: (_, row) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={() => navigate(`/customers/${row.id}`)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={t("customers.actions.view")}
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    {hasPermission("edit customers") && (
                        <button
                            onClick={() => {
                                setSelectedCustomer(row);
                                setFormModalOpen(true);
                            }}
                            className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title={t("customers.actions.edit")}
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    {hasPermission("delete customers") && (
                        <button
                            onClick={() => handleDeleteClick(row)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title={t("customers.actions.delete")}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    if (error) {
        const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            t("common.unknown");
        const isPermissionError = error?.response?.status === 403;

        return (
            <div
                className={`p-4 rounded ${isPermissionError ? "bg-yellow-50 text-yellow-800" : "bg-red-50 text-red-800"}`}
            >
                <p className="font-semibold">
                    {isPermissionError
                        ? t("customers.errors.permissionDenied")
                        : t("customers.errors.error")}
                </p>
                <p>{errorMessage}</p>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={t("customers.title")}
                actions={
                    hasPermission("create customers") && (
                        <button
                            onClick={() => {
                                setSelectedCustomer(null);
                                setFormModalOpen(true);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            {t("customers.actions.add")}
                        </button>
                    )
                }
            />
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataTable
                    columns={columns}
                    data={displayData}
                    loading={loading}
                    perPage={perPage}
                    onPerPageChange={handlePerPageChange}
                    searchValue={search}
                    onSearchChange={setSearch}
                    searchPlaceholder={t("customers.searchPlaceholder")}
                    pagination={{
                        currentPage: page,
                        lastPage,
                        total: filteredData.length,
                        onPageChange: setPage,
                    }}
                    totalRecordName={t("customers.totalRecordName")}
                />
            </div>

            <CustomerFormModal
                isOpen={formModalOpen}
                onClose={() => {
                    setFormModalOpen(false);
                    setSelectedCustomer(null);
                }}
                customer={selectedCustomer}
            />
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t("customers.confirmDelete.title")}
                description={
                    customerToDelete
                        ? t("customers.confirmDelete.description", {
                              name: customerToDelete.name,
                          })
                        : ""
                }
                confirmLabel={t("customers.confirmDelete.confirm")}
                cancelLabel={t("common.cancel")}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
