import React from "react";
import { useForm } from "../../hooks/useForm";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "./AuthContext";
import api from "../../utils/api";
import { toast } from "sonner";
import { Camera, User, Phone, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

const AVATAR_INPUT_ID = "avatar-upload";

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const [avatarUploading, setAvatarUploading] = React.useState(false);
    const { t } = useTranslation();

    const initialValues = {
        name: user?.name ?? "",
        email: user?.email ?? "",
        phone: user?.phone ?? "",
        address: user?.address ?? "",
        password: "",
        password_confirmation: "",
    };

    const {
        values,
        errors,
        isSubmitting,
        handleChange,
        handleSubmit,
        setValues,
    } = useForm(
        {
            ...initialValues,
            name: user?.name ?? "",
            email: user?.email ?? "",
            phone: user?.phone ?? "",
            address: user?.address ?? "",
        },
        async (formValues) => {
            const payload = {
                name: formValues.name,
                email: formValues.email,
                phone: formValues.phone || null,
                address: formValues.address || null,
            };
            if (formValues.password) {
                payload.password = formValues.password;
                payload.password_confirmation =
                    formValues.password_confirmation;
            }
            await api.put("/user", payload);
            await refreshUser();
            toast.success(t("profile.toast.updated"));
        },
    );

    React.useEffect(() => {
        if (user) {
            setValues((prev) => ({
                ...prev,
                name: user.name ?? "",
                email: user.email ?? "",
                phone: user.phone ?? "",
                address: user.address ?? "",
            }));
        }
    }, [
        user?.id,
        user?.name,
        user?.email,
        user?.phone,
        user?.address,
        setValues,
    ]);

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];

        if (!file) return;
        setAvatarUploading(true);
        try {
            const formData = new FormData();
            formData.append("avatar", file);
            await api.post("/user/avatar", formData);
            await refreshUser();
            toast.success(t("profile.toast.avatarUpdated"));
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.errors?.avatar?.[0] ||
                t("profile.toast.avatarUploadError");
            console.error(
                "[Profil Avatar] Eroare upload",
                err.response?.data ?? err,
            );
            toast.error(msg);
        } finally {
            setAvatarUploading(false);
        }
        e.target.value = "";
    };

    const avatarUrl = user?.avatar_url;
    const displayName = values.name || user?.name;

    return (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
            <PageHeader title={t("profile.title")} showBack={true} />
            <form
                onSubmit={handleSubmit}
                className="bg-white shadow-md rounded-lg p-6"
            >
                <div className="flex flex-col md:flex-row md:items-start gap-8">
                    {/* Left: avatar (desktop) / top (mobile) */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-center gap-4 md:w-48 shrink-0">
                        <input
                            id={AVATAR_INPUT_ID}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleAvatarChange}
                            className="sr-only"
                            aria-label={t("profile.avatar.uploadAriaLabel")}
                        />
                        <label
                            htmlFor={AVATAR_INPUT_ID}
                            className="relative w-24 h-24 md:w-32 md:h-32 shrink-0 group cursor-pointer block"
                        >
                            <div className="absolute inset-0 w-full h-full rounded-full bg-blue-500 text-white flex items-center justify-center overflow-hidden text-3xl md:text-4xl font-medium">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={displayName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    (
                                        displayName?.charAt(0) ||
                                        user?.email?.charAt(0) ||
                                        "U"
                                    ).toUpperCase()
                                )}
                            </div>

                            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <Camera className="w-8 h-8 text-white" />
                            </span>
                        </label>
                        <div className="text-center md:text-center">
                            <p className="text-sm text-gray-500">
                                {t("profile.avatar.clickToChange")}
                            </p>
                            <p className="text-gray-700 font-medium mt-1">
                                {displayName || user?.email}
                            </p>
                            <p className="text-sm text-gray-500 truncate max-w-[200px] md:max-w-none">
                                {user?.email}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-8">
                        <section className="space-y-4">
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 uppercase tracking-wide border-b border-gray-200 pb-2">
                                <User className="w-4 h-4 text-blue-600" />
                                {t("profile.sections.personalInfo")}
                            </h2>
                            <div>
                                <label
                                    htmlFor="name"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    {t("profile.fields.name")}
                                </label>
                                <input
                                    type="text"
                                    id="name"
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
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    {t("profile.fields.email")}
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    autoComplete="email"
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
                        </section>

                        <section className="space-y-4">
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 uppercase tracking-wide border-b border-gray-200 pb-2">
                                <Phone className="w-4 h-4 text-blue-600" />
                                {t("profile.sections.contact")}
                            </h2>
                            <div>
                                <label
                                    htmlFor="phone"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    {t("profile.fields.phone")}
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    autoComplete="tel"
                                    value={values.phone}
                                    onChange={handleChange}
                                    placeholder={t("profile.placeholders.phone")}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {errors.phone && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.phone}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label
                                    htmlFor="address"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    {t("profile.fields.address")}
                                </label>
                                <input
                                    type="text"
                                    id="address"
                                    name="address"
                                    autoComplete="street-address"
                                    value={values.address}
                                    onChange={handleChange}
                                    placeholder={t("profile.placeholders.address")}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {errors.address && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.address}
                                    </p>
                                )}
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 uppercase tracking-wide border-b border-gray-200 pb-2">
                                <Lock className="w-4 h-4 text-blue-600" />
                                {t("profile.sections.security")}
                            </h2>
                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    {t("profile.fields.newPassword")}
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    autoComplete="new-password"
                                    value={values.password}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    minLength={8}
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    {t("profile.hints.keepPassword")}
                                </p>
                                {errors.password && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            {values.password ? (
                                <div>
                                    <label
                                        htmlFor="password_confirmation"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        {t("profile.fields.confirmPassword")}
                                    </label>
                                    <input
                                        type="password"
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        autoComplete="new-password"
                                        value={values.password_confirmation}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        minLength={8}
                                    />
                                    {errors.password_confirmation && (
                                        <p className="mt-1 text-sm text-red-600">
                                            {errors.password_confirmation}
                                        </p>
                                    )}
                                </div>
                            ) : null}
                        </section>

                        {errors.form && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                                {errors.form}
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting
                                    ? t("common.saving")
                                    : t("common.save")}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
