import React, { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useForm } from "../../hooks/useForm";
import api from "../../utils/api";
import { usePermissions } from "../../hooks/usePermissions";

export default function RoleFormModal({
    isOpen,
    onClose,
    roleId = null,
    mode = "create", // "create" | "edit"
}) {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const isEdit = mode === "edit";

    const { data: permissionsData } = useQuery({
        queryKey: ["permissions"],
        queryFn: async () => {
            const response = await api.get("/admin/permissions");
            return response.data;
        },
        enabled: isOpen,
    });

    const { data: roleData } = useQuery({
        queryKey: ["role", roleId],
        queryFn: async () => {
            const response = await api.get(`/admin/roles/${roleId}`);
            return response.data;
        },
        enabled: isEdit && !!roleId && isOpen,
    });

    const initialValues = {
        name: "",
        permissions: [],
    };

    const { values, errors, isSubmitting, handleChange, handleSubmit, setValues } =
        useForm(initialValues, async (formValues) => {
            try {
                const submitData = {
                    name: formValues.name,
                    permissions: formValues.permissions || [],
                };

                if (isEdit) {
                    await api.put(`/admin/roles/${roleId}`, submitData);
                    toast.success(t("roles.toast.updated"));
                } else {
                    await api.post("/admin/roles", submitData);
                    toast.success(t("roles.toast.created"));
                }

                queryClient.invalidateQueries({ queryKey: ["roles"] });
                onClose();
            } catch (error) {
                const errorMessage =
                    error.response?.data?.message || t("common.genericError");
                toast.error(
                    isEdit
                        ? t("roles.toast.updateFailed")
                        : t("roles.toast.createFailed"),
                    { description: errorMessage },
                );
                throw error;
            }
        });

    useEffect(() => {
        if (!isOpen) return;

        if (roleData && isEdit) {
            setValues({
                name: roleData.name || "",
                permissions:
                    roleData.permissions?.map((p) => p.name || p) || [],
            });
            return;
        }

        if (!roleId && !isEdit) {
            setValues(initialValues);
        }
    }, [isOpen, roleData, roleId, isEdit, setValues]);

    const permissions = permissionsData || [];

    if (isEdit && !hasPermission("edit roles")) return null;
    if (!isEdit && !hasPermission("create roles")) return null;

    const togglePermission = (permissionName) => {
        const current = values.permissions || [];
        const next = current.includes(permissionName)
            ? current.filter((p) => p !== permissionName)
            : [...current, permissionName];
        setValues({ ...values, permissions: next });
    };

    const title = isEdit ? t("roles.modal.editTitle") : t("roles.modal.createTitle");

    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl z-50 max-h-[90vh] overflow-y-auto">
                    <Dialog.Title className="text-2xl font-bold mb-1">
                        {title}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-500 mb-4">
                        {t("roles.modal.description")}
                    </Dialog.Description>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("roles.fields.name")}{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={values.name}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                disabled={isSubmitting}
                            />
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t("roles.fields.permissions")}
                            </label>
                            <div className="space-y-2 border border-gray-300 rounded-md p-4 max-h-72 overflow-y-auto">
                                {permissions.length === 0 ? (
                                    <p className="text-sm text-gray-500">
                                        {t("roles.empty.permissions")}
                                    </p>
                                ) : (
                                    permissions
                                        .slice()
                                        .sort((a, b) =>
                                            (a.name || a).localeCompare(
                                                b.name || b,
                                            ),
                                        )
                                        .map((perm) => {
                                            const permName = perm.name || perm;
                                            return (
                                                <label
                                                    key={perm.id || permName}
                                                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            values.permissions?.includes(
                                                                permName,
                                                            ) || false
                                                        }
                                                        onChange={() =>
                                                            togglePermission(
                                                                permName,
                                                            )
                                                        }
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        disabled={isSubmitting}
                                                    />
                                                    <span className="text-sm">
                                                        {permName}
                                                    </span>
                                                </label>
                                            );
                                        })
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                disabled={isSubmitting}
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                disabled={isSubmitting}
                            >
                                {isEdit
                                    ? t("roles.actions.saveChanges")
                                    : t("roles.actions.create")}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

