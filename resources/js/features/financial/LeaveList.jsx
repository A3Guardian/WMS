import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Check, XCircle, Plus } from "lucide-react";
import DataTable from "../../components/DataTable";
import SearchableSelect from "../../components/SearchableSelect";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import { formatDate } from "../../utils/formatters";
import {
    LEAVE_STATUS_LABELS,
    LEAVE_STATUS_COLORS,
    LEAVE_STATUS,
} from "../../utils/constants";
import PageHeader from "../../components/PageHeader";
import LeaveFormModal from "./LeaveFormModal";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function LeaveList() {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [employeeFilter, setEmployeeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingLeaveId, setEditingLeaveId] = useState(null);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [leaveToDelete, setLeaveToDelete] = useState(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ["leaves", page, perPage, employeeFilter, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (employeeFilter) params.append("employee_id", employeeFilter);
            if (statusFilter) params.append("status", statusFilter);
            const response = await api.get(`/leaves?${params.toString()}`);
            return response.data;
        },
    });

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const approveMutation = useMutation({
        mutationFn: async (leaveId) => {
            const response = await api.put(`/leaves/${leaveId}`, {
                status: LEAVE_STATUS.APPROVED,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leaves"] });
            toast.success(t("leaves.toast.approved"));
        },
        onError: (error) => {
            toast.error(t("leaves.toast.approveFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ leaveId, reason }) => {
            const response = await api.put(`/leaves/${leaveId}`, {
                status: LEAVE_STATUS.REJECTED,
                rejection_reason: reason,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leaves"] });
            toast.success(t("leaves.toast.rejected"));
        },
        onError: (error) => {
            toast.error(t("leaves.toast.rejectFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (leaveId) => {
            const response = await api.delete(`/leaves/${leaveId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leaves"] });
            toast.success(t("leaves.toast.deleted"));
        },
        onError: (error) => {
            toast.error(t("leaves.toast.deleteFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const handleApprove = (leave) => {
        approveMutation.mutate(leave.id);
    };

    const handleReject = (leave) => {
        const reason = window.prompt(t("leaves.prompt.rejectionReason"));
        if (reason !== null && reason.trim()) {
            rejectMutation.mutate({ leaveId: leave.id, reason: reason.trim() });
        }
    };

    const handleDeleteClick = (leave) => {
        setLeaveToDelete(leave);
        setConfirmDeleteOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!leaveToDelete) return;
        deleteMutation.mutate(leaveToDelete.id, {
            onSettled: () => setLeaveToDelete(null),
        });
    };

    const handleOpenCreate = () => {
        setEditingLeaveId(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (leave) => {
        setEditingLeaveId(leave.id);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingLeaveId(null);
    };

    const getStatusBadge = (status) => {
        const color = LEAVE_STATUS_COLORS[status] || "gray";
        const label = t(`leaves.status.${status}`, {
            defaultValue: LEAVE_STATUS_LABELS[status] || status,
        });

        const colorClasses = {
            yellow: "bg-yellow-100 text-yellow-800",
            green: "bg-green-100 text-green-800",
            red: "bg-red-100 text-red-800",
            gray: "bg-gray-100 text-gray-800",
        };

        return (
            <span
                className={`px-2 py-1 text-xs rounded-full ${colorClasses[color]}`}
            >
                {label}
            </span>
        );
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
            header: t("leaves.list.table.employee"),
            accessor: (row) =>
                row.employee?.user?.name ||
                row.employee?.employee_code ||
                t("common.na"),
        },
        {
            header: t("leaves.list.table.leaveType"),
            accessor: (row) => row.leave_type?.name || t("common.na"),
        },
        {
            header: t("leaves.list.table.startDate"),
            accessor: "start_date",
            cell: (value) => formatDate(value),
        },
        {
            header: t("leaves.list.table.endDate"),
            accessor: "end_date",
            cell: (value) => formatDate(value),
        },
        {
            header: t("leaves.list.table.days"),
            accessor: "days",
        },
        {
            header: t("leaves.list.table.status"),
            accessor: "status",
            cell: (value) => getStatusBadge(value),
        },
        {
            header: t("leaves.list.table.actions"),
            accessor: "id",
            align: "center",
            cell: (id, row) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleOpenEdit(row)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-blue-50"
                        title={t("leaves.actions.viewEdit")}
                        disabled={
                            !hasPermission("edit leaves") &&
                            !hasPermission("view leaves")
                        }
                    >
                        <Pencil className="w-4 h-4" />
                    </button>

                    {hasPermission("delete leaves") && (
                        <button
                            type="button"
                            onClick={() => handleDeleteClick(row)}
                            className="p-1.5 text-gray-600 hover:text-red-600 rounded hover:bg-red-50"
                            title={t("leaves.actions.delete")}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    {row.status === LEAVE_STATUS.PENDING &&
                        hasPermission("edit leaves") && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleApprove(row)}
                                    className="p-1.5 text-green-600 hover:text-green-700 rounded hover:bg-green-50"
                                    title={t("leaves.actions.approve")}
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleReject(row)}
                                    className="p-1.5 text-red-600 hover:text-red-700 rounded hover:bg-red-50"
                                    title={t("leaves.actions.reject")}
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </>
                        )}
                </div>
            ),
        },
    ];

    if (error) {
        return (
            <div className="text-red-500 p-4">
                {t("leaves.errors.loadFailed")}: {error.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={t("leaves.list.title")}
                actions={
                    hasPermission("create leaves") && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4" />
                            {t("leaves.actions.request")}
                        </button>
                    )
                }
            />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("leaves.filters.employee")}
                        </label>
                        <SearchableSelect
                            value={employeeFilter}
                            onChange={(v) => {
                                setEmployeeFilter(v || "");
                                setPage(1);
                            }}
                            fetchOptions={(params) =>
                                api
                                    .get("/employees?" + params)
                                    .then((r) => r.data)
                            }
                            displayValue={(emp) =>
                                `${emp.employee_code} - ${emp.user?.name || t("common.na")}`
                            }
                            placeholder={t("leaves.filters.allEmployees")}
                            cacheKey="leave-list-employees"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("leaves.filters.status")}
                        </label>
                        <SearchableSelect
                            value={statusFilter}
                            onChange={(v) => {
                                setStatusFilter(v || "");
                                setPage(1);
                            }}
                            options={[
                                { value: "", label: t("leaves.filters.allStatuses") },
                                ...Object.entries(LEAVE_STATUS_LABELS).map(
                                    ([value, label]) => ({
                                        value,
                                        label: t(`leaves.status.${value}`, {
                                            defaultValue: label,
                                        }),
                                    }),
                                ),
                            ]}
                            placeholder={t("leaves.filters.allStatuses")}
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
                    searchPlaceholder={t("leaves.list.searchPlaceholder")}
                    totalRecordName={t("leaves.list.totalRecordName")}
                />
            </div>
            <LeaveFormModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                leaveId={editingLeaveId}
                mode={editingLeaveId ? "edit" : "create"}
            />
            <ConfirmDialog
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
                title={t("leaves.confirmDelete.title")}
                description={t("leaves.confirmDelete.description")}
                confirmLabel={t("leaves.confirmDelete.confirm")}
                cancelLabel={t("common.cancel")}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
