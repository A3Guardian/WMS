import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Download } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function CostReports() {
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

    const { data: invoicesData } = useQuery({
        queryKey: ['invoices-report', dateFrom, dateTo, supplierId, category],
        queryFn: async () => {
            const params = new URLSearchParams({ 
                type: 'expense',
                per_page: '100',
            });
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            if (supplierId) params.append('supplier_id', supplierId);
            if (category) params.append('category', category);
            const response = await api.get(`/invoices?${params.toString()}`);
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
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');
            
            const doc = new jsPDF();
            
            doc.setFontSize(18);
            doc.text('Cost Report', 14, 22);
            doc.setFontSize(12);
            doc.text(`Period: ${formatDate(dateFrom)} - ${formatDate(dateTo)}`, 14, 30);
            
            if (dashboardData?.summary) {
                doc.setFontSize(14);
                doc.text('Summary', 14, 45);
                doc.setFontSize(10);
                let yPos = 52;
                doc.text(`Total Expenses: ${formatCurrency(dashboardData.summary.total_expenses)}`, 14, yPos);
                yPos += 7;
                doc.text(`Total Income: ${formatCurrency(dashboardData.summary.total_income)}`, 14, yPos);
                yPos += 7;
                doc.text(`Net: ${formatCurrency(dashboardData.summary.net_profit)}`, 14, yPos);
                
                if (invoicesData?.data?.length > 0) {
                    yPos += 10;
                    autoTable(doc, {
                        startY: yPos,
                        head: [['Invoice #', 'Supplier', 'Category', 'Date', 'Amount']],
                        body: invoicesData.data.map(inv => [
                            inv.invoice_number,
                            inv.supplier?.name || 'N/A',
                            inv.category || 'N/A',
                            formatDate(inv.issue_date),
                            formatCurrency(inv.total_amount)
                        ]),
                    });
                }
            }
            
            doc.save(`cost-report-${dateFrom}-${dateTo}.pdf`);
        } catch (error) {
            console.error('Export error:', error);
        }
    };

    const handleExportExcel = async () => {
        try {
            const { default: XLSX } = await import('xlsx');
            
            const worksheet = XLSX.utils.json_to_sheet(
                (invoicesData?.data || []).map(inv => ({
                    'Invoice Number': inv.invoice_number,
                    'Supplier': inv.supplier?.name || 'N/A',
                    'Category': inv.category || 'N/A',
                    'Issue Date': formatDate(inv.issue_date),
                    'Due Date': inv.due_date ? formatDate(inv.due_date) : 'N/A',
                    'Status': inv.status,
                    'Subtotal': inv.subtotal,
                    'Tax': inv.tax_amount,
                    'Discount': inv.discount_amount,
                    'Total Amount': inv.total_amount,
                }))
            );
            
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Cost Report');
            XLSX.writeFile(workbook, `cost-report-${dateFrom}-${dateTo}.xlsx`);
        } catch (error) {
            console.error('Export error:', error);
        }
    };

    if (isLoading) {
        return <div className="p-6">Loading cost reports...</div>;
    }

    const summary = dashboardData?.summary || {};
    const charts = dashboardData?.charts || {};
    const invoices = invoicesData?.data || [];

    const suppliers = suppliersData?.data || [];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Cost Reports</h1>
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

            {/* Filters */}
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

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white shadow-md rounded-lg p-6">
                    <p className="text-sm text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(summary.total_expenses || 0)}
                    </p>
                </div>
                <div className="bg-white shadow-md rounded-lg p-6">
                    <p className="text-sm text-gray-600">Total Income</p>
                    <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(summary.total_income || 0)}
                    </p>
                </div>
                <div className="bg-white shadow-md rounded-lg p-6">
                    <p className="text-sm text-gray-600">Net Profit/Loss</p>
                    <p className={`text-2xl font-bold ${(summary.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(summary.net_profit || 0)}
                    </p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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

                <div className="bg-white shadow-md rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Expenses by Month</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={charts.expenses_by_month || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="total" fill="#ef4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Expense Invoices Table */}
            <div className="bg-white shadow-md rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Expense Invoices</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {invoices.length > 0 ? (
                                invoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {inv.invoice_number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {inv.supplier?.name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {inv.category || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(inv.issue_date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                                inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                inv.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {inv.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {formatCurrency(inv.total_amount || 0)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                        No expense invoices found
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

