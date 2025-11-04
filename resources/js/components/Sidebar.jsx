import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

export default function Sidebar({ isOpen, onClose }) {
    const location = useLocation();
    const { hasPermission, isAdmin } = usePermissions();
    
    const menuItems = [
        { 
            path: '/', 
            label: 'Dashboard', 
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
            permission: null
        },
        { 
            path: '/products', 
            label: 'Products', 
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            ),
            permission: 'view products'
        },
        { 
            path: '/inventory', 
            label: 'Inventory', 
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            ),
            permission: 'view inventory'
        },
        { 
            path: '/orders', 
            label: 'Orders', 
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
            ),
            permission: 'view orders'
        },
        { 
            path: '/suppliers', 
            label: 'Suppliers', 
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            permission: 'view suppliers'
        },
        { 
            path: '/admin/users', 
            label: 'Users', 
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            permission: 'view users',
            adminOnly: true
        },
        { 
            path: '/admin/roles', 
            label: 'Roles & Permissions', 
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            ),
            permission: 'view roles',
            adminOnly: true
        },
    ];

    const visibleItems = menuItems.filter(item => {
        if (item.adminOnly && !isAdmin()) {
            return false;
        }
        if (item.permission === null) {
            return true;
        }
        return hasPermission(item.permission);
    });

    const isActive = (path) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };

    return (
        <>
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50
                w-64 bg-gray-800 text-white
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                flex flex-col
            `}>
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700 lg:hidden">
                    <h2 className="text-lg font-semibold">Menu</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                        aria-label="Close sidebar"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <nav className="flex-1 overflow-y-auto p-4">
                    {visibleItems.length > 0 ? (
                        <ul className="space-y-1">
                            {visibleItems.map((item) => (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        onClick={() => {
                                            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                                onClose();
                                            }
                                        }}
                                        className={`
                                            flex items-center space-x-3 px-4 py-3 rounded-lg
                                            transition-colors duration-150
                                            ${
                                                isActive(item.path)
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                            }
                                        `}
                                    >
                                        <span className="flex-shrink-0">{item.icon}</span>
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center text-gray-400 py-8">
                            <p className="text-sm">No menu items available</p>
                        </div>
                    )}
                </nav>
            </aside>
        </>
    );
}
