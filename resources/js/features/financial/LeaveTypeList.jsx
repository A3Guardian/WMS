import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import DataTable from "../../components/DataTable";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import PageHeader from "../../components/PageHeader";
import LeaveTypeFormModal from "./LeaveTypeFormModal";

export default function LeaveTypeList() {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingLeaveTypeId, setEditingLeaveTypeId] = useState(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ["leave-types", page, perPage],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            const response = await api.get(`/leave-types?${params.toString()}`);
            return response.data;
        },
    });

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const deleteMutation = useMutation({
        mutationFn: async (leaveTypeId) => {
            const response = await api.delete(`/leave-types/${leaveTypeId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leave-types"] });
            toast.success("Leave type deleted successfully");
        },
        onError: (error) => {
            toast.error("Failed to delete leave type", {
                description:
                    error.response?.data?.message || "An error occurred",
            });
        },
    });

    const handleDelete = (leaveType) => {
        if (
            window.confirm(
                `Are you sure you want to delete leave type "${leaveType.name}"?`,
            )
        ) {
            deleteMutation.mutate(leaveType.id);
        }
    };

    const handleOpenCreate = () => {
        setEditingLeaveTypeId(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (leaveType) => {
        setEditingLeaveTypeId(leaveType.id);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingLeaveTypeId(null);
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
            header: "Name",
            accessor: "name",
        },
        {
            header: "Max Days/Year",
            accessor: "max_days_per_year",
        },
        {
            header: "Carry Forward",
            accessor: "carry_forward",
            cell: (value) => (value ? "Yes" : "No"),
        },
        {
            header: "Status",
            accessor: "is_active",
            cell: (value) => (
                <span
                    className={`px-2 py-1 text-xs rounded-full ${value ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                >
                    {value ? "Active" : "Inactive"}
                </span>
            ),
        },
        {
            header: "Description",
            accessor: "description",
            cell: (value) =>
                value
                    ? value.length > 50
                        ? value.substring(0, 50) + "..."
                        : value
                    : "N/A",
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
                        title="Edit"
                        disabled={!hasPermission("manage leave types")}
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="p-1.5 text-gray-600 hover:text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                        title="Delete"
                        disabled={!hasPermission("manage leave types")}
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
                Error loading leave types: {error.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Leave Types"
                actions={
                    hasPermission("manage leave types") && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4" />
                            Add Leave Type
                        </button>
                    )
                }
            />

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
                    searchPlaceholder="Search leave types..."
                    totalRecordName="leave types"
                />
            </div>
            <LeaveTypeFormModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                leaveTypeId={editingLeaveTypeId}
                mode={editingLeaveTypeId ? "edit" : "create"}
            />
        </div>
    );
}
