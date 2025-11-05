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
import EmployeeList from './features/employees/EmployeeList';
import EmployeeForm from './features/employees/EmployeeForm';
import DepartmentList from './features/employees/DepartmentList';
import DepartmentForm from './features/employees/DepartmentForm';
import SalaryList from './features/financial/SalaryList';
import SalaryForm from './features/financial/SalaryForm';
import LeaveTypeList from './features/financial/LeaveTypeList';
import LeaveTypeForm from './features/financial/LeaveTypeForm';
import LeaveList from './features/financial/LeaveList';
import LeaveForm from './features/financial/LeaveForm';
import AttendanceList from './features/financial/AttendanceList';
import AttendanceForm from './features/financial/AttendanceForm';
import PayrollRecordList from './features/financial/PayrollRecordList';
import PayrollRecordForm from './features/financial/PayrollRecordForm';
import FinancialDashboard from './features/financial/FinancialDashboard';
import InvoiceList from './features/financial/InvoiceList';
import InvoiceForm from './features/financial/InvoiceForm';
import CostReports from './features/financial/CostReports';
import SupplierPaymentList from './features/financial/SupplierPaymentList';
import SupplierPaymentForm from './features/financial/SupplierPaymentForm';

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
                <Route path="/employees/create" element={<EmployeeForm />} />
                <Route path="/employees/:id/edit" element={<EmployeeForm />} />
                <Route path="/employees" element={<EmployeeList />} />
                <Route path="/departments/create" element={<DepartmentForm />} />
                <Route path="/departments/:id/edit" element={<DepartmentForm />} />
                <Route path="/departments" element={<DepartmentList />} />
                <Route path="/salaries/create" element={<SalaryForm />} />
                <Route path="/salaries/:id/edit" element={<SalaryForm />} />
                <Route path="/salaries" element={<SalaryList />} />
                <Route path="/leave-types/create" element={<LeaveTypeForm />} />
                <Route path="/leave-types/:id/edit" element={<LeaveTypeForm />} />
                <Route path="/leave-types" element={<LeaveTypeList />} />
                <Route path="/leaves/create" element={<LeaveForm />} />
                <Route path="/leaves/:id/edit" element={<LeaveForm />} />
                <Route path="/leaves" element={<LeaveList />} />
                <Route path="/attendance/create" element={<AttendanceForm />} />
                <Route path="/attendance/:id/edit" element={<AttendanceForm />} />
                <Route path="/attendance" element={<AttendanceList />} />
                <Route path="/payroll-records/create" element={<PayrollRecordForm />} />
                <Route path="/payroll-records/:id/edit" element={<PayrollRecordForm />} />
                <Route path="/payroll-records" element={<PayrollRecordList />} />
                <Route path="/financial/dashboard" element={<FinancialDashboard />} />
                <Route path="/invoices/create" element={<InvoiceForm />} />
                <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
                <Route path="/invoices" element={<InvoiceList />} />
                <Route path="/cost-reports" element={<CostReports />} />
                <Route path="/payments/create" element={<SupplierPaymentForm />} />
                <Route path="/payments/:id/edit" element={<SupplierPaymentForm />} />
                <Route path="/payments" element={<SupplierPaymentList />} />
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