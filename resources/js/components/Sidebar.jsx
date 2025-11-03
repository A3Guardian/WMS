import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
    const location = useLocation();
    
    const menuItems = [
        { path: '/', label: 'Dashboard', icon: '📊' },
        { path: '/products', label: 'Products', icon: '📦' },
        { path: '/inventory', label: 'Inventory', icon: '📋' },
        { path: '/orders', label: 'Orders', icon: '🛒' },
        { path: '/suppliers', label: 'Suppliers', icon: '👥' },
    ];

    return (
        <aside className="w-64 bg-gray-800 text-white min-h-screen">
            <nav className="p-4">
                <ul className="space-y-2">
                    {menuItems.map((item) => (
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
