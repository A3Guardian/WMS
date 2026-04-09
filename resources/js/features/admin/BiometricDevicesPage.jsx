import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Eye, EyeOff, Fingerprint, Pencil, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import BiometricDeviceFormModal from "./BiometricDeviceFormModal";
import { usePermissions } from "../../hooks/usePermissions";
import api from "../../utils/api";

const statusColorClass = (isActive) =>
    isActive ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100";

export default function BiometricDevicesPage() {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [visibleSecrets, setVisibleSecrets] = useState({});

    const { data, isLoading } = useQuery({
        queryKey: ["biometric-devices"],
        queryFn: async () => {
            const response = await api.get("/biometric/devices");
            return response.data;
        },
    });

    const openCreateModal = () => {
        setSelectedDevice(null);
        setModalMode("create");
        setModalOpen(true);
    };

    const openEditModal = (device) => {
        setSelectedDevice(device);
        setModalMode("edit");
        setModalOpen(true);
    };

    const devices = data || [];

    const handleToggleSecret = (deviceId) => {
        const isVisible = !!visibleSecrets[deviceId];
        if (!isVisible) {
            const confirmed = window.confirm(
                "Show API key for this device? Make sure nobody else can see your screen.",
            );
            if (!confirmed) return;
        }
        setVisibleSecrets((prev) => ({
            ...prev,
            [deviceId]: !isVisible,
        }));
    };

    const handleCopySecret = async (secret) => {
        if (!secret) return;
        try {
            await navigator.clipboard.writeText(secret);
            toast.success("API key copied to clipboard.");
        } catch {
            toast.error("Could not copy API key.");
        }
    };

    const columns = [
        { key: "id", label: "ID" },
        { key: "name", label: "Device Name" },
        { key: "code", label: "Code" },
        {
            key: "purpose",
            label: "Purpose",
            render: (purpose) =>
                purpose === "attendance"
                    ? "Attendance / time tracking"
                    : "Access control",
        },
        {
            key: "api_key",
            label: "API Key",
            render: (apiKey, row) => {
                const isVisible = !!visibleSecrets[row.id];
                const displayedValue = isVisible
                    ? apiKey
                    : apiKey
                      ? "••••••••••••••••••••••••••••••••"
                      : "-";

                return (
                    <div className="flex items-center gap-2">
                        <code
                            className={`max-w-[220px] truncate rounded bg-gray-100 px-2 py-1 text-xs ${
                                isVisible ? "" : "blur-sm select-none"
                            }`}
                            title={isVisible ? apiKey : "Hidden API key"}
                        >
                            {displayedValue}
                        </code>
                        {apiKey && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleToggleSecret(row.id)}
                                    className="p-1 text-gray-600 hover:text-indigo-600"
                                    title={isVisible ? "Hide key" : "Show key"}
                                >
                                    {isVisible ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleCopySecret(apiKey)}
                                    className="p-1 text-gray-600 hover:text-emerald-600"
                                    title="Copy key"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                );
            },
        },
        {
            key: "deposit",
            label: "Default Deposit",
            render: (deposit) => deposit?.name || "-",
        },
        {
            key: "is_active",
            label: "Status",
            render: (isActive) => (
                <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusColorClass(isActive)}`}
                >
                    {isActive ? "Active" : "Inactive"}
                </span>
            ),
        },
        {
            key: "last_seen_at",
            label: "Last Seen",
            render: (value) => (value ? new Date(value).toLocaleString() : "-"),
        },
        {
            key: "service_url",
            label: "Service URL",
            render: (value) => value || "-",
        },
        {
            key: "actions",
            label: "Actions",
            align: "right",
            render: (_, row) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        type="button"
                        onClick={() => openEditModal(row)}
                        className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                        title="Edit device"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    if (!hasPermission("edit users")) {
        return (
            <div className="text-red-600 p-4">
                You do not have permission to manage biometric devices.
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Biometric Devices"
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => navigate("/admin/biometric-events")}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 inline-flex items-center gap-2"
                        >
                            <Fingerprint className="w-4 h-4" />
                            Events
                        </button>
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Device
                        </button>
                    </div>
                }
            />

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataTable
                    columns={columns}
                    data={devices}
                    loading={isLoading}
                    totalRecordName="biometric devices"
                />
            </div>

            <BiometricDeviceFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                mode={modalMode}
                device={selectedDevice}
            />
        </div>
    );
}
