import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { useTranslation } from "react-i18next";
import DataTable from "../../components/DataTable";
import PageHeader from "../../components/PageHeader";
import { formatDate } from "../../utils/formatters";
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from "../../utils/constants";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import EmployeeTaskView from "./EmployeeTaskView";
import TaskFormModal from "./TaskFormModal";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function TaskList() {
    const { t } = useTranslation();
    const { hasRole, hasPermission } = usePermissions();
    const isEmployee = hasRole("Employee");

    if (isEmployee) {
        return <EmployeeTaskView />;
    }

    const { data, loading, error } = useFetch("tasks", "/tasks");
    const queryClient = useQueryClient();
    const [deletingId, setDeletingId] = useState(null);
    const [perPage, setPerPage] = useState(20);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);

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
        mutationFn: async (id) => {
            await api.delete(`/tasks/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            toast.success(t("tasks.list.toast.deleted"));
        },
        onError: (error) => {
            toast.error(t("tasks.list.toast.deleteFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
        onSettled: () => {
            setDeletingId(null);
        },
    });

    const handleDeleteClick = (task) => {
        setTaskToDelete(task);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!taskToDelete) return;
        setDeletingId(taskToDelete.id);
        deleteMutation.mutate(taskToDelete.id, {
            onSettled: () => {
                setDeletingId(null);
                setTaskToDelete(null);
            },
        });
    };

    const handleOpenCreate = () => {
        setSelectedTaskId(null);
        setModalMode("create");
        setModalOpen(true);
    };

    const handleOpenEdit = (task) => {
        setSelectedTaskId(task.id);
        setModalMode("edit");
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedTaskId(null);
    };

    const getStatusBadge = (status) => {
        const color = TASK_STATUS_COLORS[status] || "gray";
        const label = t(`tasks.status.${status}`, {
            defaultValue: TASK_STATUS_LABELS[status] || status,
        });

        const colorClasses = {
            yellow: "bg-yellow-100 text-yellow-800",
            blue: "bg-blue-100 text-blue-800",
            green: "bg-green-100 text-green-800",
            red: "bg-red-100 text-red-800",
            gray: "bg-gray-100 text-gray-800",
        };

        return (
            <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[color]}`}
            >
                {label}
            </span>
        );
    };

    const columns = [
        {
            key: "title",
            label: t("tasks.list.table.title"),
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <span>{value}</span>
                    {row.order_id && (
                        <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                            {t("tasks.list.orderTag")}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: "assigned_to.name",
            label: t("tasks.list.table.assignedTo"),
            render: (value) => value || t("common.dash"),
        },
        {
            key: "assigned_by.name",
            label: t("tasks.list.table.assignedBy"),
            render: (value) => value || t("common.dash"),
        },
        {
            key: "order.order_number",
            label: t("tasks.list.table.order"),
            render: (value, row) =>
                value && row.order ? (
                    <Link
                        to={`/orders/${row.order.id}`}
                        className="text-blue-600 hover:underline"
                    >
                        {value}
                    </Link>
                ) : (
                    t("common.dash")
                ),
        },
        {
            key: "status",
            label: t("tasks.list.table.status"),
            render: (value) => getStatusBadge(value),
        },
        {
            key: "due_date",
            label: t("tasks.list.table.dueDate"),
            render: (value) => (value ? formatDate(value) : t("common.dash")),
        },
        {
            key: "created_at",
            label: t("tasks.list.table.created"),
            render: (value) => formatDate(value),
        },
        {
            key: "actions",
            label: t("tasks.list.table.actions"),
            render: (value, row) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleOpenEdit(row)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-blue-50"
                        title={t("tasks.list.actions.edit")}
                        disabled={!hasPermission("edit tasks")}
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    {hasPermission("delete tasks") && (
                        <button
                            type="button"
                            onClick={() => handleDeleteClick(row)}
                            disabled={deletingId === row.id}
                            className="p-1.5 text-gray-600 hover:text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                            title={t("tasks.list.actions.delete")}
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
                        ? t("tasks.list.errors.permissionDenied")
                        : t("tasks.list.errors.error")}
                </p>
                <p>{errorMessage}</p>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={t("tasks.list.title")}
                actions={
                    hasPermission("create tasks") && (
                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4" />
                        {t("tasks.list.actions.create")}
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
                    searchPlaceholder={t("tasks.list.searchPlaceholder")}
                    pagination={{
                        currentPage: page,
                        lastPage,
                        total: filteredData.length,
                        onPageChange: setPage,
                    }}
                    totalRecordName={t("tasks.list.totalRecordName")}
                />
            </div>
            <TaskFormModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                taskId={selectedTaskId}
                mode={modalMode}
            />
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t("tasks.list.confirmDelete.title")}
                description={t("tasks.list.confirmDelete.description")}
                confirmLabel={t("tasks.list.confirmDelete.confirm")}
                cancelLabel={t("common.cancel")}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
