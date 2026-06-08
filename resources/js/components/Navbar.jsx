import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Power, Maximize, Minimize } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../features/auth/useAuth";
import api from "../utils/api";

export default function Navbar({ onMenuClick = () => {} }) {
    const { user, logout } = useAuth();
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const { t, i18n } = useTranslation();

    const { data: branding } = useQuery({
        queryKey: ["settings", "invoice-data"],
        queryFn: async () => {
            const response = await api.get("/settings/invoice-data");
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    const logoUrl = branding?.logo_url;

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement
                .requestFullscreen()
                .then(() => setIsFullscreen(true))
                .catch(() => {});
        } else {
            document
                .exitFullscreen()
                .then(() => setIsFullscreen(false))
                .catch(() => {});
        }
    };

    React.useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handler);
        return () => document.removeEventListener("fullscreenchange", handler);
    }, []);

    const handleLogout = async () => {
        await logout();
    };

    const currentLang = (i18n.resolvedLanguage || i18n.language || "en")
        .toLowerCase()
        .startsWith("ro")
        ? "ro"
        : "en";

    const toggleLanguage = async () => {
        const next = currentLang === "ro" ? "en" : "ro";
        await i18n.changeLanguage(next);
    };

    const avatarContent = user?.avatar_url ? (
        <img
            src={user.avatar_url}
            alt={user?.name || "User"}
            className="w-8 h-8 rounded-full object-cover"
        />
    ) : (
        <span className="text-sm font-medium">
            {user?.name?.charAt(0)?.toUpperCase() ||
                user?.email?.charAt(0)?.toUpperCase() ||
                "U"}
        </span>
    );

    return (
        <nav className="bg-white shadow-md border-b border-gray-200 relative z-50">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={onMenuClick}
                            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                            aria-label="Toggle sidebar"
                        >
                            <svg
                                className="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            </svg>
                        </button>
                        <Link to="/" className="flex items-center">
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt={branding?.company?.name || "WMS"}
                                    className="h-10 max-w-[160px] w-auto object-contain"
                                />
                            ) : (
                                <h1 className="text-xl font-bold text-gray-900">
                                    WMS
                                </h1>
                            )}
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            aria-label={t("navbar.logout")}
                            title={t("navbar.logout")}
                        >
                            <Power className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={toggleLanguage}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors border border-gray-200"
                            aria-label={t("navbar.languageToggle")}
                            title={t("navbar.languageToggle")}
                        >
                            {(currentLang === "ro" ? "EN" : "RO")}
                        </button>
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            aria-label={
                                isFullscreen
                                    ? t("navbar.exitFullscreen")
                                    : t("navbar.fullscreen")
                            }
                            title={
                                isFullscreen
                                    ? t("navbar.exitFullscreen")
                                    : t("navbar.fullscreen")
                            }
                        >
                            {isFullscreen ? (
                                <Minimize className="w-5 h-5" />
                            ) : (
                                <Maximize className="w-5 h-5" />
                            )}
                        </button>
                        <Link
                            to="/profile"
                            className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full text-white overflow-hidden hover:ring-2 hover:ring-blue-400 hover:ring-offset-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            title={user?.name || user?.email}
                            aria-label={t("navbar.profile")}
                        >
                            {avatarContent}
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
