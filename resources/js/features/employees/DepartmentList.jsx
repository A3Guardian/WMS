import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Plus, Users } from "lucide-react";
import DataTable from "../../components/DataTable";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import PageHeader from "../../components/PageHeader";
import DepartmentFormModal from "./DepartmentFormModal";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function DepartmentList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [perPage, setPerPage] = useState(10);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
    const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [departmentToDelete, setDepartmentToDelete] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, isLoading, error } = useQuery({
        queryKey: ["departments", page, debouncedSearch, perPage],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (debouncedSearch) params.append("search", debouncedSearch);
            const response = await api.get(`/departments?${params.toString()}`);
            return response.data;
        },
    });

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const deleteMutation = useMutation({
        mutationFn: async (departmentId) => {
            const response = await api.delete(`/departments/${departmentId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            toast.success(t("departments.toast.deleted"));
        },
        onError: (error) => {
            toast.error(t("departments.toast.deleteFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const handleDeleteClick = (department) => {
        setDepartmentToDelete(department);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!departmentToDelete) return;
        deleteMutation.mutate(departmentToDelete.id, {
            onSettled: () => setDepartmentToDelete(null),
        });
    };

    const handleOpenCreate = () => {
        setSelectedDepartmentId(null);
        setModalMode("create");
        setModalOpen(true);
    };

    const handleOpenEdit = (department) => {
        setSelectedDepartmentId(department.id);
        setModalMode("edit");
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedDepartmentId(null);
    };

    const columns = [
        {
            header: t("departments.list.table.name"),
            accessor: "name",
        },
        {
            header: t("departments.list.table.description"),
            accessor: "description",
            cell: (value) =>
                value
                    ? value.length > 100
                        ? value.substring(0, 100) + "..."
                        : value
                    : t("common.na"),
        },
        {
            header: t("departments.list.table.actions"),
            accessor: "id",
            align: "center",
            cell: (id, row) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate(`/departments/${id}`)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-blue-50"
                        title={t("departments.actions.viewTeam")}
                    >
                        <Users className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOpenEdit(row)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-blue-50"
                        title={t("departments.actions.edit")}
                        disabled={!hasPermission("edit employees")}
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeleteClick(row)}
                        className="p-1.5 text-gray-600 hover:text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                        title={t("departments.actions.delete")}
                        disabled={!hasPermission("delete employees")}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    if (error) {
        return (
            <div className="text-red-500 p-4">
                {t("departments.errors.loadFailed")}: {error.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={t("departments.list.title")}
                actions={
                    hasPermission("create employees") && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4" />
                            {t("departments.actions.add")}
                        </button>
                    )
                }
            />

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataTable
                    columns={columns}
                    data={data?.data || []}
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
                    searchPlaceholder={t("departments.list.searchPlaceholder")}
                    totalRecordName={t("departments.list.totalRecordName")}
                />
            </div>
            <DepartmentFormModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                departmentId={selectedDepartmentId}
                mode={modalMode}
            />
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t("departments.confirmDelete.title")}
                description={
                    departmentToDelete
                        ? t("departments.confirmDelete.description", {
                              name: departmentToDelete.name,
                          })
                        : ""
                }
                confirmLabel={t("departments.confirmDelete.confirm")}
                cancelLabel={t("common.cancel")}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
