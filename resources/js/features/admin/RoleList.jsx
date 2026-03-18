import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import DataTable from "../../components/DataTable";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import PageHeader from "../../components/PageHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import RoleFormModal from "./RoleFormModal";

export default function RoleList() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: routeRoleId } = useParams();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [perPage, setPerPage] = useState(20);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState(null);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [formModalMode, setFormModalMode] = useState("create"); // "create" | "edit"
    const [selectedRoleId, setSelectedRoleId] = useState(null);

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const { data, isLoading, error } = useQuery({
        queryKey: ["roles"],
        queryFn: async () => {
            const response = await api.get("/admin/roles");
            return response.data;
        },
        enabled: hasPermission("view roles"),
    });

    const deleteMutation = useMutation({
        mutationFn: async (roleId) => {
            await api.delete(`/admin/roles/${roleId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            toast.success("Role deleted successfully");
        },
        onError: (error) => {
            toast.error(
                error.response?.data?.message || "Failed to delete role",
            );
        },
    });

    const handleDeleteClick = (row) => {
        setRoleToDelete(row);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!roleToDelete) return;
        deleteMutation.mutate(roleToDelete.id, {
            onSettled: () => setRoleToDelete(null),
        });
    };

    const handleOpenCreate = () => {
        setSelectedRoleId(null);
        setFormModalMode("create");
        setFormModalOpen(true);
    };

    const handleOpenEdit = (row) => {
        setSelectedRoleId(row?.id);
        setFormModalMode("edit");
        setFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        setFormModalOpen(false);
        setSelectedRoleId(null);
        if (
            location.pathname.endsWith("/create") ||
            location.pathname.endsWith("/edit")
        ) {
            navigate("/admin/roles");
        }
    };

    useEffect(() => {
        if (location.pathname.endsWith("/admin/roles/create")) {
            handleOpenCreate();
            return;
        }
        if (location.pathname.endsWith("/edit") && routeRoleId) {
            setSelectedRoleId(routeRoleId);
            setFormModalMode("edit");
            setFormModalOpen(true);
        }
    }, [location.pathname, routeRoleId]);

    if (!hasPermission("view roles")) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to view roles.
            </div>
        );
    }

    const allData = data || [];
    const filteredData = useMemo(() => {
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

    const columns = [
        { key: "id", label: "ID" },
        { key: "name", label: "Role Name" },
        {
            key: "permissions",
            label: "Permissions",
            render: (permissions) => {
                if (!permissions || permissions.length === 0)
                    return "No permissions";
                return permissions.map((p) => p.name).join(", ");
            },
        },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center justify-end gap-1">
                    {hasPermission("edit roles") && (
                        <button
                            type="button"
                            onClick={() => handleOpenEdit(row)}
                            className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Edit"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    {hasPermission("delete roles") && (
                        <button
                            type="button"
                            onClick={() => handleDeleteClick(row)}
                            disabled={deleteMutation.isPending}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Delete"
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
            error?.response?.data?.message || error?.message || "Unknown error";
        const isPermissionError = error?.response?.status === 403;

        return (
            <div
                className={`p-4 rounded ${isPermissionError ? "bg-yellow-50 text-yellow-800" : "bg-red-50 text-red-800"}`}
            >
                <p className="font-semibold">
                    {isPermissionError ? "Permission Denied" : "Error"}
                </p>
                <p>{errorMessage}</p>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Roles & Permissions"
                actions={
                    hasPermission("create roles") && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create Role
                        </button>
                    )
                }
            />
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataTable
                    columns={columns}
                    data={displayData}
                    loading={isLoading}
                    perPage={perPage}
                    onPerPageChange={handlePerPageChange}
                    searchValue={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search roles..."
                    pagination={{
                        currentPage: page,
                        lastPage,
                        total: filteredData.length,
                        onPageChange: setPage,
                    }}
                    totalRecordName="roles"
                />
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete role"
                description={
                    roleToDelete
                        ? `Are you sure you want to delete "${roleToDelete.name}"?`
                        : "Are you sure you want to delete this role?"
                }
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleConfirmDelete}
                loading={deleteMutation.isPending}
            />

            <RoleFormModal
                isOpen={formModalOpen}
                onClose={handleCloseFormModal}
                roleId={selectedRoleId}
                mode={formModalMode}
            />
        </div>
    );
}
