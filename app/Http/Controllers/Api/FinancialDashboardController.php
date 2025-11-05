<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Transaction;
use App\Models\Inventory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinancialDashboardController extends Controller
{
    public function index(Request $request)
    {
        $dateFrom = $request->date_from ?? now()->startOfMonth()->toDateString();
        $dateTo = $request->date_to ?? now()->endOfMonth()->toDateString();
        $supplierId = $request->supplier_id;
        $category = $request->category;

        $incomeQuery = Invoice::where('type', 'income')
            ->whereBetween('issue_date', [$dateFrom, $dateTo]);
        
        $expenseQuery = Invoice::where('type', 'expense')
            ->whereBetween('issue_date', [$dateFrom, $dateTo]);

        if ($supplierId) {
            $incomeQuery->where('supplier_id', $supplierId);
            $expenseQuery->where('supplier_id', $supplierId);
        }

        if ($category) {
            $incomeQuery->where('category', $category);
            $expenseQuery->where('category', $category);
        }

        $totalIncome = $incomeQuery->sum('total_amount');
        $totalExpenses = $expenseQuery->sum('total_amount');
        $netProfit = $totalIncome - $totalExpenses;

        $stockValueResult = Inventory::join('products', 'inventories.product_id', '=', 'products.id')
            ->selectRaw('SUM(inventories.quantity * COALESCE(products.price, 0)) as total_value')
            ->first();
        $stockValue = $stockValueResult ? ($stockValueResult->total_value ?? 0) : 0;

        $incomeByMonth = Invoice::where('type', 'income')
            ->selectRaw('DATE_FORMAT(issue_date, "%Y-%m") as month, SUM(total_amount) as total')
            ->whereBetween('issue_date', [now()->subMonths(11)->startOfMonth(), $dateTo])
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $expensesByMonth = Invoice::where('type', 'expense')
            ->selectRaw('DATE_FORMAT(issue_date, "%Y-%m") as month, SUM(total_amount) as total')
            ->whereBetween('issue_date', [now()->subMonths(11)->startOfMonth(), $dateTo])
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $expensesByCategory = Invoice::where('type', 'expense')
            ->whereBetween('issue_date', [$dateFrom, $dateTo])
            ->selectRaw('category, SUM(total_amount) as total')
            ->groupBy('category')
            ->orderByDesc('total')
            ->get();

        $recentTransactions = Transaction::with(['supplier', 'invoice'])
            ->whereBetween('transaction_date', [$dateFrom, $dateTo])
            ->orderBy('transaction_date', 'desc')
            ->limit(10)
            ->get();

        $paymentMethods = Transaction::whereBetween('transaction_date', [$dateFrom, $dateTo])
            ->selectRaw('payment_method, SUM(amount) as total')
            ->groupBy('payment_method')
            ->get();

        $topSuppliers = Transaction::with('supplier')
            ->whereBetween('transaction_date', [$dateFrom, $dateTo])
            ->selectRaw('supplier_id, SUM(amount) as total')
            ->groupBy('supplier_id')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        return response()->json([
            'summary' => [
                'total_income' => (float) $totalIncome,
                'total_expenses' => (float) $totalExpenses,
                'net_profit' => (float) $netProfit,
                'stock_value' => (float) $stockValue,
            ],
            'charts' => [
                'income_by_month' => $incomeByMonth,
                'expenses_by_month' => $expensesByMonth,
                'expenses_by_category' => $expensesByCategory,
                'payment_methods' => $paymentMethods,
            ],
            'recent_transactions' => $recentTransactions,
            'top_suppliers' => $topSuppliers,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'supplier_id' => $supplierId,
                'category' => $category,
            ],
        ]);
    }

    public function export(Request $request)
    {
        $dateFrom = $request->date_from ?? now()->startOfMonth()->toDateString();
        $dateTo = $request->date_to ?? now()->endOfMonth()->toDateString();
        $supplierId = $request->supplier_id;
        $category = $request->category;
        $type = $request->type ?? 'pdf';

        $query = Invoice::with('supplier')
            ->whereBetween('issue_date', [$dateFrom, $dateTo]);

        if ($supplierId) {
            $query->where('supplier_id', $supplierId);
        }

        if ($category) {
            $query->where('category', $category);
        }

        $invoices = $query->get();

        return response()->json([
            'data' => $invoices,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'supplier_id' => $supplierId,
                'category' => $category,
            ],
        ]);
    }
}

