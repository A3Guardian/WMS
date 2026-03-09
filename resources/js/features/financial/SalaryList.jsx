import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import DataTable from "../../components/DataTable";
import SearchableSelect from "../../components/SearchableSelect";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import { formatDate } from "../../utils/formatters";
import { SALARY_TYPE_LABELS } from "../../utils/constants";
import PageHeader from "../../components/PageHeader";

export default function SalaryList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [perPage, setPerPage] = useState(10);
    const [employeeFilter, setEmployeeFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [search, setSearch] = useState("");

    const { data, isLoading, error } = useQuery({
        queryKey: ["salaries", page, perPage, employeeFilter, typeFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (employeeFilter) params.append("employee_id", employeeFilter);
            if (typeFilter) params.append("type", typeFilter);
            const response = await api.get(`/salaries?${params.toString()}`);
            return response.data;
        },
    });

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const deleteMutation = useMutation({
        mutationFn: async (salaryId) => {
            const response = await api.delete(`/salaries/${salaryId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["salaries"] });
            toast.success("Salary deleted successfully");
        },
        onError: (error) => {
            toast.error("Failed to delete salary", {
                description:
                    error.response?.data?.message || "An error occurred",
            });
        },
    });

    const handleDelete = (salary) => {
        if (
            window.confirm(
                `Are you sure you want to delete this salary record?`,
            )
        ) {
            deleteMutation.mutate(salary.id);
        }
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
            header: "Amount",
            accessor: "amount",
            cell: (value) =>
                `$${parseFloat(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
        {
            header: "Type",
            accessor: "type",
            cell: (value) => (
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {SALARY_TYPE_LABELS[value] || value}
                </span>
            ),
        },
        {
            header: "Effective Date",
            accessor: "effective_date",
            cell: (value) => formatDate(value),
        },
        {
            header: "End Date",
            accessor: "end_date",
            cell: (value) => (value ? formatDate(value) : "N/A"),
        },
        {
            header: "Actions",
            accessor: "id",
            cell: (id, row) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => navigate(`/salaries/${id}/edit`)}
                        className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        disabled={!hasPermission("manage salaries")}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(row)}
                        className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        disabled={!hasPermission("manage salaries")}
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    if (error) {
        return (
            <div className="text-red-500 p-4">
                Error loading salaries: {error.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Salaries"
                actions={
                    hasPermission("manage salaries") && (
                        <button
                            onClick={() => navigate("/salaries/create")}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Add Salary
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
                            cacheKey="salary-list-employees"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type
                        </label>
                        <SearchableSelect
                            value={typeFilter}
                            onChange={(v) => {
                                setTypeFilter(v || "");
                                setPage(1);
                            }}
                            options={[
                                { value: "", label: "All Types" },
                                ...Object.entries(SALARY_TYPE_LABELS).map(
                                    ([value, label]) => ({ value, label }),
                                ),
                            ]}
                            placeholder="All Types"
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
                    searchPlaceholder="Search salary records..."
                    totalRecordName="salary records"
                />
            </div>
        </div>
    );
}
