<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with('supplier');

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', '%' . $search . '%')
                  ->orWhere('description', 'like', '%' . $search . '%')
                  ->orWhereHas('supplier', function ($q) use ($search) {
                      $q->where('name', 'like', '%' . $search . '%');
                  });
            });
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->has('date_from')) {
            $query->where('issue_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('issue_date', '<=', $request->date_to);
        }

        $query->orderBy('created_at', 'desc');

        return response()->json($query->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'type' => 'required|in:income,expense',
            'status' => 'sometimes|in:draft,sent,paid,overdue,cancelled',
            'issue_date' => 'required|date',
            'due_date' => 'nullable|date',
            'paid_date' => 'nullable|date',
            'subtotal' => 'required|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'category' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if (!isset($validated['invoice_number'])) {
            $prefix = $validated['type'] === 'income' ? 'INV-IN' : 'INV-EX';
            $validated['invoice_number'] = $prefix . '-' . strtoupper(Str::random(8));
        }

        $invoice = Invoice::create($validated);

        ActivityLogService::logCreated($invoice, $validated);

        return response()->json($invoice->load('supplier'), 201);
    }

    public function show(Invoice $invoice)
    {
        return response()->json($invoice->load('supplier', 'transactions'));
    }

    public function update(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'type' => 'sometimes|in:income,expense',
            'status' => 'sometimes|in:draft,sent,paid,overdue,cancelled',
            'issue_date' => 'sometimes|date',
            'due_date' => 'nullable|date',
            'paid_date' => 'nullable|date',
            'subtotal' => 'sometimes|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'total_amount' => 'sometimes|numeric|min:0',
            'category' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $oldValues = $invoice->only(array_keys($validated));
        $invoice->update($validated);
        $newValues = $invoice->only(array_keys($validated));

        ActivityLogService::logUpdated($invoice, $oldValues, $newValues);

        return response()->json($invoice->load('supplier', 'transactions'));
    }

    public function destroy(Invoice $invoice)
    {
        ActivityLogService::logDeleted($invoice);
        $invoice->delete();

        return response()->json(['message' => 'Invoice deleted successfully']);
    }
}

