import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePermissions } from "../hooks/usePermissions";

const icon = (path) => (
    <svg
        className="w-5 h-5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={path}
        />
    </svg>
);

const ICONS = {
    dashboard:
        "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    products: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    inventory:
        "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    orders: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
    suppliers:
        "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    customers:
        "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    tasks: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    warehouse:
        "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    employees:
        "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    departments:
        "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    salaries:
        "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    leaveTypes:
        "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    leaves: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    attendance: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    payroll:
        "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    invoices:
        "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    costReport:
        "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    payments:
        "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    deposits: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    users: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    roles: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    settings:
        "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    biometric:
        "M12 3a6 6 0 00-6 6v2a6 6 0 0012 0V9a6 6 0 00-6-6zm-2 8V9a2 2 0 114 0v2a2 2 0 11-4 0zm2 10v-4m-4 0h8",
    chevronDown: "M19 9l-7 7-7-7",
    chevronRight: "M9 5l7 7-7 7",
};

const menuStructure = [
    {
        type: "link",
        path: "/",
        labelKey: "menu.dashboard",
        iconKey: "dashboard",
        permission: null,
    },
    {
        type: "group",
        key: "warehouse",
        labelKey: "menu.groups.warehouse",
        iconKey: "warehouse",
        items: [
            {
                path: "/products",
                labelKey: "menu.items.products",
                iconKey: "products",
                permission: "view products",
            },
            {
                path: "/inventory",
                labelKey: "menu.items.inventory",
                iconKey: "inventory",
                permission: "view inventory",
            },
            {
                path: "/orders",
                labelKey: "menu.items.orders",
                iconKey: "orders",
                permission: "view orders",
                hideForEmployee: true,
            },
            {
                path: "/suppliers",
                labelKey: "menu.items.suppliers",
                iconKey: "suppliers",
                permission: "view suppliers",
                hideForEmployee: true,
            },
            {
                path: "/customers",
                labelKey: "menu.items.customers",
                iconKey: "customers",
                permission: "view customers",
                hideForEmployee: true,
            },
            {
                path: "/deposits",
                labelKey: "menu.items.deposits",
                iconKey: "deposits",
                permission: "view deposits",
            },
        ],
    },
    {
        type: "group",
        key: "tasks",
        labelKey: "menu.groups.tasks",
        iconKey: "tasks",
        items: [
            {
                path: "/tasks",
                labelKey: "menu.items.taskList",
                iconKey: "tasks",
                permission: "view tasks",
            },
        ],
    },
    {
        type: "group",
        key: "hr",
        labelKey: "menu.groups.hr",
        iconKey: "employees",
        items: [
            {
                path: "/employees",
                labelKey: "menu.items.employees",
                iconKey: "employees",
                permission: "view employees",
            },
            {
                path: "/departments",
                labelKey: "menu.items.departments",
                iconKey: "departments",
                permission: "view employees",
            },
            {
                path: "/salaries",
                labelKey: "menu.items.salaries",
                iconKey: "salaries",
                permission: "view salaries",
            },
            {
                path: "/payroll-records",
                labelKey: "menu.items.payroll",
                iconKey: "payroll",
                permission: "view payroll",
            },
            {
                path: "/leave-types",
                labelKey: "menu.items.leaveTypes",
                iconKey: "leaveTypes",
                permission: "view leave types",
            },
            {
                path: "/leaves",
                labelKey: "menu.items.leaves",
                iconKey: "leaves",
                permission: "view leaves",
            },
            {
                path: "/attendance",
                labelKey: "menu.items.attendance",
                iconKey: "attendance",
                permission: "view attendance",
            },
        ],
    },
    {
        type: "group",
        key: "financial",
        labelKey: "menu.groups.financial",
        iconKey: "chart",
        items: [
            {
                path: "/financial/dashboard",
                labelKey: "menu.items.financialDashboard",
                iconKey: "chart",
                permission: "view financial",
            },
            {
                path: "/invoices",
                labelKey: "menu.items.invoices",
                iconKey: "invoices",
                permission: "view invoices",
            },
            {
                path: "/cost-reports",
                labelKey: "menu.items.costReports",
                iconKey: "costReport",
                permission: "view financial",
            },
            {
                path: "/payments",
                labelKey: "menu.items.payments",
                iconKey: "payments",
                permission: "view payments",
            },
        ],
    },
    {
        type: "group",
        key: "settings",
        labelKey: "menu.groups.settings",
        iconKey: "settings",
        adminOnly: true,
        bottom: true,
        items: [
            {
                path: "/admin/settings",
                labelKey: "menu.items.appSettings",
                iconKey: "settings",
                permission: null,
                adminOnly: true,
            },
            {
                path: "/admin/users",
                labelKey: "menu.items.users",
                iconKey: "users",
                permission: "view users",
                adminOnly: true,
            },
            {
                path: "/admin/roles",
                labelKey: "menu.items.rolesAndPermissions",
                iconKey: "roles",
                permission: "view roles",
                adminOnly: true,
            },
            {
                path: "/admin/biometric-devices",
                labelKey: "menu.items.biometricDevices",
                iconKey: "biometric",
                permission: "edit users",
                adminOnly: true,
            },
            {
                path: "/admin/biometric-events",
                labelKey: "menu.items.biometricEvents",
                iconKey: "biometric",
                permission: "edit users",
                adminOnly: true,
            },
        ],
    },
];

