import React, { useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import DataTable from "../../components/DataTable";
import PageHeader from "../../components/PageHeader";
import { usePermissions } from "../../hooks/usePermissions";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import api from "../../utils/api";
import SupplierFormModal from "./SupplierFormModal";
import { useNavigate } from "react-router-dom";

export default function SupplierList() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { data, loading, error } = useFetch("suppliers", "/suppliers");
    const { hasPermission } = usePermissions();
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [perPage, setPerPage] = useState(20);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

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
        mutationFn: (id) => api.delete(`/suppliers/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast.success("Supplier deleted");
            setSelectedSupplier(null);
        },
        onError: (err) => {
            toast.error(
                err.response?.data?.message || "Failed to delete supplier",
            );
        },
    });

    const handleDelete = (row) => {
        if (window.confirm(`Delete supplier "${row.name}"?`)) {
            deleteMutation.mutate(row.id);
        }
    };

    const columns = [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "contact_person", label: "Contact Person" },
        {
            key: "actions",
            label: "Actions",
            align: "right",
            render: (_, row) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={() => navigate(`/suppliers/${row.id}`)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    {hasPermission("edit suppliers") && (
                        <button
                            onClick={() => {
                                setSelectedSupplier(row);
                                setFormModalOpen(true);
                            }}
                            className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Edit"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    {hasPermission("delete suppliers") && (
                        <button
                            onClick={() => handleDelete(row)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
                title="Suppliers"
                actions={
                    hasPermission("create suppliers") && (
                        <button
                            onClick={() => {
                                setSelectedSupplier(null);
                                setFormModalOpen(true);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Add supplier
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
                    searchPlaceholder="Search suppliers..."
                    pagination={{
                        currentPage: page,
                        lastPage,
                        total: filteredData.length,
                        onPageChange: setPage,
                    }}
                    totalRecordName="suppliers"
                />
            </div>

            <SupplierFormModal
                isOpen={formModalOpen}
                onClose={() => {
                    setFormModalOpen(false);
                    setSelectedSupplier(null);
                }}
                supplier={selectedSupplier}
            />
        </div>
    );
}
