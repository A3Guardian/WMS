import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../utils/api";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";

const statCards = [
    {
        path: "/products",
        label: "Produse",
        icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
        permission: "view products",
        key: "products",
    },
    {
        path: "/inventory",
        label: "Inventar",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
        permission: "view inventory",
        key: "inventory",
    },
    {
        path: "/orders",
        label: "Comenzi",
        icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
        permission: "view orders",
        key: "orders",
    },
    {
        path: "/suppliers",
        label: "Furnizori",
        icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
        permission: "view suppliers",
        key: "suppliers",
    },
    {
        path: "/tasks",
        label: "Task-uri",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
        permission: "view tasks",
        key: "tasks",
    },
];

function useStatCount(endpoint, key, enabled = true) {
    return useQuery({
        queryKey: ["dashboard-stat", key],
        queryFn: async () => {
            const res = await api.get(endpoint, { params: { per_page: 1 } });
            return res.data?.total ?? 0;
        },
        enabled: !!enabled,
        retry: false,
        staleTime: 60 * 1000,
    });
}

function StatCard({ path, label, icon, count, isLoading }) {
    return (
        <Link
            to={path}
            className="block bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-100 p-6 transition-all hover:border-blue-200"
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                        {label}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                        {isLoading ? "—" : count}
                    </p>
                </div>
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={icon}
                        />
                    </svg>
                </div>
            </div>
        </Link>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();
    const { hasPermission } = usePermissions();

    const products = useStatCount(
        "/products",
        "products",
        hasPermission("view products"),
    );
    const inventory = useStatCount(
        "/inventory",
        "inventory",
        hasPermission("view inventory"),
    );
    const orders = useStatCount(
        "/orders",
        "orders",
        hasPermission("view orders"),
    );
    const suppliers = useStatCount(
        "/suppliers",
        "suppliers",
        hasPermission("view suppliers"),
    );
    const tasks = useStatCount("/tasks", "tasks", hasPermission("view tasks"));

    const stats = {
        products: products.data ?? 0,
        inventory: inventory.data ?? 0,
        orders: orders.data ?? 0,
        suppliers: suppliers.data ?? 0,
        tasks: tasks.data ?? 0,
    };
    const loading = {
        products: products.isLoading,
        inventory: inventory.isLoading,
        orders: orders.isLoading,
        suppliers: suppliers.isLoading,
        tasks: tasks.isLoading,
    };

    const visibleCards = statCards.filter((card) =>
        hasPermission(card.permission),
    );

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                {/* <p className="mt-1 text-gray-600">
                    {user?.name ? `Bun venit, ${user.name}.` : 'Bun venit.'} Porniți rapid de aici.
                </p> */}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {visibleCards.map((card) => (
                    <StatCard
                        key={card.path}
                        path={card.path}
                        label={card.label}
                        icon={card.icon}
                        count={stats[card.key]}
                        isLoading={loading[card.key]}
                    />
                ))}
            </div>

            <div className="mt-10 bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Acces rapid
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                    Folosiți meniul din stânga pentru a naviga la Produse,
                    Inventar, Comenzi, Furnizori, Task-uri, HR și Finanțe.
                </p>
                <div className="flex flex-wrap gap-3">
                    <Link
                        to="/products"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                        Produse
                    </Link>
                    <Link
                        to="/inventory"
                        className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm font-medium"
                    >
                        Inventar
                    </Link>
                    <Link
                        to="/orders"
                        className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm font-medium"
                    >
                        Comenzi
                    </Link>
                    <Link
                        to="/financial/dashboard"
                        className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm font-medium"
                    >
                        Dashboard Finanțar
                    </Link>
                </div>
            </div>
        </div>
    );
}
