import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";
import DataTable from "../../components/DataTable";
import SearchableSelect from "../../components/SearchableSelect";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import { formatDate } from "../../utils/formatters";
import PageHeader from "../../components/PageHeader";
import EmployeeFormModal from "./EmployeeFormModal";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function EmployeeList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [perPage, setPerPage] = useState(10);
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create"); // "create" | "edit" | "view"
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, isLoading, error } = useQuery({
        queryKey: [
            "employees",
            page,
            debouncedSearch,
            perPage,
            departmentFilter,
            statusFilter,
        ],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (debouncedSearch) params.append("search", debouncedSearch);
            if (departmentFilter)
                params.append("department_id", departmentFilter);
            if (statusFilter) params.append("status", statusFilter);
            const response = await api.get(`/employees?${params.toString()}`);
            return response.data;
        },
    });

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const deleteMutation = useMutation({
        mutationFn: async (employeeId) => {
            const response = await api.delete(`/employees/${employeeId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["employees"] });
            toast.success(t("employees.toast.deleted"));
        },
        onError: (error) => {
            toast.error(t("employees.toast.deleteFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const handleDeleteClick = (employee) => {
        setEmployeeToDelete(employee);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!employeeToDelete) return;
        deleteMutation.mutate(employeeToDelete.id, {
            onSettled: () => setEmployeeToDelete(null),
        });
    };

    const handleOpenCreate = () => {
        setSelectedEmployeeId(null);
        setModalMode("create");
        setModalOpen(true);
    };

    const handleOpenEdit = (employee) => {
        setSelectedEmployeeId(employee.id);
        setModalMode("edit");
        setModalOpen(true);
    };

    const handleOpenView = (employee) => {
        navigate(`/employees/${employee.id}`);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedEmployeeId(null);
    };

    const columns = [
        {
            header: t("employees.list.table.employeeCode"),
            accessor: "employee_code",
        },
        {
            header: t("employees.list.table.name"),
            accessor: (row) => row.user?.name || t("common.na"),
        },
        {
            header: t("employees.list.table.position"),
            accessor: "position",
        },
        {
            header: t("employees.list.table.employmentType"),
            accessor: "employment_type",
            cell: (value) => (
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {t(`employees.employmentType.${value}`, {
                        defaultValue: value,
                    })}
                </span>
            ),
        },
        {
            header: t("employees.list.table.status"),
            accessor: "status",
            cell: (value) => {
                const colors = {
                    active: "bg-green-100 text-green-800",
                    inactive: "bg-gray-100 text-gray-800",
                    terminated: "bg-red-100 text-red-800",
                    on_leave: "bg-yellow-100 text-yellow-800",
                };
                return (
                    <span
                        className={`px-2 py-1 text-xs rounded-full ${colors[value] || colors.inactive}`}
                    >
                        {t(`employees.status.${value}`, { defaultValue: value })}
                    </span>
                );
            },
        },
        {
            header: t("employees.list.table.actions"),
            accessor: "id",
            cell: (_id, row) => (
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleOpenView(row)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-blue-50"
                        title={t("employees.actions.view")}
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOpenEdit(row)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-blue-50"
                        title={t("employees.actions.edit")}
                        disabled={!hasPermission("edit employees")}
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeleteClick(row)}
                        className="p-1.5 text-gray-600 hover:text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                        title={t("employees.actions.delete")}
                        disabled={!hasPermission("delete employees")}
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
                {t("employees.errors.loadFailed")}: {error.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={t("employees.list.title")}
                actions={
                    hasPermission("create employees") && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4" />
                            {t("employees.actions.add")}
                        </button>
                    )
                }
            />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("employees.list.filters.department")}
                        </label>
                        <SearchableSelect
                            value={departmentFilter}
                            onChange={(v) => {
                                setDepartmentFilter(v || "");
                                setPage(1);
                            }}
                            fetchOptions={(params) => api.get("/departments?" + params).then((r) => r.data)}
                            displayValue={(d) => d?.name}
                            placeholder={t("employees.list.filters.allDepartments")}
                            cacheKey="employee-list-departments"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("employees.list.filters.status")}
                        </label>
                        <SearchableSelect
                            value={statusFilter}
                            onChange={(v) => {
                                setStatusFilter(v || "");
                                setPage(1);
                            }}
                            options={[
                                {
                                    value: "",
                                    label: t("employees.list.filters.allStatuses"),
                                },
                                {
                                    value: "active",
                                    label: t("employees.status.active"),
                                },
                                {
                                    value: "inactive",
                                    label: t("employees.status.inactive"),
                                },
                                {
                                    value: "terminated",
                                    label: t("employees.status.terminated"),
                                },
                                {
                                    value: "on_leave",
                                    label: t("employees.status.on_leave"),
                                },
                            ]}
                            placeholder={t("employees.list.filters.allStatuses")}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataTable
                    columns={columns}
                    data={data?.data || []}
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
                    onPerPageChange={handlePerPageChange}
                    searchValue={search}
                    onSearchChange={setSearch}
                    searchPlaceholder={t("employees.list.searchPlaceholder")}
                    totalRecordName={t("employees.list.totalRecordName")}
                />
            </div>
            <EmployeeFormModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                employeeId={selectedEmployeeId}
                mode={modalMode}
            />
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t("employees.confirmDelete.title")}
                description={
                    employeeToDelete
                        ? t("employees.confirmDelete.description", {
                              code: employeeToDelete.employee_code,
                          })
                        : ""
                }
                confirmLabel={t("employees.confirmDelete.confirm")}
                cancelLabel={t("common.cancel")}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