export default function Sidebar({ isOpen, onClose }) {
    const location = useLocation();
    const { hasPermission, hasRole, isAdmin } = usePermissions();
    const [openGroups, setOpenGroups] = useState(() => ({}));
    const { t } = useTranslation();

    useEffect(() => {
        const toOpen = {};
        menuStructure.forEach((entry) => {
            if (
                entry.type === "group" &&
                entry.items.some((it) =>
                    it.path === "/"
                        ? location.pathname === "/"
                        : location.pathname.startsWith(it.path),
                )
            ) {
                toOpen[entry.key] = true;
            }
        });
        if (Object.keys(toOpen).length > 0) {
            setOpenGroups((prev) => ({ ...prev, ...toOpen }));
        }
    }, [location.pathname]);

    const canSeeItem = (item) => {
        if (item.adminOnly && !isAdmin()) return false;
        if (item.hideForEmployee && hasRole("Employee")) return false;
        if (item.permission === null) return true;
        return hasPermission(item.permission);
    };

    const canSeeGroup = (entry) => {
        if (entry.adminOnly && !isAdmin()) return false;
        if (entry.type === "link") return canSeeItem(entry);
        return entry.items.some(canSeeItem);
    };

    const visibleStructure = menuStructure.filter(canSeeGroup);
    const mainMenuItems = visibleStructure.filter((entry) => !entry.bottom);
    const bottomMenuItems = visibleStructure.filter((entry) => entry.bottom);

    const toggleGroup = (key) => {
        setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const isActive = (path) => {
        if (path === "/") return location.pathname === "/";
        return location.pathname.startsWith(path);
    };

    const linkClass = (active) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
            active
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-700 hover:bg-gray-100 hover:shadow-sm"
        }`;

    const closeOnMobile = () => {
        if (typeof window !== "undefined" && window.innerWidth < 1024)
            onClose();
    };

    return (
        <aside
            className={`
                shrink-0 w-64 flex flex-col
                bg-white border-r border-gray-200
                rounded-b-xl rounded-br-xl shadow-md
                transition-all duration-300 ease-in-out hover:shadow-lg
                fixed left-0 top-16 bottom-0 z-50
                lg:relative lg:top-auto lg:left-auto lg:bottom-auto lg:translate-x-0
                ${isOpen ? "translate-x-0" : "-translate-x-full"}
            `}
        >
            <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 lg:hidden">
                <h2 className="text-lg font-semibold text-gray-900">
                    {t("menu.mobile.title")}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
                    aria-label={t("menu.mobile.close")}
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
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0">
                {visibleStructure.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 text-sm">
                        {t("menu.empty")}
                    </div>
                ) : (
                    <>
                        <ul className="space-y-1 shrink-0">
                            {mainMenuItems.map((entry) => {
                                if (entry.type === "link") {
                                    return (
                                        <li key={entry.path}>
                                            <Link
                                                to={entry.path}
                                                onClick={closeOnMobile}
                                                className={linkClass(
                                                    isActive(entry.path),
                                                )}
                                            >
                                                {icon(
                                                    ICONS[entry.iconKey] ||
                                                        ICONS.dashboard,
                                                )}
                                                <span>
                                                    {t(entry.labelKey)}
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                }

                                const visibleItems =
                                    entry.items.filter(canSeeItem);
                                if (visibleItems.length === 0) return null;

                                const isOpenGroup = openGroups[entry.key];
                                const groupIcon =
                                    ICONS[entry.iconKey] || ICONS.warehouse;

                                return (
                                    <li key={entry.key}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleGroup(entry.key)
                                            }
                                            className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition-all duration-150 text-left font-medium"
                                        >
                                            <span className="flex items-center gap-3">
                                                {icon(groupIcon)}
                                                <span>
                                                    {t(entry.labelKey)}
                                                </span>
                                            </span>
                                            <svg
                                                className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isOpenGroup ? "rotate-180" : ""}`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d={ICONS.chevronDown}
                                                />
                                            </svg>
                                        </button>
                                        <ul
                                            className={`overflow-hidden transition-all duration-200 ${
                                                isOpenGroup
                                                    ? "max-h-[600px] opacity-100 mt-1"
                                                    : "max-h-0 opacity-0"
                                            }`}
                                        >
                                            {visibleItems.map((item) => (
                                                <li
                                                    key={item.path}
                                                    className="pl-4 py-0.5"
                                                >
                                                    <Link
                                                        to={item.path}
                                                        onClick={closeOnMobile}
                                                        className={linkClass(
                                                            isActive(item.path),
                                                        )}
                                                    >
                                                        {icon(
                                                            ICONS[
                                                                item.iconKey
                                                            ] || ICONS.products,
                                                        )}
                                                        <span>
                                                            {t(item.labelKey)}
                                                        </span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                );
                            })}
                        </ul>
                        {bottomMenuItems.length > 0 && (
                            <div className="mt-auto pt-4 border-t border-gray-200 shrink-0">
                                <ul className="space-y-1">
                                    {bottomMenuItems.map((entry) => {
                                        if (entry.type === "link") {
                                            return (
                                                <li key={entry.path}>
                                                    <Link
                                                        to={entry.path}
                                                        onClick={closeOnMobile}
                                                        className={linkClass(
                                                            isActive(
                                                                entry.path,
                                                            ),
                                                        )}
                                                    >
                                                        {icon(
                                                            ICONS[
                                                                entry.iconKey
                                                            ] ||
                                                                ICONS.dashboard,
                                                        )}
                                                        <span>
                                                            {t(entry.labelKey)}
                                                        </span>
                                                    </Link>
                                                </li>
                                            );
                                        }
                                        const visibleItems =
                                            entry.items.filter(canSeeItem);
                                        if (visibleItems.length === 0)
                                            return null;
                                        const isOpenGroup =
                                            openGroups[entry.key];
                                        const groupIcon =
                                            ICONS[entry.iconKey] ||
                                            ICONS.settings;
                                        return (
                                            <li key={entry.key}>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleGroup(entry.key)
                                                    }
                                                    className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition-all duration-150 text-left font-medium"
                                                >
                                                    <span className="flex items-center gap-3">
                                                        {icon(groupIcon)}
                                                        <span>
                                                            {t(entry.labelKey)}
                                                        </span>
                                                    </span>
                                                    <svg
                                                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isOpenGroup ? "rotate-180" : ""}`}
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d={
                                                                ICONS.chevronDown
                                                            }
                                                        />
                                                    </svg>
                                                </button>
                                                <ul
                                                    className={`overflow-hidden transition-all duration-200 ${
                                                        isOpenGroup
                                                            ? "max-h-[600px] opacity-100 mt-1"
                                                            : "max-h-0 opacity-0"
                                                    }`}
                                                >
                                                    {visibleItems.map(
                                                        (item) => (
                                                            <li
                                                                key={item.path}
                                                                className="pl-4 py-0.5"
                                                            >
                                                                <Link
                                                                    to={
                                                                        item.path
                                                                    }
                                                                    onClick={
                                                                        closeOnMobile
                                                                    }
                                                                    className={linkClass(
                                                                        isActive(
                                                                            item.path,
                                                                        ),
                                                                    )}
                                                                >
                                                                    {icon(
                                                                        ICONS[
                                                                            item
                                                                                .iconKey
                                                                        ] ||
                                                                            ICONS.products,
                                                                    )}
                                                                    <span>
                                                                        {t(
                                                                            item.labelKey,
                                                                        )}
                                                                    </span>
                                                                </Link>
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </>
                )}
            </nav>
        </aside>
    );
}
