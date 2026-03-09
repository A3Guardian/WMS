import React from "react";
import { Link } from "react-router-dom";
import { Power, Maximize, Minimize } from "lucide-react";
import { useAuth } from "../features/auth/useAuth";

export default function Navbar({ onMenuClick = () => {} }) {
    const { user, logout } = useAuth();
    const [isFullscreen, setIsFullscreen] = React.useState(false);

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
                        <h1 className="text-xl font-bold text-gray-900">WMS</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            aria-label="Logout"
                        >
                            <Power className="w-5 h-5" />
                        </button>
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            aria-label={
                                isFullscreen
                                    ? "Ieșire fullscreen"
                                    : "Fullscreen"
                            }
                            title={
                                isFullscreen
                                    ? "Ieșire fullscreen"
                                    : "Fullscreen"
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
                            aria-label="Profil"
                        >
                            {avatarContent}
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
