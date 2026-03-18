import React, { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";
import api from "../../utils/api";
import SearchableSelect from "../../components/SearchableSelect";
import { formatCurrency, formatDate } from "../../utils/formatters";
import {
    Download,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
} from "lucide-react";
import PageHeader from "../../components/PageHeader";

const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
];

export default function FinancialDashboard() {
    const { t } = useTranslation();
    const exportRef = useRef(null);
    const [dateFrom, setDateFrom] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString()
            .split("T")[0],
    );
    const [dateTo, setDateTo] = useState(
        new Date().toISOString().split("T")[0],
    );
    const [supplierId, setSupplierId] = useState("");
    const [category, setCategory] = useState("");

    const { data: dashboardData, isLoading } = useQuery({
        queryKey: [
            "financial-dashboard",
            dateFrom,
            dateTo,
            supplierId,
            category,
        ],
        queryFn: async () => {
            const params = new URLSearchParams({
                date_from: dateFrom,
                date_to: dateTo,
            });
            if (supplierId) params.append("supplier_id", supplierId);
            if (category) params.append("category", category);
            const response = await api.get(
                `/financial/dashboard?${params.toString()}`,
            );
            return response.data;
        },
    });

    const fetchSuppliers = (params) => api.get("/suppliers?" + params).then((r) => r.data);

    const handleExportPDF = async () => {
        try {
            const el = exportRef.current;
            if (!el) return;

            const win = window.open("", "_blank", "noopener,noreferrer");
            if (!win) return;

            const styles = Array.from(
                document.querySelectorAll('link[rel="stylesheet"], style'),
            )
                .map((n) => n.outerHTML)
                .join("\n");

            const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${t("financialDashboard.export.pdf.title")}</title>
    ${styles}
    <style>
      @media print {
        [data-no-print] { display: none !important; }
        body { background: #fff !important; }
      }
    </style>
  </head>
  <body>
    ${el.outerHTML}
  </body>
</html>`;

            win.document.open();
            win.document.write(html);
            win.document.close();

            const tryPrint = () => {
                try {
                    win.focus();
                    win.print();
                    return true;
                } catch {
                    return false;
                }
            };

            setTimeout(() => {
                if (tryPrint()) return;
                setTimeout(() => tryPrint(), 750);
            }, 250);
        } catch (error) {
            console.error("Export error:", error);
        }
    };

    const handleExportExcel = async () => {
        try {
            const params = new URLSearchParams({
                date_from: dateFrom,
                date_to: dateTo,
                type: "excel",
            });
            if (supplierId) params.append("supplier_id", supplierId);
            if (category) params.append("category", category);
            const response = await api.get(
                `/financial/export?${params.toString()}`,
            );

            const xlsxModule = await import("xlsx");
            const XLSX = xlsxModule.default ?? xlsxModule;

            const worksheet = XLSX.utils.json_to_sheet(
                response.data.data.map((inv) => ({
                    "Invoice Number": inv.invoice_number,
                    Supplier: inv.supplier?.name || "N/A",
                    Type: inv.type,
                    Status: inv.status,
                    "Issue Date": formatDate(inv.issue_date),
                    "Due Date": inv.due_date ? formatDate(inv.due_date) : "N/A",
                    Subtotal: inv.subtotal,
                    Tax: inv.tax_amount,
                    Discount: inv.discount_amount,
                    "Total Amount": inv.total_amount,
                    Category: inv.category || "N/A",
                })),
            );

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                t("financialDashboard.export.excel.sheetName"),
            );
            XLSX.writeFile(
                workbook,
                `${t("financialDashboard.export.filePrefix")}-${dateFrom}-${dateTo}.xlsx`,
            );
        } catch (error) {
            console.error("Export error:", error);
        }
    };

    if (isLoading) {
        return <div>{t("financialDashboard.loading")}</div>;
    }

    const summary = dashboardData?.summary || {};
    const charts = dashboardData?.charts || {};
    const recentTransactions = dashboardData?.recent_transactions || [];
    const topSuppliers = dashboardData?.top_suppliers || [];

    const incomeExpensesData =
        charts.income_by_month?.map((item, idx) => ({
            month: item.month,
            income: parseFloat(item.total || 0),
            expenses: parseFloat(charts.expenses_by_month?.[idx]?.total || 0),
        })) || [];

    return (
        <div ref={exportRef}>
            <PageHeader
                title={t("financialDashboard.title")}
                actions={
                    <div className="flex space-x-2" data-no-print>
                        {/*
                        <button
                            onClick={handleExportPDF}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                            <Download className="inline mr-2" size={16} />
                            {t("financialDashboard.actions.exportPdf")}
                        </button>
                        */}
                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                            <Download className="inline mr-2" size={16} />
                            {t("financialDashboard.actions.exportExcel")}
                        </button>
                    </div>
                }
            />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("financialDashboard.filters.dateFrom")}
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
                            {t("financialDashboard.filters.dateTo")}
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
                            {t("financialDashboard.filters.supplier")}
                        </label>
                        <SearchableSelect
                            value={supplierId}
                            onChange={(v) => setSupplierId(v || "")}
                            fetchOptions={fetchSuppliers}
                            displayValue={(sup) => sup?.name}
                            placeholder={t("financialDashboard.filters.allSuppliers")}
                            cacheKey="dashboard-suppliers"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("financialDashboard.filters.category")}
                        </label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder={t("financialDashboard.filters.categoryPlaceholder")}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white shadow-md rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">
                                {t("financialDashboard.cards.totalIncome")}
                            </p>
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
                            <p className="text-sm text-gray-600">
                                {t("financialDashboard.cards.totalExpenses")}
                            </p>
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
                            <p className="text-sm text-gray-600">
                                {t("financialDashboard.cards.netProfit")}
                            </p>
                            <p
                                className={`text-2xl font-bold ${(summary.net_profit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                                {formatCurrency(summary.net_profit || 0)}
                            </p>
                        </div>
                        <DollarSign className="text-blue-600" size={32} />
                    </div>
                </div>
                <div className="bg-white shadow-md rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">
                                {t("financialDashboard.cards.stockValue")}
                            </p>
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
                    <h3 className="text-lg font-semibold mb-4">
                        {t("financialDashboard.charts.incomeVsExpenses")}
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={incomeExpensesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip
                                formatter={(value) => formatCurrency(value)}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="income"
                                stroke="#22c55e"
                                name={t("financialDashboard.charts.income")}
                            />
                            <Line
                                type="monotone"
                                dataKey="expenses"
                                stroke="#ef4444"
                                name={t("financialDashboard.charts.expenses")}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white shadow-md rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">
                        {t("financialDashboard.charts.expensesByCategory")}
                    </h3>
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
                                {(charts.expenses_by_category || []).map(
                                    (entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ),
                                )}
                            </Pie>
                            <Tooltip
                                formatter={(value) => formatCurrency(value)}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">
                        {t("financialDashboard.charts.paymentMethods")}
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={charts.payment_methods || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="payment_method" />
                            <YAxis />
                            <Tooltip
                                formatter={(value) => formatCurrency(value)}
                            />
                            <Legend />
                            <Bar dataKey="total" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white shadow-md rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">
                        {t("financialDashboard.topSuppliers.title")}
                    </h3>
                    <div className="space-y-3">
                        {topSuppliers.length > 0 ? (
                            topSuppliers.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex justify-between items-center p-3 bg-gray-50 rounded"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {item.supplier?.name || "N/A"}
                                        </p>
                                    </div>
                                    <p className="font-bold text-blue-600">
                                        {formatCurrency(item.total || 0)}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500">
                                {t("financialDashboard.topSuppliers.empty")}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">
                    {t("financialDashboard.recentTransactions.title")}
                </h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {t("financialDashboard.recentTransactions.table.date")}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {t("financialDashboard.recentTransactions.table.transactionNumber")}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {t("financialDashboard.recentTransactions.table.supplier")}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {t("financialDashboard.recentTransactions.table.type")}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {t("financialDashboard.recentTransactions.table.amount")}
                                </th>
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
                                            {txn.supplier?.name || t("common.na")}
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
                                    <td
                                        colSpan="5"
                                        className="px-6 py-4 text-center text-gray-500"
                                    >
                                        {t("financialDashboard.recentTransactions.empty")}
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
