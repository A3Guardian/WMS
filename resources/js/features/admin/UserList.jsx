import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import DataTable from "../../components/DataTable";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import PageHeader from "../../components/PageHeader";

export default function UserList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [perPage, setPerPage] = useState(20);

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

    const handleDelete = async (userId) => {
        if (window.confirm("Are you sure you want to delete this user?")) {
            deleteMutation.mutate(userId);
        }
    };

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
                <div className="flex space-x-2">
                    {hasPermission("edit users") && (
                        <button
                            onClick={() =>
                                navigate(`/admin/users/${row.id}/edit`)
                            }
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Edit
                        </button>
                    )}
                    {hasPermission("delete users") && (
                        <button
                            onClick={() => handleDelete(row.id)}
                            disabled={deleteMutation.isPending}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                            Delete
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
                            onClick={() => navigate("/admin/users/create")}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
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
        </div>
    );
}
