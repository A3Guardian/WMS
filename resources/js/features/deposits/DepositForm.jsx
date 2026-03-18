import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useForm } from "../../hooks/useForm";
import api from "../../utils/api";
import { usePermissions } from "../../hooks/usePermissions";
import SearchableSelect from "../../components/SearchableSelect";

export default function DepositForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const isEdit = !!id;
    const { t } = useTranslation();

    const { data: depositData } = useQuery({
        queryKey: ["deposit", id],
        queryFn: async () => {
            const response = await api.get(`/deposits/${id}`);
            return response.data;
        },
        enabled: isEdit,
    });

    const initialValues = {
        name: '',
        code: '',
        location: '',
        width: '',
        height: '',
        depth: '',
        capacity: '',
        status: "active",
        description: "",
        notes: "",
    };

    const { values, errors, isSubmitting, handleChange, handleSubmit, setValues } = useForm(
        initialValues,
        async (formValues) => {
            try {
                const submitData = {
                    name: formValues.name,
                    code: formValues.code || null,
                    location: formValues.location || null,
                    width: formValues.width ? parseFloat(formValues.width) : null,
                    height: formValues.height ? parseFloat(formValues.height) : null,
                    depth: formValues.depth ? parseFloat(formValues.depth) : null,
                    capacity: formValues.capacity ? parseFloat(formValues.capacity) : null,
                    status: formValues.status,
                    description: formValues.description || null,
                    notes: formValues.notes || null,
                };

                if (isEdit) {
                    await api.put(`/deposits/${id}`, submitData);
                    toast.success(t("deposits.toast.updated"));
                } else {
                    await api.post("/deposits", submitData);
                    toast.success(t("deposits.toast.created"));
                }

                queryClient.invalidateQueries({ queryKey: ["deposits"] });
                navigate("/deposits");
            } catch (error) {
                const errorMessage =
                    error.response?.data?.message || t("common.genericError");
                toast.error(
                    isEdit
                        ? t("deposits.toast.updateFailed")
                        : t("deposits.toast.createFailed"),
                    {
                    description: errorMessage,
                    },
                );
                throw error;
            }
        }
    );

    useEffect(() => {
        if (depositData) {
            setValues({
                name: depositData.name || '',
                code: depositData.code || '',
                location: depositData.location || '',
                width: depositData.width || '',
                height: depositData.height || '',
                depth: depositData.depth || '',
                capacity: depositData.capacity || '',
                status: depositData.status || "active",
                description: depositData.description || "",
                notes: depositData.notes || "",
            });
        }
    }, [depositData, setValues]);

    useEffect(() => {
        if (values.width && values.height && values.depth && !values.capacity) {
            const calculatedCapacity = parseFloat(values.width) * parseFloat(values.height) * parseFloat(values.depth);
            setValues({ ...values, capacity: calculatedCapacity.toFixed(2) });
        }
    }, [values.width, values.height, values.depth]);

    if (isEdit && !hasPermission("edit deposits")) {
        return (
            <div className="text-red-500 p-4">
                {t("deposits.errors.noPermissionEdit")}
            </div>
        );
    }

    if (!isEdit && !hasPermission("create deposits")) {
        return (
            <div className="text-red-500 p-4">
                {t("deposits.errors.noPermissionCreate")}
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">
                {isEdit
                    ? t("deposits.form.editTitle")
                    : t("deposits.form.createTitle")}
            </h1>

            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            {t("deposits.form.fields.name")}{" "}
                            <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={values.name}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                            placeholder={t("deposits.form.placeholders.name")}
                        />
                    </div>

                    <div>
                        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                            {t("deposits.form.fields.code")}
                        </label>
                        <input
                            type="text"
                            id="code"
                            name="code"
                            value={values.code}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder={t("deposits.form.placeholders.code")}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            {t("deposits.form.hints.code")}
                        </p>
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                            {t("deposits.form.fields.location")}
                        </label>
                        <input
                            type="text"
                            id="location"
                            name="location"
                            value={values.location}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder={t("deposits.form.placeholders.location")}
                        />
                    </div>

                    <div>
                        <label htmlFor="width" className="block text-sm font-medium text-gray-700 mb-1">
                            {t("deposits.form.fields.width")}
                        </label>
                        <input
                            type="number"
                            id="width"
                            name="width"
                            value={values.width}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder={t("deposits.form.placeholders.dimension")}
                        />
                    </div>

                    <div>
                        <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                            {t("deposits.form.fields.height")}
                        </label>
                        <input
                            type="number"
                            id="height"
                            name="height"
                            value={values.height}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder={t("deposits.form.placeholders.dimension")}
                        />
                    </div>

                    <div>
                        <label htmlFor="depth" className="block text-sm font-medium text-gray-700 mb-1">
                            {t("deposits.form.fields.depth")}
                        </label>
                        <input
                            type="number"
                            id="depth"
                            name="depth"
                            value={values.depth}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder={t("deposits.form.placeholders.dimension")}
                        />
                    </div>

                    <div>
                        <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                            {t("deposits.form.fields.capacity")}
                        </label>
                        <input
                            type="number"
                            id="capacity"
                            name="capacity"
                            value={values.capacity}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder={t("deposits.form.placeholders.capacity")}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            {values.width && values.height && values.depth
                                ? t("deposits.form.hints.calculatedCapacity", {
                                      value: (
                                          parseFloat(values.width || 0) *
                                          parseFloat(values.height || 0) *
                                          parseFloat(values.depth || 0)
                                      ).toFixed(2),
                                  })
                                : t("deposits.form.hints.capacity")}
                        </p>
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                            {t("deposits.form.fields.status")}
                        </label>
                        <SearchableSelect
                            value={values.status}
                            onChange={(v) =>
                                handleChange({
                                    target: { name: "status", value: v },
                                })
                            }
                            options={[
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
                            placeholder={t("deposits.form.placeholders.status")}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            {t("deposits.form.fields.description")}
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={values.description}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder={t("deposits.form.placeholders.description")}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                            {t("deposits.form.fields.notes")}
                        </label>
                        <textarea
                            id="notes"
                            name="notes"
                            value={values.notes}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder={t("deposits.form.placeholders.notes")}
                        />
                    </div>
                </div>

                {errors.form && (
                    <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
                        {errors.form}
                    </div>
                )}

                <div className="flex space-x-4 mt-6">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSubmitting
                            ? t("common.saving")
                            : isEdit
                              ? t("deposits.form.actions.update")
                              : t("deposits.form.actions.create")}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/deposits")}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                        {t("common.cancel")}
                    </button>
                </div>
            </form>
        </div>
    );
}

