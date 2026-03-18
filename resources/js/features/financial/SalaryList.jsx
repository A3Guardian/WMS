import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Plus } from "lucide-react";
import DataTable from "../../components/DataTable";
import SearchableSelect from "../../components/SearchableSelect";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import { formatDate } from "../../utils/formatters";
import { SALARY_TYPE_LABELS } from "../../utils/constants";
import PageHeader from "../../components/PageHeader";
import SalaryFormModal from "./SalaryFormModal";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function SalaryList() {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [perPage, setPerPage] = useState(10);
    const [employeeFilter, setEmployeeFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSalaryId, setEditingSalaryId] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [salaryToDelete, setSalaryToDelete] = useState(null);

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
            toast.success(t("salaries.toast.deleted"));
        },
        onError: (error) => {
            toast.error(t("salaries.toast.deleteFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const handleDeleteClick = (salary) => {
        setSalaryToDelete(salary);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!salaryToDelete) return;
        deleteMutation.mutate(salaryToDelete.id, {
            onSettled: () => setSalaryToDelete(null),
        });
    };

    const pageData = data?.data || [];
    const filteredData = React.useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return pageData;
        return pageData.filter((row) =>
            JSON.stringify(row).toLowerCase().includes(s),
        );
    }, [pageData, search]);

    const handleOpenCreate = () => {
        setEditingSalaryId(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (salary) => {
        setEditingSalaryId(salary.id);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingSalaryId(null);
    };

    const columns = [
        {
            header: t("salaries.list.table.employee"),
            accessor: (row) =>
                row.employee?.user?.name ||
                row.employee?.employee_code ||
                t("common.na"),
        },
        {
            header: t("salaries.list.table.amount"),
            accessor: "amount",
            cell: (value) =>
                `$${parseFloat(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
        {
            header: t("salaries.list.table.type"),
            accessor: "type",
            cell: (value) => (
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {t(`salaries.type.${value}`, {
                        defaultValue: SALARY_TYPE_LABELS[value] || value,
                    })}
                </span>
            ),
        },
        {
            header: t("salaries.list.table.effectiveDate"),
            accessor: "effective_date",
            cell: (value) => formatDate(value),
        },
        {
            header: t("salaries.list.table.endDate"),
            accessor: "end_date",
            cell: (value) => (value ? formatDate(value) : t("common.na")),
        },
        {
            header: t("salaries.list.table.actions"),
            accessor: "id",
            align: "center",
            cell: (id, row) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleOpenEdit(row)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-blue-50"
                        title={t("salaries.actions.edit")}
                        disabled={!hasPermission("manage salaries")}
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeleteClick(row)}
                        className="p-1.5 text-gray-600 hover:text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                        title={t("salaries.actions.delete")}
                        disabled={!hasPermission("manage salaries")}
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
                {t("salaries.errors.loadFailed")}: {error.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={t("salaries.list.title")}
                actions={
                    hasPermission("manage salaries") && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4" />
                            {t("salaries.actions.add")}
                        </button>
                    )
                }
            />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("salaries.filters.employee")}
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
                                `${emp.employee_code} - ${emp.user?.name || t("common.na")}`
                            }
                            placeholder={t("salaries.filters.allEmployees")}
                            cacheKey="salary-list-employees"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("salaries.filters.type")}
                        </label>
                        <SearchableSelect
                            value={typeFilter}
                            onChange={(v) => {
                                setTypeFilter(v || "");
                                setPage(1);
                            }}
                            options={[
                                { value: "", label: t("salaries.filters.allTypes") },
                                ...Object.entries(SALARY_TYPE_LABELS).map(
                                    ([value, label]) => ({
                                        value,
                                        label: t(`salaries.type.${value}`, {
                                            defaultValue: label,
                                        }),
                                    }),
                                ),
                            ]}
                            placeholder={t("salaries.filters.allTypes")}
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
                    searchPlaceholder={t("salaries.list.searchPlaceholder")}
                    totalRecordName={t("salaries.list.totalRecordName")}
                />
            </div>
            <SalaryFormModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                salaryId={editingSalaryId}
                mode={editingSalaryId ? "edit" : "create"}
            />
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t("salaries.confirmDelete.title")}
                description={t("salaries.confirmDelete.description")}
                confirmLabel={t("salaries.confirmDelete.confirm")}
                cancelLabel={t("common.cancel")}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
