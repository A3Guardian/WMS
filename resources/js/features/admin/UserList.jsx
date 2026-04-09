import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Fingerprint, Pencil, Plus, Trash2 } from "lucide-react";
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
    const { t } = useTranslation();
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
            toast.success(t("users.toast.deleted"));
        },
        onError: (error) => {
            toast.error(
                error.response?.data?.message || t("users.toast.deleteFailed"),
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
                {t("users.errors.noPermissionView")}
            </div>
        );
    }

    const columns = [
        { key: "id", label: t("users.list.table.id") },
        { key: "name", label: t("users.list.table.name") },
        { key: "email", label: t("users.list.table.email") },
        {
            key: "roles",
            label: t("users.list.table.roles"),
            render: (roles) => {
                if (!roles || roles.length === 0)
                    return t("users.list.noRoles");
                return roles.map((role) => role.name || role).join(", ");
            },
        },
        {
            key: "actions",
            label: t("users.list.table.actions"),
            render: (_, row) => (
                <div className="flex items-center justify-end gap-1">
                    {hasPermission("edit users") && (
                        <button
                            type="button"
                            onClick={() => handleOpenEdit(row)}
                            className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title={t("users.actions.edit")}
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
                            title={t("users.actions.delete")}
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
            toast.warning(t("common.permissionDenied"), {
                description: errorMessage,
            });
        } else {
            toast.error(t("users.errors.loadFailed"), {
                description: errorMessage,
            });
        }

        return (
            <div
                className={`p-4 rounded ${isPermissionError ? "bg-yellow-50 text-yellow-800" : "bg-red-50 text-red-800"}`}
            >
                <p className="font-semibold">
                    {isPermissionError
                        ? t("common.permissionDenied")
                        : t("common.error")}
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
                title={t("users.list.title")}
                actions={
                    <div className="flex items-center gap-2">
                        {hasPermission("edit users") && (
                            <button
                                type="button"
                                onClick={() => navigate("/admin/biometric-events")}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 inline-flex items-center gap-2"
                            >
                                <Fingerprint className="w-4 h-4" />
                                Biometric Events
                            </button>
                        )}
                        {hasPermission("create users") && (
                            <button
                                type="button"
                                onClick={handleOpenCreate}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 inline-flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                {t("users.actions.create")}
                            </button>
                        )}
                    </div>
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
                    searchPlaceholder={t("users.list.searchPlaceholder")}
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
                    totalRecordName={t("users.list.totalRecordName")}
                />
            </div>
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t("users.confirmDelete.title")}
                description={
                    userToDelete
                        ? t("users.confirmDelete.description", {
                              email: userToDelete.email,
                          })
                        : ""
                }
                confirmLabel={t("users.confirmDelete.confirm")}
                cancelLabel={t("common.cancel")}
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
