import './bootstrap';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoutesFromElements, Route } from 'react-router';
import { Toaster } from 'sonner';

import AuthLayout from './layout/AuthLayout';
import DashboardLayout from './layout/DashboardLayout';

import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './features/auth/LoginPage';
import ProductList from './features/products/ProductList';
import InventoryPage from './features/inventory/InventoryPage';
import OrderList from './features/orders/OrderList';
import SupplierList from './features/suppliers/SupplierList';
import UserList from './features/admin/UserList';
import UserForm from './features/admin/UserForm';
import RoleList from './features/admin/RoleList';
import TaskList from './features/tasks/TaskList';
import TaskForm from './features/tasks/TaskForm';

import { AuthProvider } from './features/auth/AuthContext';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

const routes = createRoutesFromElements(
    <Route element={<AuthProvider />}>
        <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
                <Route path="/" element={<ProductList />} />
                <Route path="/products" element={<ProductList />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/orders" element={<OrderList />} />
                <Route path="/suppliers" element={<SupplierList />} />
                <Route path="/tasks/create" element={<TaskForm />} />
                <Route path="/tasks/:id/edit" element={<TaskForm />} />
                <Route path="/tasks" element={<TaskList />} />
                <Route path="/admin/users" element={<UserList />} />
                <Route path="/admin/users/create" element={<UserForm />} />
                <Route path="/admin/users/:id/edit" element={<UserForm />} />
                <Route path="/admin/roles" element={<RoleList />} />
            </Route>
        </Route>
    </Route>
);

const router = createBrowserRouter(routes);

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Toaster position="bottom-right" richColors />
            <RouterProvider router={router} />
        </QueryClientProvider>
    );
}

if (document.getElementById('app')) {
    createRoot(document.getElementById('app')).render(<App />);
}