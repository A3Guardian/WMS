import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import DataTable from "../../components/DataTable";
import SearchableSelect from "../../components/SearchableSelect";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import {
    PAYROLL_STATUS_LABELS,
    PAYROLL_STATUS_COLORS,
} from "../../utils/constants";
import PageHeader from "../../components/PageHeader";

export default function PayrollRecordList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [employeeFilter, setEmployeeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [yearFilter, setYearFilter] = useState("");
    const [search, setSearch] = useState("");

    const { data, isLoading, error } = useQuery({
        queryKey: [
            "payroll-records",
            page,
            perPage,
            employeeFilter,
            statusFilter,
            monthFilter,
            yearFilter,
        ],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (employeeFilter) params.append("employee_id", employeeFilter);
            if (statusFilter) params.append("status", statusFilter);
            if (monthFilter) params.append("month", monthFilter);
            if (yearFilter) params.append("year", yearFilter);
            const response = await api.get(
                `/payroll-records?${params.toString()}`,
            );
            return response.data;
        },
    });

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const deleteMutation = useMutation({
        mutationFn: async (payrollRecordId) => {
            const response = await api.delete(
                `/payroll-records/${payrollRecordId}`,
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payroll-records"] });
            toast.success("Payroll record deleted successfully");
        },
        onError: (error) => {
            toast.error("Failed to delete payroll record", {
                description:
                    error.response?.data?.message || "An error occurred",
            });
        },
    });

    const handleDelete = (payrollRecord) => {
        if (
            window.confirm(
                `Are you sure you want to delete this payroll record?`,
            )
        ) {
            deleteMutation.mutate(payrollRecord.id);
        }
    };

    const getStatusBadge = (status) => {
        const color = PAYROLL_STATUS_COLORS[status] || "gray";
        const label = PAYROLL_STATUS_LABELS[status] || status;

        const colorClasses = {
            blue: "bg-blue-100 text-blue-800",
            green: "bg-green-100 text-green-800",
            gray: "bg-gray-100 text-gray-800",
            red: "bg-red-100 text-red-800",
        };

        return (
            <span
                className={`px-2 py-1 text-xs rounded-full ${colorClasses[color] || colorClasses.gray}`}
            >
                {label}
            </span>
        );
    };

    const getMonthName = (month) => {
        const months = [
            "",
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ];
        return months[month] || month;
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
            header: "Period",
            accessor: (row) => `${getMonthName(row.month)} ${row.year}`,
        },
        {
            header: "Base Salary",
            accessor: "base_salary",
            cell: (value) =>
                `$${parseFloat(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
        {
            header: "Bonuses",
            accessor: "bonuses",
            cell: (value) =>
                `$${parseFloat(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
        {
            header: "Deductions",
            accessor: "deductions",
            cell: (value) =>
                `$${parseFloat(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
        {
            header: "Net Salary",
            accessor: "net_salary",
            cell: (value) => (
                <span className="font-semibold">
                    $
                    {parseFloat(value).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </span>
            ),
        },
        {
            header: "Status",
            accessor: "status",
            cell: (value) => getStatusBadge(value),
        },
        {
            header: "Actions",
            accessor: "id",
            cell: (id, row) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => navigate(`/payroll-records/${id}/edit`)}
                        className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        disabled={!hasPermission("manage payroll")}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(row)}
                        className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        disabled={!hasPermission("manage payroll")}
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

    if (error) {
        return (
            <div className="text-red-500 p-4">
                Error loading payroll records: {error.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Payroll Records"
                actions={
                    hasPermission("manage payroll") && (
                        <button
                            onClick={() => navigate("/payroll-records/create")}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Create Payroll
                        </button>
                    )
                }
            />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                            cacheKey="payroll-list-employees"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Month
                        </label>
                        <SearchableSelect
                            value={monthFilter}
                            onChange={(v) => {
                                setMonthFilter(v || "");
                                setPage(1);
                            }}
                            options={[
                                { value: "", label: "All Months" },
                                ...Array.from({ length: 12 }, (_, i) => ({
                                    value: String(i + 1),
                                    label: new Date(2000, i).toLocaleString(
                                        "default",
                                        { month: "long" },
                                    ),
                                })),
                            ]}
                            placeholder="All Months"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Year
                        </label>
                        <SearchableSelect
                            value={yearFilter}
                            onChange={(v) => {
                                setYearFilter(v || "");
                                setPage(1);
                            }}
                            options={[
                                { value: "", label: "All Years" },
                                ...years.map((y) => ({
                                    value: String(y),
                                    label: String(y),
                                })),
                            ]}
                            placeholder="All Years"
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
                                ...Object.entries(PAYROLL_STATUS_LABELS).map(
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
                    searchPlaceholder="Search payroll records..."
                    totalRecordName="payroll records"
                />
            </div>
        </div>
    );
}
