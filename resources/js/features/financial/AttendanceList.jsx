import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Plus } from "lucide-react";
import DataTable from "../../components/DataTable";
import SearchableSelect from "../../components/SearchableSelect";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import { formatDate, formatDateTime } from "../../utils/formatters";
import { ATTENDANCE_STATUS_LABELS } from "../../utils/constants";
import PageHeader from "../../components/PageHeader";
import AttendanceFormModal from "./AttendanceFormModal";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function AttendanceList() {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [employeeFilter, setEmployeeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAttendanceId, setEditingAttendanceId] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [attendanceToDelete, setAttendanceToDelete] = useState(null);

    const { data, isLoading, error } = useQuery({
        queryKey: [
            "attendance",
            page,
            perPage,
            employeeFilter,
            statusFilter,
            dateFrom,
            dateTo,
        ],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (employeeFilter) params.append("employee_id", employeeFilter);
            if (statusFilter) params.append("status", statusFilter);
            if (dateFrom) params.append("date_from", dateFrom);
            if (dateTo) params.append("date_to", dateTo);
            const response = await api.get(`/attendance?${params.toString()}`);
            return response.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (attendanceId) => {
            const response = await api.delete(`/attendance/${attendanceId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["attendance"] });
            toast.success(t("attendance.toast.deleted"));
        },
        onError: (error) => {
            toast.error(t("attendance.toast.deleteFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const handleDeleteClick = (attendance) => {
        setAttendanceToDelete(attendance);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!attendanceToDelete) return;
        deleteMutation.mutate(attendanceToDelete.id, {
            onSettled: () => setAttendanceToDelete(null),
        });
    };

    const handleOpenCreate = () => {
        setEditingAttendanceId(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (attendance) => {
        setEditingAttendanceId(attendance.id);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingAttendanceId(null);
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
            header: t("attendance.list.table.employee"),
            accessor: (row) =>
                row.employee?.user?.name ||
                row.employee?.employee_code ||
                t("common.na"),
        },
        {
            header: t("attendance.list.table.date"),
            accessor: "date",
            cell: (value) => formatDate(value),
        },
        {
            header: t("attendance.list.table.clockIn"),
            accessor: "clock_in",
            cell: (value) => (value ? formatDateTime(value) : t("common.na")),
        },
        {
            header: t("attendance.list.table.clockOut"),
            accessor: "clock_out",
            cell: (value) => (value ? formatDateTime(value) : t("common.na")),
        },
        {
            header: t("attendance.list.table.totalHours"),
            accessor: "total_hours",
            cell: (value) => (value ? `${value}h` : t("common.na")),
        },
        {
            header: t("attendance.list.table.overtime"),
            accessor: "overtime_hours",
            cell: (value) => (value > 0 ? `${value}h` : t("common.na")),
        },
        {
            header: t("attendance.list.table.status"),
            accessor: "status",
            cell: (value) => {
                const colors = {
                    present: "bg-green-100 text-green-800",
                    absent: "bg-red-100 text-red-800",
                    late: "bg-yellow-100 text-yellow-800",
                    half_day: "bg-blue-100 text-blue-800",
                    on_leave: "bg-purple-100 text-purple-800",
                };
                return (
                    <span
                        className={`px-2 py-1 text-xs rounded-full ${colors[value] || "bg-gray-100 text-gray-800"}`}
                    >
                        {t(`attendance.status.${value}`, {
                            defaultValue: ATTENDANCE_STATUS_LABELS[value] || value,
                        })}
                    </span>
                );
            },
        },
        {
            header: t("attendance.list.table.actions"),
            accessor: "id",
            align: "center",
            cell: (id, row) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleOpenEdit(row)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-blue-50"
                        title={t("attendance.actions.edit")}
                        disabled={!hasPermission("manage attendance")}
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeleteClick(row)}
                        className="p-1.5 text-gray-600 hover:text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                        title={t("attendance.actions.delete")}
                        disabled={!hasPermission("manage attendance")}
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
                {t("attendance.errors.loadFailed")}: {error.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={t("attendance.list.title")}
                actions={
                    hasPermission("manage attendance") && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4" />
                            {t("attendance.actions.create")}
                        </button>
                    )
                }
            />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("attendance.filters.employee")}
                        </label>
                        <SearchableSelect
                            value={employeeFilter}
                            onChange={(v) => {
                                setEmployeeFilter(v || "");
                                setPage(1);
                            }}
                            fetchOptions={(params) =>
                                api.get("/employees?" + params).then((r) => r.data)
                            }
                            displayValue={(emp) =>
                                `${emp.employee_code} - ${emp.user?.name || t("common.na")}`
                            }
                            placeholder={t("attendance.filters.allEmployees")}
                            cacheKey="attendance-list-employees"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("attendance.filters.status")}
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
                                    label: t("attendance.filters.allStatuses"),
                                },
                                ...Object.entries(ATTENDANCE_STATUS_LABELS).map(
                                    ([value, label]) => ({
                                        value,
                                        label: t(`attendance.status.${value}`, {
                                            defaultValue: label,
                                        }),
                                    }),
                                ),
                            ]}
                            placeholder={t("attendance.filters.allStatuses")}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("attendance.filters.dateFrom")}
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                                setDateFrom(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("attendance.filters.dateTo")}
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                                setDateTo(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    onPerPageChange={handlePerPageChange}
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
                    searchPlaceholder={t("attendance.list.searchPlaceholder")}
                    totalRecordName={t("attendance.list.totalRecordName")}
                />
            </div>
            <AttendanceFormModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                attendanceId={editingAttendanceId}
                mode={editingAttendanceId ? "edit" : "create"}
            />
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t("attendance.confirmDelete.title")}
                description={t("attendance.confirmDelete.description")}
                confirmLabel={t("attendance.confirmDelete.confirm")}
                cancelLabel={t("common.cancel")}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
