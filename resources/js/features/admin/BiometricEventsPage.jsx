import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cpu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import api from "../../utils/api";

export default function BiometricEventsPage() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);

    const { data, isLoading } = useQuery({
        queryKey: ["biometric-events", page, perPage],
        queryFn: async () => {
            const response = await api.get("/biometric/events", {
                params: {
                    page,
                    per_page: perPage,
                },
            });
            return response.data;
        },
    });

    const columns = [
        { key: "id", label: "ID" },
        {
            key: "occurred_at",
            label: "Occurred At",
            render: (value) => (value ? new Date(value).toLocaleString() : "-"),
        },
        { key: "event_type", label: "Event Type" },
        {
            key: "device",
            label: "Device",
            render: (device) => device?.name || "-",
        },
        {
            key: "user",
            label: "User",
            render: (user) => user?.name || "-",
        },
        {
            key: "deposit",
            label: "Deposit",
            render: (deposit) => deposit?.name || "-",
        },
        {
            key: "match_score",
            label: "Score",
            render: (score) => (score ?? "-"),
        },
        {
            key: "access_granted",
            label: "Access",
            render: (granted) =>
                granted ? (
                    <span className="text-green-700 font-medium">Granted</span>
                ) : (
                    <span className="text-red-700 font-medium">Denied</span>
                ),
        },
        {
            key: "fingerprint_image_url",
            label: "Scan",
            render: (imageUrl) =>
                imageUrl ? (
                    <a href={imageUrl} target="_blank" rel="noreferrer">
                        <img
                            src={imageUrl}
                            alt="Fingerprint scan"
                            className="h-10 w-10 rounded border object-cover"
                        />
                    </a>
                ) : (
                    "-"
                ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Biometric Events"
                actions={
                    <button
                        type="button"
                        onClick={() => navigate("/admin/biometric-devices")}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 inline-flex items-center gap-2"
                    >
                        <Cpu className="w-4 h-4" />
                        Devices
                    </button>
                }
            />
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataTable
                    columns={columns}
                    data={data?.data || []}
                    loading={isLoading}
                    perPage={perPage}
                    onPerPageChange={(value) => {
                        setPerPage(value);
                        setPage(1);
                    }}
                    pagination={
                        data
                            ? {
                                  currentPage: data.current_page || 1,
                                  lastPage: data.last_page || 1,
                                  total: data.total || 0,
                                  perPage,
                                  onPageChange: setPage,
                              }
                            : undefined
                    }
                    totalRecordName="biometric events"
                />
            </div>
        </div>
    );
}
