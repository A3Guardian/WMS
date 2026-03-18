import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import api from "../../utils/api";
import { usePermissions } from "../../hooks/usePermissions";
import SearchableSelect from "../../components/SearchableSelect";

export default function SettingsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isAdmin } = usePermissions();
    const logoInputRef = useRef(null);
    const { t } = useTranslation();

    const { data: settings, isLoading } = useQuery({
        queryKey: ["settings"],
        queryFn: async () => {
            const res = await api.get("/settings");
            return res.data;
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.put("/settings", payload);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["settings"], data);
            setGeneral({ locale: data?.app?.locale || "en", _synced: true });
            setCompany({
                name: data?.company?.name ?? "",
                cui: data?.company?.cui ?? "",
                phone: data?.company?.phone ?? "",
                address: data?.company?.address ?? "",
                city: data?.company?.city ?? "",
                county: data?.company?.county ?? "",
                email: data?.company?.email ?? "",
                bank: data?.company?.bank ?? "",
                iban: data?.company?.iban ?? "",
                _synced: true,
            });
            setSmtp({
                host: data?.smtp?.host ?? "",
                port: data?.smtp?.port ?? "587",
                username: data?.smtp?.username ?? "",
                password: "",
                encryption: data?.smtp?.encryption ?? "tls",
                from_address: data?.smtp?.from_address ?? "",
                from_name: data?.smtp?.from_name ?? "",
                _synced: true,
            });
            queryClient.invalidateQueries({ queryKey: ["settings"] });
            toast.success(t("settings.toast.saved"));
        },
        onError: (err) => {
            const message =
                err.response?.data?.message || t("settings.toast.saveError");
            const errors = err.response?.data?.errors;
            const details = errors
                ? Object.values(errors).flat().filter(Boolean).join("\n")
                : null;
            toast.error(
                message,
                details ? { description: details } : undefined,
            );
        },
    });

    const logoMutation = useMutation({
        mutationFn: async (file) => {
            const form = new FormData();
            form.append("logo", file);
            const res = await api.post("/settings/logo", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settings"] });
            toast.success(t("settings.toast.logoUploaded"));
        },
        onError: (err) => {
            toast.error(
                err.response?.data?.message || t("settings.toast.logoUploadError"),
            );
        },
    });

    const [general, setGeneral] = useState({ locale: "en" });
    const [company, setCompany] = useState({
        name: "",
        cui: "",
        phone: "",
        address: "",
        city: "",
        county: "",
        email: "",
        bank: "",
        iban: "",
    });
    const [smtp, setSmtp] = useState({
        host: "",
        port: "587",
        username: "",
        password: "",
        encryption: "tls",
        from_address: "",
        from_name: "",
    });

    useEffect(() => {
        if (!settings) return;
        setGeneral((g) =>
            g._synced
                ? g
                : { ...g, locale: settings.app?.locale || "en", _synced: true },
        );
    }, [settings?.app?.locale]);

    useEffect(() => {
        if (!settings?.company) return;
        setCompany((c) =>
            c._synced
                ? c
                : {
                      name: settings.company.name ?? "",
                      cui: settings.company.cui ?? "",
                      phone: settings.company.phone ?? "",
                      address: settings.company.address ?? "",
                      city: settings.company.city ?? "",
                      county: settings.company.county ?? "",
                      email: settings.company.email ?? "",
                      bank: settings.company.bank ?? "",
                      iban: settings.company.iban ?? "",
                      _synced: true,
                  },
        );
    }, [
        settings?.company?.name,
        settings?.company?.cui,
        settings?.company?.phone,
        settings?.company?.address,
        settings?.company?.city,
        settings?.company?.county,
        settings?.company?.email,
        settings?.company?.bank,
        settings?.company?.iban,
    ]);

    useEffect(() => {
        if (!settings?.smtp) return;
        setSmtp((s) =>
            s._synced
                ? s
                : {
                      host: settings.smtp.host ?? "",
                      port: settings.smtp.port ?? "587",
                      username: settings.smtp.username ?? "",
                      password: "",
                      encryption: settings.smtp.encryption ?? "tls",
                      from_address: settings.smtp.from_address ?? "",
                      from_name: settings.smtp.from_name ?? "",
                      _synced: true,
                  },
        );
    }, [
        settings?.smtp?.host,
        settings?.smtp?.port,
        settings?.smtp?.username,
        settings?.smtp?.encryption,
        settings?.smtp?.from_address,
        settings?.smtp?.from_name,
    ]);

    const handleLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) logoMutation.mutate(file);
    };

    const saveGeneral = () => {
        updateMutation.mutate({ app: { locale: general.locale } });
    };

    const saveCompany = () => {
        updateMutation.mutate({
            company: {
                name: company.name,
                cui: company.cui,
                phone: company.phone,
                address: company.address,
                city: company.city,
                county: company.county,
                email: company.email,
                bank: company.bank,
                iban: company.iban,
            },
        });
    };

    const saveSmtp = () => {
        const payload = {
            smtp: {
                host: smtp.host,
                port: smtp.port,
                username: smtp.username,
                encryption: smtp.encryption,
                from_address: smtp.from_address,
                from_name: smtp.from_name,
            },
        };
        if (smtp.password) payload.smtp.password = smtp.password;
        updateMutation.mutate(payload);
    };

    if (!isAdmin()) {
        return (
            <div>
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">
                    {t("settings.errors.noPermission")}
                </div>
            </div>
        );
    }

    if (isLoading || !settings) {
        return (
            <div>
                <div className="animate-pulse rounded-xl bg-gray-200 h-8 w-48 mb-6" />
                <div className="space-y-6 max-w-3xl">
                    <div className="h-48 rounded-xl bg-gray-100" />
                    <div className="h-48 rounded-xl bg-gray-100" />
                </div>
            </div>
        );
    }

    const logoUrl = settings.app?.logo_url;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    {t("settings.title")}
                </h1>
                <p className="mt-1 text-gray-600">
                    {t("settings.subtitle")}
                </p>
            </div>

            <div className="space-y-6 ">
                {/* General */}
                <section className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {t("settings.sections.general")}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("settings.general.logoLabel")}
                            </label>
                            <div className="flex items-center gap-4">
                                {logoUrl ? (
                                    <img
                                        src={logoUrl}
                                        alt="Logo"
                                        className="h-16 w-auto object-contain rounded-lg border border-gray-200"
                                    />
                                ) : (
                                    <div className="h-16 w-24 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 text-xs">
                                        {t("settings.general.noLogo")}
                                    </div>
                                )}
                                <div>
                                    <label
                                        htmlFor="settings-logo-input"
                                        className={`inline-block px-3 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm font-medium cursor-pointer relative ${logoMutation.isPending ? "opacity-50 pointer-events-none cursor-not-allowed" : ""}`}
                                    >
                                        <input
                                            ref={logoInputRef}
                                            id="settings-logo-input"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoChange}
                                            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                                            disabled={logoMutation.isPending}
                                        />
                                        {logoMutation.isPending
                                            ? t("settings.logo.uploading")
                                            : t("settings.logo.upload")}
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("settings.general.defaultLanguage")}
                            </label>
                            <SearchableSelect
                                value={general.locale}
                                onChange={(v) =>
                                    setGeneral((g) => ({
                                        ...g,
                                        locale: v,
                                    }))
                                }
                                options={[
                                    { value: "ro", label: t("app.romanian") },
                                    { value: "en", label: t("app.english") },
                                ]}
                                placeholder={t("settings.general.localePlaceholder")}
                                className="max-w-xs"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={saveGeneral}
                            disabled={updateMutation.isPending}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                        >
                            {t("settings.general.save")}
                        </button>
                    </div>
                </section>

                {/* Company */}
                <section className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {t("settings.company.title")}
                    </h2>
                    <p className="text-gray-600 text-sm mb-4">
                        {t("settings.company.description")}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("settings.company.name")}
                            </label>
                            <input
                                type="text"
                                value={company.name}
                                onChange={(e) =>
                                    setCompany((c) => ({
                                        ...c,
                                        name: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={t("settings.company.namePlaceholder")}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("settings.company.cui")}
                            </label>
                            <input
                                type="text"
                                value={company.cui}
                                onChange={(e) =>
                                    setCompany((c) => ({
                                        ...c,
                                        cui: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={t("settings.company.cuiPlaceholder")}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("settings.company.phone")}
                            </label>
                            <input
                                type="text"
                                value={company.phone}
                                onChange={(e) =>
                                    setCompany((c) => ({
                                        ...c,
                                        phone: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="+40 ..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={company.email}
                                onChange={(e) =>
                                    setCompany((c) => ({
                                        ...c,
                                        email: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="contact@firma.ro"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("settings.company.address")}
                            </label>
                            <textarea
                                value={company.address}
                                onChange={(e) =>
                                    setCompany((c) => ({
                                        ...c,
                                        address: e.target.value,
                                    }))
                                }
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={t("settings.company.addressPlaceholder")}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("settings.company.city")}
                            </label>
                            <input
                                type="text"
                                value={company.city}
                                onChange={(e) =>
                                    setCompany((c) => ({
                                        ...c,
                                        city: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={t("settings.company.cityPlaceholder")}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("settings.company.county")}
                            </label>
                            <input
                                type="text"
                                value={company.county}
                                onChange={(e) =>
                                    setCompany((c) => ({
                                        ...c,
                                        county: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={t("settings.company.countyPlaceholder")}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("settings.company.bank")}
                            </label>
                            <input
                                type="text"
                                value={company.bank}
                                onChange={(e) =>
                                    setCompany((c) => ({
                                        ...c,
                                        bank: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ex: BCR"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                IBAN
                            </label>
                            <input
                                type="text"
                                value={company.iban}
                                onChange={(e) =>
                                    setCompany((c) => ({
                                        ...c,
                                        iban: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="RO49 AAAA 1B31 0075 9384 0000"
                            />
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={saveCompany}
                        disabled={updateMutation.isPending}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                    >
                        {t("settings.company.save")}
                    </button>
                </section>

                {/* Notificări - SMTP */}
                <section className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {t("settings.smtp.title")}
                    </h2>
                    <p className="text-gray-600 text-sm mb-4">
                        {t("settings.smtp.description")}
                    </p>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            saveSmtp();
                        }}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Host SMTP
                            </label>
                            <input
                                type="text"
                                name="smtp_host"
                                value={smtp.host}
                                onChange={(e) =>
                                    setSmtp((s) => ({
                                        ...s,
                                        host: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="smtp.example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Port
                            </label>
                            <input
                                type="text"
                                name="smtp_port"
                                value={smtp.port}
                                onChange={(e) =>
                                    setSmtp((s) => ({
                                        ...s,
                                        port: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="587"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("settings.smtp.encryption")}
                            </label>
                            <SearchableSelect
                                value={smtp.encryption}
                                onChange={(v) =>
                                    setSmtp((s) => ({
                                        ...s,
                                        encryption: v,
                                    }))
                                }
                                options={[
                                    { value: "tls", label: "TLS" },
                                    { value: "ssl", label: "SSL" },
                                    {
                                        value: "null",
                                        label: t("settings.smtp.none"),
                                    },
                                ]}
                                placeholder={t("settings.smtp.encryptionPlaceholder")}
                                className="w-full"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("settings.smtp.username")}
                            </label>
                            <input
                                type="text"
                                name="smtp_username"
                                autoComplete="username"
                                value={smtp.username}
                                onChange={(e) =>
                                    setSmtp((s) => ({
                                        ...s,
                                        username: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="user@example.com"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("settings.smtp.password")}
                            </label>
                            <input
                                type="password"
                                name="smtp_password"
                                value={smtp.password}
                                onChange={(e) =>
                                    setSmtp((s) => ({
                                        ...s,
                                        password: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={t("settings.smtp.passwordPlaceholder")}
                                autoComplete="new-password"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("settings.smtp.fromEmail")}
                            </label>
                            <input
                                type="email"
                                name="smtp_from_address"
                                value={smtp.from_address}
                                onChange={(e) =>
                                    setSmtp((s) => ({
                                        ...s,
                                        from_address: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="noreply@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("settings.smtp.fromName")}
                            </label>
                            <input
                                type="text"
                                name="smtp_from_name"
                                value={smtp.from_name}
                                onChange={(e) =>
                                    setSmtp((s) => ({
                                        ...s,
                                        from_name: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="WMS"
                            />
                        </div>
                        </div>
                    <button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                    >
                        {t("settings.smtp.save")}
                    </button>
                    </form>
                </section>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={() => navigate("/admin/users")}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                    {t("menu.items.users")}
                </button>
                <button
                    type="button"
                    onClick={() => navigate("/admin/roles")}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                    {t("menu.items.rolesAndPermissions")}
                </button>
            </div>
        </div>
    );
}
