import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Download, TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function FinancialDashboard() {
    const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
    const [supplierId, setSupplierId] = useState('');
    const [category, setCategory] = useState('');

    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['financial-dashboard', dateFrom, dateTo, supplierId, category],
        queryFn: async () => {
            const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
            if (supplierId) params.append('supplier_id', supplierId);
            if (category) params.append('category', category);
            const response = await api.get(`/financial/dashboard?${params.toString()}`);
            return response.data;
        },
    });

    const { data: suppliersData } = useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const response = await api.get('/suppliers?per_page=100');
            return response.data;
        },
    });

    const handleExportPDF = async () => {
        try {
            const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo, type: 'pdf' });
            if (supplierId) params.append('supplier_id', supplierId);
            if (category) params.append('category', category);
            const response = await api.get(`/financial/export?${params.toString()}`);
            
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');
            
            const doc = new jsPDF();
            
            doc.setFontSize(18);
            doc.text('Financial Report', 14, 22);
            doc.setFontSize(12);
            doc.text(`Period: ${formatDate(dateFrom)} - ${formatDate(dateTo)}`, 14, 30);
            
            if (dashboardData?.summary) {
                doc.setFontSize(14);
                doc.text('Summary', 14, 45);
                doc.setFontSize(10);
                let yPos = 52;
                doc.text(`Total Income: ${formatCurrency(dashboardData.summary.total_income)}`, 14, yPos);
                yPos += 7;
                doc.text(`Total Expenses: ${formatCurrency(dashboardData.summary.total_expenses)}`, 14, yPos);
                yPos += 7;
                doc.text(`Net Profit: ${formatCurrency(dashboardData.summary.net_profit)}`, 14, yPos);
                yPos += 7;
                doc.text(`Stock Value: ${formatCurrency(dashboardData.summary.stock_value)}`, 14, yPos);
                
                if (response.data?.data?.length > 0) {
                    yPos += 10;
                    autoTable(doc, {
                        startY: yPos,
                        head: [['Invoice #', 'Type', 'Status', 'Date', 'Amount']],
                        body: response.data.data.map(inv => [
                            inv.invoice_number,
                            inv.type,
                            inv.status,
                            formatDate(inv.issue_date),
                            formatCurrency(inv.total_amount)
                        ]),
                    });
                }
            }
            
            doc.save(`financial-report-${dateFrom}-${dateTo}.pdf`);
        } catch (error) {
            console.error('Export error:', error);
        }
    };

    const handleExportExcel = async () => {
        try {
            const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo, type: 'excel' });
            if (supplierId) params.append('supplier_id', supplierId);
            if (category) params.append('category', category);
            const response = await api.get(`/financial/export?${params.toString()}`);
            
            const { default: XLSX } = await import('xlsx');
            
            const worksheet = XLSX.utils.json_to_sheet(
                response.data.data.map(inv => ({
                    'Invoice Number': inv.invoice_number,
                    'Supplier': inv.supplier?.name || 'N/A',
                    'Type': inv.type,
                    'Status': inv.status,
                    'Issue Date': formatDate(inv.issue_date),
                    'Due Date': inv.due_date ? formatDate(inv.due_date) : 'N/A',
                    'Subtotal': inv.subtotal,
                    'Tax': inv.tax_amount,
                    'Discount': inv.discount_amount,
                    'Total Amount': inv.total_amount,
                    'Category': inv.category || 'N/A',
                }))
            );
            
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Financial Report');
            XLSX.writeFile(workbook, `financial-report-${dateFrom}-${dateTo}.xlsx`);
        } catch (error) {
            console.error('Export error:', error);
        }
    };

    if (isLoading) {
        return <div className="p-6">Loading dashboard...</div>;
    }

    const summary = dashboardData?.summary || {};
    const charts = dashboardData?.charts || {};
    const recentTransactions = dashboardData?.recent_transactions || [];
    const topSuppliers = dashboardData?.top_suppliers || [];

    const incomeExpensesData = charts.income_by_month?.map((item, idx) => ({
        month: item.month,
        income: parseFloat(item.total || 0),
        expenses: parseFloat(charts.expenses_by_month?.[idx]?.total || 0),
    })) || [];

    const suppliers = suppliersData?.data || [];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Financial Dashboard</h1>
                <div className="flex space-x-2">
                    <button
                        onClick={handleExportPDF}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                        <Download className="inline mr-2" size={16} />
                        Export PDF
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                        <Download className="inline mr-2" size={16} />
                        Export Excel
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date From
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date To
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Supplier
                        </label>
                        <select
                            value={supplierId}
                            onChange={(e) => setSupplierId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="">All Suppliers</option>
                            {suppliers.map((sup) => (
                                <option key={sup.id} value={sup.id}>
                                    {sup.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                        </label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="Filter by category"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white shadow-md rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Income</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(summary.total_income || 0)}
                            </p>
                        </div>
                        <TrendingUp className="text-green-600" size={32} />
                    </div>
                </div>
                <div className="bg-white shadow-md rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Expenses</p>
                            <p className="text-2xl font-bold text-red-600">
                                {formatCurrency(summary.total_expenses || 0)}
                            </p>
                        </div>
                        <TrendingDown className="text-red-600" size={32} />
                    </div>
                </div>
                <div className="bg-white shadow-md rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Net Profit</p>
                            <p className={`text-2xl font-bold ${(summary.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(summary.net_profit || 0)}
                            </p>
                        </div>
                        <DollarSign className="text-blue-600" size={32} />
                    </div>
                </div>
                <div className="bg-white shadow-md rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Stock Value</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {formatCurrency(summary.stock_value || 0)}
                            </p>
                        </div>
                        <Package className="text-blue-600" size={32} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Income vs Expenses (Last 12 Months)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={incomeExpensesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                            <Line type="monotone" dataKey="income" stroke="#22c55e" name="Income" />
                            <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white shadow-md rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Expenses by Category</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={charts.expenses_by_category || []}
                                dataKey="total"
                                nameKey="category"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label
                            >
                                {(charts.expenses_by_category || []).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={charts.payment_methods || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="payment_method" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="total" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white shadow-md rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Top Suppliers by Payment</h3>
                    <div className="space-y-3">
                        {topSuppliers.length > 0 ? (
                            topSuppliers.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <div>
                                        <p className="font-medium">{item.supplier?.name || 'N/A'}</p>
                                    </div>
                                    <p className="font-bold text-blue-600">
                                        {formatCurrency(item.total || 0)}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500">No data available</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {recentTransactions.length > 0 ? (
                                recentTransactions.map((txn) => (
                                    <tr key={txn.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(txn.transaction_date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {txn.transaction_number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {txn.supplier?.name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                                {txn.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {formatCurrency(txn.amount || 0)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                        No recent transactions
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

