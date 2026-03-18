import React, { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useForm } from "../../hooks/useForm";
import api from "../../utils/api";
import { usePermissions } from "../../hooks/usePermissions";

export default function UserFormModal({
    isOpen,
    onClose,
    userId = null,
    mode = "create", // "create" | "edit"
}) {
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const isEdit = mode === "edit";

    const { data: rolesData } = useQuery({
        queryKey: ["roles"],
        queryFn: async () => {
            const response = await api.get("/admin/roles");
            return response.data;
        },
        enabled: isOpen,
    });

    const { data: userData } = useQuery({
        queryKey: ["user", userId],
        queryFn: async () => {
            const response = await api.get(`/admin/users/${userId}`);
            return response.data;
        },
        enabled: isEdit && !!userId && isOpen,
    });

    const initialValues = {
        name: "",
        email: "",
        password: "",
        roles: [],
    };

    const { values, errors, isSubmitting, handleChange, handleSubmit, setValues } =
        useForm(initialValues, async (formValues) => {
            try {
                const submitData = {
                    name: formValues.name,
                    email: formValues.email,
                };

                if (!isEdit || formValues.password) {
                    submitData.password = formValues.password;
                }

                submitData.roles = formValues.roles || [];

                if (isEdit) {
                    await api.put(`/admin/users/${userId}`, submitData);
                    toast.success(t("users.toast.updated"));
                } else {
                    await api.post("/admin/users", submitData);
                    toast.success(t("users.toast.created"));
                }

                queryClient.invalidateQueries({ queryKey: ["users"] });
                onClose();
            } catch (error) {
                const errorMessage =
                    error.response?.data?.message || t("common.genericError");
                toast.error(
                    isEdit
                        ? t("users.toast.updateFailed")
                        : t("users.toast.createFailed"),
                    { description: errorMessage },
                );
                throw error;
            }
        });

    useEffect(() => {
        if (!isOpen) return;
        if (userData && isEdit) {
            setValues({
                name: userData.name || "",
                email: userData.email || "",
                password: "",
                roles: userData.roles?.map((role) => role.name) || [],
            });
        }
        if (!userId && !isEdit) {
            setValues(initialValues);
        }
    }, [isOpen, userData, userId, isEdit, setValues]);

    const roles = rolesData || [];

    if (isEdit && !hasPermission("edit users")) return null;
    if (!isEdit && !hasPermission("create users")) return null;

    const toggleRole = (roleName) => {
        const currentRoles = values.roles || [];
        const newRoles = currentRoles.includes(roleName)
            ? currentRoles.filter((r) => r !== roleName)
            : [...currentRoles, roleName];
        setValues({ ...values, roles: newRoles });
    };

    const title = isEdit ? t("users.modal.editTitle") : t("users.modal.createTitle");

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
                        {t("users.modal.description")}
                    </Dialog.Description>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("users.fields.name")}{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={values.name}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("users.fields.email")}{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={values.email}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("users.fields.password")}{" "}
                                {!isEdit && (
                                    <span className="text-red-500">*</span>
                                )}
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={values.password}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required={!isEdit}
                                minLength={8}
                                autoComplete="new-password"
                            />
                            {isEdit && (
                                <p className="mt-1 text-sm text-gray-500">
                                    {t("users.hints.keepPassword")}
                                </p>
                            )}
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t("users.fields.roles")}
                            </label>
                            <div className="space-y-2 border border-gray-300 rounded-md p-4 max-h-60 overflow-y-auto">
                                {roles.length === 0 ? (
                                    <p className="text-sm text-gray-500">
                                        {t("users.empty.roles")}
                                    </p>
                                ) : (
                                    roles.map((role) => (
                                        <label
                                            key={role.id || role.name}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={
                                                    values.roles?.includes(
                                                        role.name,
                                                    ) || false
                                                }
                                                onChange={() =>
                                                    toggleRole(role.name)
                                                }
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">
                                                {role.name}
                                            </span>
                                        </label>
                                    ))
                                )}
                            </div>
                            {errors.roles && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.roles}
                                </p>
                            )}
                        </div>

                        {errors.form && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                                {errors.form}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                    onClick={onClose}
                                >
                                    {t("common.cancel")}
                                </button>
                            </Dialog.Close>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting
                                    ? t("common.saving")
                                    : isEdit
                                      ? t("users.actions.update")
                                      : t("users.actions.create")}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

