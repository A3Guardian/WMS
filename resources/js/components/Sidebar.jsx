import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

export default function Sidebar() {
    const location = useLocation();
    const { hasPermission, isAdmin } = usePermissions();
    
    const menuItems = [
        { 
            path: '/', 
            label: 'Dashboard', 
            icon: '📊',
            permission: null
        },
        { 
            path: '/products', 
            label: 'Products', 
            icon: '📦',
            permission: 'view products'
        },
        { 
            path: '/inventory', 
            label: 'Inventory', 
            icon: '📋',
            permission: 'view inventory'
        },
        { 
            path: '/orders', 
            label: 'Orders', 
            icon: '🛒',
            permission: 'view orders'
        },
        { 
            path: '/suppliers', 
            label: 'Suppliers', 
            icon: '👥',
            permission: 'view suppliers'
        },
        { 
            path: '/admin/users', 
            label: 'Users', 
            icon: '👤',
            permission: 'view users',
            adminOnly: true
        },
        { 
            path: '/admin/roles', 
            label: 'Roles & Permissions', 
            icon: '🔐',
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

    return (
        <aside className="w-64 bg-gray-800 text-white min-h-screen">
            <nav className="p-4">
                <ul className="space-y-2">
                    {visibleItems.map((item) => (
                        <li key={item.path}>
                            <Link
                                to={item.path}
                                className={`flex items-center space-x-2 px-4 py-2 rounded hover:bg-gray-700 ${
                                    location.pathname === item.path ? 'bg-gray-700' : ''
                                }`}
                            >
                                <span>{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
}
