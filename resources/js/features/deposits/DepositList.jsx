import React, { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Pencil, Settings, Trash2 } from "lucide-react";
import DataTable from "../../components/DataTable";
import SearchableSelect from "../../components/SearchableSelect";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";
import PageHeader from "../../components/PageHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import DepositFormModal from "./DepositFormModal";

export default function DepositList() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: routeDepositId } = useParams();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [statusFilter, setStatusFilter] = useState("");
    const [locationFilter, setLocationFilter] = useState("");
    const [search, setSearch] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [depositToDelete, setDepositToDelete] = useState(null);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [formModalMode, setFormModalMode] = useState("create"); // "create" | "edit"
    const [selectedDepositId, setSelectedDepositId] = useState(null);

    const handleOpenCreate = useCallback(() => {
        setSelectedDepositId(null);
        setFormModalMode("create");
        setFormModalOpen(true);
    }, []);

    const handleOpenEdit = useCallback((deposit) => {
        setSelectedDepositId(deposit?.id);
        setFormModalMode("edit");
        setFormModalOpen(true);
    }, []);

    const handleCloseFormModal = useCallback(() => {
        setFormModalOpen(false);
        setSelectedDepositId(null);
        if (
            location.pathname.endsWith("/create") ||
            location.pathname.endsWith("/edit")
        ) {
            navigate("/deposits");
        }
    }, [location.pathname, navigate]);

    useEffect(() => {
        // Allow deep-links, but keep the user on /deposits (modal overlay)
        if (location.pathname === "/deposits/create") {
            handleOpenCreate();
            navigate("/deposits", { replace: true });
            return;
        }
        if (location.pathname.endsWith("/edit") && routeDepositId) {
            setSelectedDepositId(routeDepositId);
            setFormModalMode("edit");
            setFormModalOpen(true);
            navigate("/deposits", { replace: true });
        }
    }, [handleOpenCreate, location.pathname, navigate, routeDepositId]);

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
            toast.success(t("deposits.toast.deleted"));
        },
        onError: (error) => {
            toast.error(t("deposits.toast.deleteFailed"), {
                description:
                    error.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const handleDeleteClick = (deposit) => {
        setDepositToDelete(deposit);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!depositToDelete) return;
        deleteMutation.mutate(depositToDelete.id, {
            onSettled: () => setDepositToDelete(null),
        });
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
            return t("deposits.dimensionsFormat", {
                width,
                height,
                depth,
            });
        }
        return t("common.na");
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
            header: t("deposits.table.name"),
            accessor: "name",
        },
        {
            header: t("deposits.table.code"),
            accessor: "code",
            cell: (value) => value || t("common.na"),
        },
        {
            header: t("deposits.table.location"),
            accessor: "location",
            cell: (value) => value || t("common.na"),
        },
        {
            header: t("deposits.table.dimensions"),
            accessor: (row) =>
                formatDimensions(row.width, row.height, row.depth),
        },
        {
            header: t("deposits.table.capacity"),
            accessor: "capacity",
            cell: (value) =>
                value
                    ? t("deposits.capacityFormat", { value })
                    : t("common.na"),
        },
        {
            header: t("deposits.table.status"),
            accessor: "status",
            cell: (value) => (
                <span
                    className={`px-2 py-1 text-xs rounded-full ${getStatusColor(value)}`}
                >
                    {value
                        ? t(`deposits.status.${value}`, {
                              defaultValue: value.toUpperCase(),
                          })
                        : t("common.na")}
                </span>
            ),
        },
        {
            header: t("deposits.table.actions"),
            accessor: "id",
            align: "right",
            cell: (id, row) => (
                <div className="flex items-center justify-end gap-1">
                    {hasPermission("edit deposits") && (
                        <button
                            onClick={() => navigate(`/deposits/${id}/configure`)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title={t("deposits.actions.configure")}
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    )}
                    {hasPermission("edit deposits") && (
                        <button
                            onClick={() => {
                                handleOpenEdit(row);
                            }}
                            className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title={t("deposits.actions.edit")}
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    {hasPermission("delete deposits") && (
                        <button
                            onClick={() => handleDeleteClick(row)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title={t("deposits.actions.delete")}
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
                {t("deposits.errors.loadFailed")}: {error.message}
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={t("deposits.title")}
                actions={
                    hasPermission("create deposits") && (
                        <button
                            onClick={() => {
                                handleOpenCreate();
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            {t("deposits.actions.add")}
                        </button>
                    )
                }
            />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("deposits.filters.status")}
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
                                    label: t("deposits.filters.allStatuses"),
                                },
                                {
                                    value: "active",
                                    label: t("deposits.status.active"),
                                },
                                {
                                    value: "inactive",
                                    label: t("deposits.status.inactive"),
                                },
                                {
                                    value: "maintenance",
                                    label: t("deposits.status.maintenance"),
                                },
                            ]}
                            placeholder={t("deposits.filters.allStatuses")}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("deposits.filters.location")}
                        </label>
                        <input
                            type="text"
                            value={locationFilter}
                            onChange={(e) => {
                                setLocationFilter(e.target.value);
                                setPage(1);
                            }}
                            placeholder={t("deposits.filters.locationPlaceholder")}
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
                    searchPlaceholder={t("deposits.searchPlaceholder")}
                    totalRecordName={t("deposits.totalRecordName")}
                />
            </div>
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t("deposits.confirmDelete.title")}
                description={
                    depositToDelete
                        ? t("deposits.confirmDelete.description", {
                              name: depositToDelete.name,
                          })
                        : ""
                }
                confirmLabel={t("deposits.confirmDelete.confirm")}
                cancelLabel={t("common.cancel")}
                onConfirm={handleConfirmDelete}
            />
            <DepositFormModal
                isOpen={formModalOpen}
                onClose={handleCloseFormModal}
                mode={formModalMode}
                depositId={formModalMode === "edit" ? selectedDepositId : null}
            />
        </div>
    );
}
