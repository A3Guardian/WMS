import React, { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
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
import { Download } from "lucide-react";
import PageHeader from "../../components/PageHeader";

const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
];

export default function CostReports() {
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

    const {
        data: invoicesData,
        isError: isInvoicesError,
        error: invoicesError,
    } = useQuery({
        queryKey: ["invoices-report", dateFrom, dateTo, supplierId, category],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set("type", "expense");
            params.set("per_page", "100");
            params.set("date_from", dateFrom);
            params.set("date_to", dateTo);
            if (supplierId) params.append("supplier_id", supplierId);
            if (category) params.append("category", category);
            const response = await api.get(`/invoices?${params.toString()}`);
            return response.data;
        },
    });

    const fetchSuppliers = (params) =>
        api.get("/suppliers?" + params).then((r) => r.data);

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
    <title>${t("costReports.export.pdf.title")}</title>
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
            const xlsxModule = await import("xlsx");
            const XLSX = xlsxModule.default ?? xlsxModule;

            const worksheet = XLSX.utils.json_to_sheet(
                (invoicesData?.data || []).map((inv) => ({
                    "Invoice Number": inv.invoice_number,
                    Supplier: inv.supplier?.name || "N/A",
                    Category: inv.category || "N/A",
                    "Issue Date": formatDate(inv.issue_date),
                    "Due Date": inv.due_date ? formatDate(inv.due_date) : "N/A",
                    Status: inv.status,
                    Subtotal: inv.subtotal,
                    Tax: inv.tax_amount,
                    Discount: inv.discount_amount,
                    "Total Amount": inv.total_amount,
                })),
            );

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                t("costReports.export.excel.sheetName"),
            );
            XLSX.writeFile(
                workbook,
                `${t("costReports.export.filePrefix")}-${dateFrom}-${dateTo}.xlsx`,
            );
        } catch (error) {
            console.error("Export error:", error);
        }
    };

    if (isLoading) {
        return <div>{t("costReports.loading")}</div>;
    }

    const summary = dashboardData?.summary || {};
    const charts = dashboardData?.charts || {};
    const invoices = invoicesData?.data || [];

    return (
        <div ref={exportRef}>
            <PageHeader
                title={t("costReports.title")}
                actions={
                    <div className="flex space-x-2" data-no-print>
                        {/*
                        <button
                            onClick={handleExportPDF}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                            <Download className="inline mr-2" size={16} />
                            {t("costReports.actions.exportPdf")}
                        </button>
                        */}
                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                            <Download className="inline mr-2" size={16} />
                            {t("costReports.actions.exportExcel")}
                        </button>
                    </div>
                }
            />

            {/* Filters */}
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                {isInvoicesError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {invoicesError?.response?.data?.message ||
                            invoicesError?.message ||
                            t("common.genericError")}
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("costReports.filters.dateFrom")}
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
                            {t("costReports.filters.dateTo")}
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
                            {t("costReports.filters.supplier")}
                        </label>
                        <SearchableSelect
                            value={supplierId}
                            onChange={(v) => setSupplierId(v || "")}
                            fetchOptions={fetchSuppliers}
                            displayValue={(sup) => sup?.name}
                            placeholder={t("costReports.filters.allSuppliers")}
                            cacheKey="cost-reports-suppliers"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("costReports.filters.category")}
                        </label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder={t(
                                "costReports.filters.categoryPlaceholder",
                            )}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white shadow-md rounded-lg p-6">
                    <p className="text-sm text-gray-600">
                        {t("costReports.cards.totalExpenses")}
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(summary.total_expenses || 0)}
                    </p>
                </div>
                <div className="bg-white shadow-md rounded-lg p-6">
                    <p className="text-sm text-gray-600">
                        {t("costReports.cards.totalIncome")}
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(summary.total_income || 0)}
                    </p>
                </div>
                <div className="bg-white shadow-md rounded-lg p-6">
                    <p className="text-sm text-gray-600">
                        {t("costReports.cards.netProfitLoss")}
                    </p>
                    <p
                        className={`text-2xl font-bold ${(summary.net_profit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                        {formatCurrency(summary.net_profit || 0)}
                    </p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">
                        {t("costReports.charts.expensesByCategory")}
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

                <div className="bg-white shadow-md rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">
                        {t("costReports.charts.expensesByMonth")}
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={charts.expenses_by_month || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip
                                formatter={(value) => formatCurrency(value)}
                            />
                            <Legend />
                            <Bar dataKey="total" fill="#ef4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Expense Invoices Table */}
            <div className="bg-white shadow-md rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">
                    {t("costReports.expenseInvoices.title")}
                </h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {t(
                                        "costReports.expenseInvoices.table.invoiceNumber",
                                    )}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {t(
                                        "costReports.expenseInvoices.table.supplier",
                                    )}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {t(
                                        "costReports.expenseInvoices.table.category",
                                    )}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {t(
                                        "costReports.expenseInvoices.table.date",
                                    )}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {t(
                                        "costReports.expenseInvoices.table.status",
                                    )}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {t(
                                        "costReports.expenseInvoices.table.amount",
                                    )}
                                </th>
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
                                            {inv.supplier?.name ||
                                                t("common.na")}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {inv.category || t("common.na")}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(inv.issue_date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span
                                                className={`px-2 py-1 text-xs rounded-full ${
                                                    inv.status === "paid"
                                                        ? "bg-green-100 text-green-800"
                                                        : inv.status ===
                                                            "overdue"
                                                          ? "bg-red-100 text-red-800"
                                                          : "bg-gray-100 text-gray-800"
                                                }`}
                                            >
                                                {t(
                                                    `invoices.status.${inv.status}`,
                                                    {
                                                        defaultValue:
                                                            inv.status.toUpperCase(),
                                                    },
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {formatCurrency(
                                                inv.total_amount || 0,
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan="6"
                                        className="px-6 py-4 text-center text-gray-500"
                                    >
                                        {t("costReports.expenseInvoices.empty")}
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
