import React, { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import api from "../../utils/api";

const initialFormData = () => ({
    name: "",
    company_name: "",
    email: "",
    phone: "",
    billing_phone: "",
    shipping_phone: "",
    contact_person: "",
    notes: "",
    billing_address: "",
    billing_city: "",
    billing_postcode: "",
    billing_country: "",
    shipping_address: "",
    shipping_city: "",
    shipping_postcode: "",
    shipping_country: "",
    tax_number: "",
    registration_number: "",
    bank_name: "",
    bank_iban: "",
    bank_swift: "",
    payment_terms_days: "",
    credit_limit: "",
});

function toPayload(data) {
    const str = (v) => (typeof v === "string" ? v.trim() : v);
    const num = (v) => {
        const s = str(v);
        if (s === "") return null;
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
    };
    return {
        name: str(data.name) || null,
        company_name: str(data.company_name) || null,
        email: str(data.email) || null,
        phone: str(data.phone) || null,
        billing_phone: str(data.billing_phone) || null,
        shipping_phone: str(data.shipping_phone) || null,
        contact_person: str(data.contact_person) || null,
        notes: str(data.notes) || null,
        billing_address: str(data.billing_address) || null,
        billing_city: str(data.billing_city) || null,
        billing_postcode: str(data.billing_postcode) || null,
        billing_country: str(data.billing_country) || null,
        shipping_address: str(data.shipping_address) || null,
        shipping_city: str(data.shipping_city) || null,
        shipping_postcode: str(data.shipping_postcode) || null,
        shipping_country: str(data.shipping_country) || null,
        tax_number: str(data.tax_number) || null,
        registration_number: str(data.registration_number) || null,
        bank_name: str(data.bank_name) || null,
        bank_iban: str(data.bank_iban) || null,
        bank_swift: str(data.bank_swift) || null,
        payment_terms_days: num(data.payment_terms_days),
        credit_limit: num(data.credit_limit),
    };
}

function fromCustomer(customer) {
    if (!customer) return initialFormData();
    return {
        name: customer.name ?? "",
        company_name: customer.company_name ?? "",
        email: customer.email ?? "",
        phone: customer.phone ?? "",
        billing_phone: customer.billing_phone ?? "",
        shipping_phone: customer.shipping_phone ?? "",
        contact_person: customer.contact_person ?? "",
        notes: customer.notes ?? "",
        billing_address: customer.billing_address ?? "",
        billing_city: customer.billing_city ?? "",
        billing_postcode: customer.billing_postcode ?? "",
        billing_country: customer.billing_country ?? "",
        shipping_address: customer.shipping_address ?? "",
        shipping_city: customer.shipping_city ?? "",
        shipping_postcode: customer.shipping_postcode ?? "",
        shipping_country: customer.shipping_country ?? "",
        tax_number: customer.tax_number ?? "",
        registration_number: customer.registration_number ?? "",
        bank_name: customer.bank_name ?? "",
        bank_iban: customer.bank_iban ?? "",
        bank_swift: customer.bank_swift ?? "",
        payment_terms_days:
            customer.payment_terms_days != null
                ? String(customer.payment_terms_days)
                : "",
        credit_limit:
            customer.credit_limit != null ? String(customer.credit_limit) : "",
    };
}

const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const sectionTitleClass =
    "text-sm font-semibold text-gray-800 mt-4 mb-2 pb-1 border-b border-gray-200";

export default function CustomerFormModal({
    isOpen,
    onClose,
    customer = null,
    onCreated = null,
}) {
    const queryClient = useQueryClient();
    const isEdit = !!customer;
    const [formData, setFormData] = useState(() => initialFormData());
    const { t } = useTranslation();

    useEffect(() => {
        if (!isOpen) return;
        setFormData(isEdit ? fromCustomer(customer) : initialFormData());
    }, [customer, isOpen, isEdit]);

    const createMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post("/customers", payload);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            toast.success(t("customers.toast.created"));
            if (typeof onCreated === "function") {
                onCreated(data);
            }
            onClose();
        },
        onError: (err) => {
            toast.error(t("customers.toast.createFailed"), {
                description:
                    err.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, payload }) => {
            const res = await api.put(`/customers/${id}`, payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            toast.success(t("customers.toast.updated"));
            onClose();
        },
        onError: (err) => {
            toast.error(t("customers.toast.updateFailed"), {
                description:
                    err.response?.data?.message || t("common.genericError"),
            });
        },
    });

    const isSaving = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = toPayload(formData);
        if (isEdit) {
            updateMutation.mutate({ id: customer.id, payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const set = (key) => (e) =>
        setFormData((p) => ({ ...p, [key]: e.target.value }));

    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl z-50 max-h-[90vh] overflow-y-auto">
                    <Dialog.Title className="text-2xl font-bold mb-4">
                        {isEdit
                            ? t("customers.form.editTitle")
                            : t("customers.form.createTitle")}
                    </Dialog.Title>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className={sectionTitleClass}>
                            {t("customers.form.sections.general")}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>
                                    {t("customers.form.fields.name")} *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={set("name")}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>
                                    {t("customers.form.fields.companyName")}
                                </label>
                                <input
                                    type="text"
                                    value={formData.company_name}
                                    onChange={set("company_name")}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>
                                    {t("customers.form.fields.email")}
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={set("email")}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>
                                    {t("customers.form.fields.contactPerson")}
                                </label>
                                <input
                                    type="text"
                                    value={formData.contact_person}
                                    onChange={set("contact_person")}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>
                                    {t("customers.form.fields.mainPhone")}
                                </label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={set("phone")}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>
                                    {t("customers.form.fields.billingPhone")}
                                </label>
                                <input
                                    type="text"
                                    value={formData.billing_phone}
                                    onChange={set("billing_phone")}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>
                                    {t("customers.form.fields.shippingPhone")}
                                </label>
                                <input
                                    type="text"
                                    value={formData.shipping_phone}
                                    onChange={set("shipping_phone")}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div className={sectionTitleClass}>
                            {t("customers.form.sections.billingAddress")}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>
                                    {t("customers.form.fields.billingAddress")}
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.billing_address}
                                    onChange={set("billing_address")}
                                    className={inputClass}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClass}>
                                        {t("customers.form.fields.city")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.billing_city}
                                        onChange={set("billing_city")}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        {t("customers.form.fields.postcode")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.billing_postcode}
                                        onChange={set("billing_postcode")}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        {t("customers.form.fields.country")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.billing_country}
                                        onChange={set("billing_country")}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={sectionTitleClass}>
                            {t("customers.form.sections.shippingAddress")}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>
                                    {t("customers.form.fields.shippingAddress")}
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.shipping_address}
                                    onChange={set("shipping_address")}
                                    className={inputClass}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClass}>
                                        {t("customers.form.fields.city")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.shipping_city}
                                        onChange={set("shipping_city")}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        {t("customers.form.fields.postcode")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.shipping_postcode}
                                        onChange={set("shipping_postcode")}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        {t("customers.form.fields.country")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.shipping_country}
                                        onChange={set("shipping_country")}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={sectionTitleClass}>
                            {t("customers.form.sections.taxRegistration")}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>
                                    {t("customers.form.fields.taxNumber")}
                                </label>
                                <input
                                    type="text"
                                    value={formData.tax_number}
                                    onChange={set("tax_number")}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>
                                    {t("customers.form.fields.registrationNumber")}
                                </label>
                                <input
                                    type="text"
                                    value={formData.registration_number}
                                    onChange={set("registration_number")}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div className={sectionTitleClass}>
                            {t("customers.form.sections.banking")}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>
                                    {t("customers.form.fields.bankName")}
                                </label>
                                <input
                                    type="text"
                                    value={formData.bank_name}
                                    onChange={set("bank_name")}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>IBAN</label>
                                <input
                                    type="text"
                                    value={formData.bank_iban}
                                    onChange={set("bank_iban")}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>SWIFT</label>
                                <input
                                    type="text"
                                    value={formData.bank_swift}
                                    onChange={set("bank_swift")}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div className={sectionTitleClass}>
                            {t("customers.form.sections.paymentTermsCredit")}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>
                                    {t("customers.form.fields.paymentTermsDays")}
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={formData.payment_terms_days}
                                    onChange={set("payment_terms_days")}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>
                                    {t("customers.form.fields.creditLimit")}
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={formData.credit_limit}
                                    onChange={set("credit_limit")}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div className={sectionTitleClass}>
                            {t("customers.form.sections.notes")}
                        </div>
                        <div>
                            <textarea
                                rows={3}
                                value={formData.notes}
                                onChange={set("notes")}
                                className={inputClass}
                            />
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
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
