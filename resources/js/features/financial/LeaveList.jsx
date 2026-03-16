import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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

export default function LeaveList() {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [employeeFilter, setEmployeeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingLeaveId, setEditingLeaveId] = useState(null);

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
            toast.success("Leave approved successfully");
        },
        onError: (error) => {
            toast.error("Failed to approve leave", {
                description:
                    error.response?.data?.message || "An error occurred",
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
            toast.success("Leave rejected successfully");
        },
        onError: (error) => {
            toast.error("Failed to reject leave", {
                description:
                    error.response?.data?.message || "An error occurred",
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
            toast.success("Leave deleted successfully");
        },
        onError: (error) => {
            toast.error("Failed to delete leave", {
                description:
                    error.response?.data?.message || "An error occurred",
            });
        },
    });

    const handleApprove = (leave) => {
        if (
            window.confirm(
                `Approve leave request for ${leave.employee?.user?.name || leave.employee?.employee_code}?`,
            )
        ) {
            approveMutation.mutate(leave.id);
        }
    };

    const handleReject = (leave) => {
        const reason = window.prompt("Enter rejection reason:");
        if (reason !== null && reason.trim()) {
            rejectMutation.mutate({ leaveId: leave.id, reason: reason.trim() });
        }
    };

    const handleDelete = (leave) => {
        if (
            window.confirm(
                `Are you sure you want to delete this leave request?`,
            )
        ) {
            deleteMutation.mutate(leave.id);
        }
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
        const label = LEAVE_STATUS_LABELS[status] || status;

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
            header: "Employee",
            accessor: (row) =>
                row.employee?.user?.name ||
                row.employee?.employee_code ||
                "N/A",
        },
        {
            header: "Leave Type",
            accessor: (row) => row.leave_type?.name || "N/A",
        },
        {
            header: "Start Date",
            accessor: "start_date",
            cell: (value) => formatDate(value),
        },
        {
            header: "End Date",
            accessor: "end_date",
            cell: (value) => formatDate(value),
        },
        {
            header: "Days",
            accessor: "days",
        },
        {
            header: "Status",
            accessor: "status",
            cell: (value) => getStatusBadge(value),
        },
        {
            header: "Actions",
            accessor: "id",
            align: "center",
            cell: (id, row) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleOpenEdit(row)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-blue-50"
                        title="View / Edit"
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
                            onClick={() => handleDelete(row)}
                            className="p-1.5 text-gray-600 hover:text-red-600 rounded hover:bg-red-50"
                            title="Delete"
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
                                    title="Approve"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleReject(row)}
                                    className="p-1.5 text-red-600 hover:text-red-700 rounded hover:bg-red-50"
                                    title="Reject"
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
                Error loading leaves: {error.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Leaves"
                actions={
                    hasPermission("create leaves") && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4" />
                            Request Leave
                        </button>
                    )
                }
            />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Employee
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
                                `${emp.employee_code} - ${emp.user?.name || "N/A"}`
                            }
                            placeholder="All Employees"
                            cacheKey="leave-list-employees"
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
                                ...Object.entries(LEAVE_STATUS_LABELS).map(
                                    ([value, label]) => ({ value, label }),
                                ),
                            ]}
                            placeholder="All Statuses"
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
                    searchPlaceholder="Search leave requests..."
                    totalRecordName="leave requests"
                />
            </div>
            <LeaveFormModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                leaveId={editingLeaveId}
                mode={editingLeaveId ? "edit" : "create"}
            />
        </div>
    );
}
