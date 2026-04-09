import React, { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "../../hooks/useForm";
import api from "../../utils/api";

export default function BiometricDeviceFormModal({
    isOpen,
    onClose,
    mode = "create",
    device = null,
}) {
    const queryClient = useQueryClient();
    const isEdit = mode === "edit" && !!device;

    const { data: depositsData } = useQuery({
        queryKey: ["biometric-deposits"],
        queryFn: async () => {
            const response = await api.get("/biometric/deposits");
            return response.data;
        },
        enabled: isOpen,
    });

    const initialValues = {
        name: "",
        code: "",
        purpose: "access",
        service_url: "",
        deposit_id: "",
        is_active: true,
        rotate_api_key: false,
    };

    const mutation = useMutation({
        mutationFn: async (payload) => {
            if (isEdit) {
                const response = await api.put(
                    `/biometric/devices/${device.id}`,
                    payload,
                );
                return response.data;
            }
            const response = await api.post("/biometric/devices", payload);
            return response.data;
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["biometric-devices"] });
            if (isEdit) {
                toast.success("Device updated successfully.");
            } else {
                toast.success(
                    "Device created. Copy API key now: " + result.api_key,
                    { duration: 9000 },
                );
            }
            onClose();
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "Failed to save device.";
            toast.error(message);
        },
    });

    const { values, errors, isSubmitting, setValues, handleChange, handleSubmit } =
        useForm(initialValues, async (formValues) => {
            const payload = {
                name: formValues.name.trim(),
                code: formValues.code.trim(),
                purpose: formValues.purpose,
                service_url: formValues.service_url.trim() || null,
                deposit_id: formValues.deposit_id
                    ? Number(formValues.deposit_id)
                    : null,
                is_active: !!formValues.is_active,
            };

            if (isEdit) {
                payload.rotate_api_key = !!formValues.rotate_api_key;
            }

            await mutation.mutateAsync(payload);
        });

    useEffect(() => {
        if (!isOpen) return;
        if (isEdit) {
            setValues({
                name: device.name || "",
                code: device.code || "",
                purpose: device.purpose || "access",
                service_url: device.service_url || "",
                deposit_id: device.deposit_id ? String(device.deposit_id) : "",
                is_active: !!device.is_active,
                rotate_api_key: false,
            });
            return;
        }
        setValues(initialValues);
    }, [isOpen, isEdit, device, setValues]);

    const deposits = depositsData || [];

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 max-h-[90vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6 shadow-xl z-50">
                    <Dialog.Title className="text-xl font-bold mb-1">
                        {isEdit ? "Edit biometric device" : "Add biometric device"}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-500 mb-4">
                        Configure device identity and the linked deposit.
                    </Dialog.Description>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={values.name}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Code
                            </label>
                            <input
                                type="text"
                                name="code"
                                value={values.code}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Must match Python `.env` `WMS_DEVICE_ID`.
                            </p>
                            {errors.code && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.code}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Purpose
                            </label>
                            <select
                                name="purpose"
                                value={values.purpose}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="access">Access control</option>
                                <option value="attendance">Attendance / time tracking</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Device service URL
                            </label>
                            <input
                                type="url"
                                name="service_url"
                                value={values.service_url}
                                onChange={handleChange}
                                placeholder="http://192.168.68.50:8100"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Used by the enroll wizard to call the Python service.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Deposit
                            </label>
                            <select
                                name="deposit_id"
                                value={values.deposit_id}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="">No default deposit</option>
                                {deposits.map((deposit) => (
                                    <option key={deposit.id} value={deposit.id}>
                                        {deposit.name}
                                        {deposit.code ? ` (${deposit.code})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={!!values.is_active}
                                onChange={handleChange}
                            />
                            Active device
                        </label>

                        {isEdit && (
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    name="rotate_api_key"
                                    checked={!!values.rotate_api_key}
                                    onChange={handleChange}
                                />
                                Rotate API key on save
                            </label>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || mutation.isPending}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSubmitting || mutation.isPending
                                    ? "Saving..."
                                    : isEdit
                                      ? "Update device"
                                      : "Create device"}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
