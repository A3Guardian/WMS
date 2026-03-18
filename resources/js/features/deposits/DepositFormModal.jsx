import React, { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import api from "../../utils/api";
import SearchableSelect from "../../components/SearchableSelect";

const emptyForm = () => ({
    name: "",
    code: "",
    location: "",
    width: "",
    height: "",
    depth: "",
    capacity: "",
    status: "active",
    description: "",
    notes: "",
});

function toNumberOrNull(v) {
    const s = String(v ?? "").trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

export default function DepositFormModal({
    isOpen,
    onClose,
    mode = "create", // "create" | "edit"
    depositId = null,
}) {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const isEdit = mode === "edit";

    const { data: depositData, isLoading: loadingDeposit } = useQuery({
        queryKey: ["deposit", depositId],
        queryFn: async () => {
            const res = await api.get(`/deposits/${depositId}`);
            return res.data;
        },
        enabled: isOpen && isEdit && !!depositId,
    });

    const [formData, setFormData] = useState(() => emptyForm());

    useEffect(() => {
        if (!isOpen) return;
        if (!isEdit) {
            setFormData(emptyForm());
            return;
        }
        if (!depositData) return;
        setFormData({
            name: depositData.name ?? "",
            code: depositData.code ?? "",
            location: depositData.location ?? "",
            width:
                depositData.width != null && depositData.width !== ""
                    ? String(depositData.width)
                    : "",
            height:
                depositData.height != null && depositData.height !== ""
                    ? String(depositData.height)
                    : "",
            depth:
                depositData.depth != null && depositData.depth !== ""
                    ? String(depositData.depth)
                    : "",
            capacity:
                depositData.capacity != null && depositData.capacity !== ""
                    ? String(depositData.capacity)
                    : "",
            status: depositData.status || "active",
            description: depositData.description ?? "",
            notes: depositData.notes ?? "",
        });
    }, [isOpen, isEdit, depositData]);

    useEffect(() => {
        if (!isOpen) return;
        if (formData.width && formData.height && formData.depth && !formData.capacity) {
            const w = Number(formData.width);
            const h = Number(formData.height);
            const d = Number(formData.depth);
            if (Number.isFinite(w) && Number.isFinite(h) && Number.isFinite(d)) {
                const c = (w * h * d).toFixed(2);
                setFormData((p) => ({ ...p, capacity: c }));
            }
        }
    }, [isOpen, formData.width, formData.height, formData.depth, formData.capacity]);

    const payload = useMemo(
        () => ({
            name: formData.name?.trim() || null,
            code: formData.code?.trim() || null,
            location: formData.location?.trim() || null,
            width: toNumberOrNull(formData.width),
            height: toNumberOrNull(formData.height),
            depth: toNumberOrNull(formData.depth),
            capacity: toNumberOrNull(formData.capacity),
            status: formData.status || "active",
            description: formData.description?.trim() || null,
            notes: formData.notes?.trim() || null,
        }),
        [formData],
    );

    const createMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post("/deposits", payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deposits"] });
            toast.success(t("deposits.toast.created"));
            onClose();
        },
        onError: (err) => {
            toast.error(
                err.response?.data?.message || t("deposits.toast.createFailed"),
            );
        },
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            const res = await api.put(`/deposits/${depositId}`, payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deposits"] });
            queryClient.invalidateQueries({ queryKey: ["deposit", depositId] });
            toast.success(t("deposits.toast.updated"));
            onClose();
        },
        onError: (err) => {
            toast.error(
                err.response?.data?.message || t("deposits.toast.updateFailed"),
            );
        },
    });

    const isSaving = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEdit) updateMutation.mutate();
        else createMutation.mutate();
    };

    const set = (key) => (e) =>
        setFormData((p) => ({ ...p, [key]: e.target.value }));

    const statusOptions = [
        { value: "active", label: t("deposits.status.active") },
        { value: "inactive", label: t("deposits.status.inactive") },
        { value: "maintenance", label: t("deposits.status.maintenance") },
    ];

    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl z-50 max-h-[90vh] overflow-y-auto">
                    <Dialog.Title className="text-2xl font-bold mb-4">
                        {isEdit
                            ? t("deposits.form.editTitle")
                            : t("deposits.form.createTitle")}
                    </Dialog.Title>

                    {isEdit && loadingDeposit ? (
                        <div className="text-gray-600">{t("common.loading")}</div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.form.fields.name")}{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={set("name")}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder={t(
                                            "deposits.form.placeholders.name",
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.form.fields.code")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={set("code")}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder={t(
                                            "deposits.form.placeholders.code",
                                        )}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        {t("deposits.form.hints.code")}
                                    </p>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.form.fields.location")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={set("location")}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder={t(
                                            "deposits.form.placeholders.location",
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.form.fields.width")}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.width}
                                        onChange={set("width")}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder={t(
                                            "deposits.form.placeholders.dimension",
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.form.fields.height")}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.height}
                                        onChange={set("height")}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder={t(
                                            "deposits.form.placeholders.dimension",
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.form.fields.depth")}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.depth}
                                        onChange={set("depth")}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder={t(
                                            "deposits.form.placeholders.dimension",
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.form.fields.capacity")}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.capacity}
                                        onChange={set("capacity")}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder={t(
                                            "deposits.form.placeholders.capacity",
                                        )}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        {formData.width &&
                                        formData.height &&
                                        formData.depth
                                            ? t(
                                                  "deposits.form.hints.calculatedCapacity",
                                                  {
                                                      value: (
                                                          Number(formData.width) *
                                                          Number(formData.height) *
                                                          Number(formData.depth)
                                                      ).toFixed(2),
                                                  },
                                              )
                                            : t("deposits.form.hints.capacity")}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.form.fields.status")}
                                    </label>
                                    <SearchableSelect
                                        value={formData.status}
                                        onChange={(v) =>
                                            setFormData((p) => ({
                                                ...p,
                                                status: v || "active",
                                            }))
                                        }
                                        options={statusOptions}
                                        placeholder={t(
                                            "deposits.form.placeholders.status",
                                        )}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.form.fields.description")}
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.description}
                                        onChange={set("description")}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder={t(
                                            "deposits.form.placeholders.description",
                                        )}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("deposits.form.fields.notes")}
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.notes}
                                        onChange={set("notes")}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder={t(
                                            "deposits.form.placeholders.notes",
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                                    >
                                        {t("common.cancel")}
                                    </button>
                                </Dialog.Close>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isSaving ? t("common.saving") : t("common.save")}
                                </button>
                            </div>
                        </form>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

