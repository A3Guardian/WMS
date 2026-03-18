import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import DataTable from "../../components/DataTable";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import PageHeader from "../../components/PageHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import UserFormModal from "./UserFormModal";

export default function UserList() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: routeUserId } = useParams();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [perPage, setPerPage] = useState(20);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [formModalMode, setFormModalMode] = useState("create"); // "create" | "edit"
    const [selectedUserId, setSelectedUserId] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const { data, loading, error } = useQuery({
        queryKey: ["users", page, debouncedSearch, perPage],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (debouncedSearch) {
                params.append("search", debouncedSearch);
            }
            const response = await api.get(`/admin/users?${params.toString()}`);
            return response.data;
        },
    });

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const deleteMutation = useMutation({
        mutationFn: async (userId) => {
            await api.delete(`/admin/users/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("User deleted successfully");
        },
        onError: (error) => {
            toast.error(
                error.response?.data?.message || "Failed to delete user",
            );
        },
    });

    const handleDeleteClick = (row) => {
        setUserToDelete(row);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!userToDelete) return;
        deleteMutation.mutate(userToDelete.id, {
            onSettled: () => setUserToDelete(null),
        });
    };

    const handleOpenCreate = () => {
        setSelectedUserId(null);
        setFormModalMode("create");
        setFormModalOpen(true);
    };

    const handleOpenEdit = (row) => {
        setSelectedUserId(row?.id);
        setFormModalMode("edit");
        setFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        setFormModalOpen(false);
        setSelectedUserId(null);
        if (
            location.pathname.endsWith("/create") ||
            location.pathname.endsWith("/edit")
        ) {
            navigate("/admin/users");
        }
    };

    useEffect(() => {
        if (location.pathname.endsWith("/admin/users/create")) {
            handleOpenCreate();
            return;
        }
        if (location.pathname.endsWith("/edit") && routeUserId) {
            setSelectedUserId(routeUserId);
            setFormModalMode("edit");
            setFormModalOpen(true);
        }
    }, [location.pathname, routeUserId]);

    if (!hasPermission("view users")) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to view users.
            </div>
        );
    }

    const columns = [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        {
            key: "roles",
            label: "Roles",
            render: (roles) => {
                if (!roles || roles.length === 0) return "No roles";
                return roles.map((role) => role.name || role).join(", ");
            },
        },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center justify-end gap-1">
                    {hasPermission("edit users") && (
                        <button
                            type="button"
                            onClick={() => handleOpenEdit(row)}
                            className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Edit"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    {hasPermission("delete users") && (
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

        if (isPermissionError) {
            toast.warning("Permission Denied", {
                description: errorMessage,
            });
        } else {
            toast.error("Error loading users", {
                description: errorMessage,
            });
        }

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

    const users = data?.data || [];
    const currentPage = data?.current_page || 1;
    const lastPage = data?.last_page || 1;

    return (
        <div>
            <PageHeader
                title="Users"
                actions={
                    hasPermission("create users") && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create User
                        </button>
                    )
                }
            />

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataTable
                    columns={columns}
                    data={users}
                    loading={loading}
                    perPage={perPage}
                    onPerPageChange={handlePerPageChange}
                    searchValue={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search users by name or email..."
                    pagination={
                        data
                            ? {
                                  currentPage,
                                  lastPage,
                                  total: data.total || 0,
                                  perPage,
                                  onPageChange: setPage,
                              }
                            : undefined
                    }
                    totalRecordName="users"
                />
            </div>
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete user?"
                description={
                    userToDelete
                        ? `Are you sure you want to delete user ${userToDelete.email}?`
                        : ""
                }
                confirmLabel="Yes, delete"
                cancelLabel="Cancel"
                onConfirm={handleConfirmDelete}
            />
            <UserFormModal
                isOpen={formModalOpen}
                onClose={handleCloseFormModal}
                userId={selectedUserId}
                mode={formModalMode}
            />
        </div>
    );
}
