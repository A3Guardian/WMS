import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Settings, Trash2 } from "lucide-react";
import DataTable from "../../components/DataTable";
import SearchableSelect from "../../components/SearchableSelect";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import PageHeader from "../../components/PageHeader";

export default function DepositList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [statusFilter, setStatusFilter] = useState("");
    const [locationFilter, setLocationFilter] = useState("");
    const [search, setSearch] = useState("");

    const { data, isLoading, error } = useQuery({
        queryKey: ["deposits", page, perPage, statusFilter, locationFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (statusFilter) params.append("status", statusFilter);
            if (locationFilter) params.append("location", locationFilter);
            const response = await api.get(`/deposits?${params.toString()}`);
            return response.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (depositId) => {
            const response = await api.delete(`/deposits/${depositId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deposits"] });
            toast.success("Deposit deleted successfully");
        },
        onError: (error) => {
            toast.error("Failed to delete deposit", {
                description:
                    error.response?.data?.message || "An error occurred",
            });
        },
    });

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const handleDelete = (deposit) => {
        if (
            window.confirm(
                `Are you sure you want to delete deposit "${deposit.name}"?`,
            )
        ) {
            deleteMutation.mutate(deposit.id);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            active: "bg-green-100 text-green-800",
            inactive: "bg-gray-100 text-gray-800",
            maintenance: "bg-yellow-100 text-yellow-800",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    const formatDimensions = (width, height, depth) => {
        if (width && height && depth) {
            return `${width}m × ${height}m × ${depth}m`;
        }
        return "N/A";
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
            header: "Code",
            accessor: "code",
            cell: (value) => value || "N/A",
        },
        {
            header: "Location",
            accessor: "location",
            cell: (value) => value || "N/A",
        },
        {
            header: "Dimensions",
            accessor: (row) =>
                formatDimensions(row.width, row.height, row.depth),
        },
        {
            header: "Capacity",
            accessor: "capacity",
            cell: (value) => (value ? `${value} m³` : "N/A"),
        },
        {
            header: "Status",
            accessor: "status",
            cell: (value) => (
                <span
                    className={`px-2 py-1 text-xs rounded-full ${getStatusColor(value)}`}
                >
                    {value ? value.toUpperCase() : "N/A"}
                </span>
            ),
        },
        {
            header: "Actions",
            accessor: "id",
            align: "right",
            cell: (id, row) => (
                <div className="flex items-center justify-end gap-1">
                    {hasPermission("edit deposits") && (
                        <button
                            onClick={() => navigate(`/deposits/${id}/configure`)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Configure"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    )}
                    {hasPermission("edit deposits") && (
                        <button
                            onClick={() => navigate(`/deposits/${id}/edit`)}
                            className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Edit"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    {hasPermission("delete deposits") && (
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
        return (
            <div className="text-red-500 p-4">
                Error loading deposits: {error.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Storage Deposits"
                actions={
                    hasPermission("create deposits") && (
                        <button
                            onClick={() => navigate("/deposits/create")}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Add Deposit
                        </button>
                    )
                }
            />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                { value: "active", label: "Active" },
                                { value: "inactive", label: "Inactive" },
                                { value: "maintenance", label: "Maintenance" },
                            ]}
                            placeholder="All Statuses"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Location
                        </label>
                        <input
                            type="text"
                            value={locationFilter}
                            onChange={(e) => {
                                setLocationFilter(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Filter by location"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                    searchPlaceholder="Search deposits..."
                    totalRecordName="deposits"
                />
            </div>
        </div>
    );
}
