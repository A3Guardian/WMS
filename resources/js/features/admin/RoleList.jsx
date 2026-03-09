import React, { useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import DataTable from "../../components/DataTable";
import { usePermissions } from "../../hooks/usePermissions";

export default function RoleList() {
    const { hasPermission } = usePermissions();
    const { data, loading, error } = useFetch("roles", "/admin/roles");
    const [perPage, setPerPage] = useState(20);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    if (!hasPermission("view roles")) {
        return (
            <div className="text-red-500 p-4">
                You don't have permission to view roles.
            </div>
        );
    }

    const allData = data || [];
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
            <h1 className="text-3xl font-bold mb-6">Roles & Permissions</h1>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataTable
                    columns={columns}
                    data={displayData}
                    loading={loading}
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
        </div>
    );
}
