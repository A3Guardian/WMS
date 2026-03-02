import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <header className="flex-shrink-0 w-full relative z-50">
                <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
            </header>

            <div className="flex flex-1 min-h-0 relative">
                <Sidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-gray-50 relative z-10">
                    <Outlet />
                </main>
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/30 z-40 lg:hidden transition-opacity duration-300"
                        onClick={() => setSidebarOpen(false)}
                        aria-hidden="true"
                    />
                )}
            </div>
        </div>
    );
}
