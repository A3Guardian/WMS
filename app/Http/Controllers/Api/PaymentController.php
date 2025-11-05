<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = Transaction::with(['supplier', 'invoice']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('transaction_number', 'like', '%' . $search . '%')
                  ->orWhere('description', 'like', '%' . $search . '%')
                  ->orWhere('reference_number', 'like', '%' . $search . '%')
                  ->orWhereHas('supplier', function ($q) use ($search) {
                      $q->where('name', 'like', '%' . $search . '%');
                  });
            });
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->has('date_from')) {
            $query->where('transaction_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('transaction_date', '<=', $request->date_to);
        }

        $query->orderBy('transaction_date', 'desc')->orderBy('created_at', 'desc');

        return response()->json($query->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'invoice_id' => 'nullable|exists:invoices,id',
            'type' => 'required|in:payment,receipt,refund,adjustment',
            'category' => 'required|in:supplier_payment,customer_payment,salary,expense,income,other',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'required|in:cash,bank_transfer,check,credit_card,debit_card,other',
            'transaction_date' => 'required|date',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
            'reference_number' => 'nullable|string|max:255',
        ]);

        if (!isset($validated['transaction_number'])) {
            $prefix = 'TXN';
            $validated['transaction_number'] = $prefix . '-' . strtoupper(Str::random(8));
        }

        $transaction = Transaction::create($validated);

        ActivityLogService::logCreated($transaction, $validated);

        return response()->json($transaction->load('supplier', 'invoice'), 201);
    }

    public function show(Transaction $payment)
    {
        return response()->json($payment->load('supplier', 'invoice'));
    }

    public function update(Request $request, Transaction $payment)
    {
        $validated = $request->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'invoice_id' => 'nullable|exists:invoices,id',
            'type' => 'sometimes|in:payment,receipt,refund,adjustment',
            'category' => 'sometimes|in:supplier_payment,customer_payment,salary,expense,income,other',
            'amount' => 'sometimes|numeric|min:0',
            'payment_method' => 'sometimes|in:cash,bank_transfer,check,credit_card,debit_card,other',
            'transaction_date' => 'sometimes|date',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
            'reference_number' => 'nullable|string|max:255',
        ]);

        $oldValues = $payment->only(array_keys($validated));
        $payment->update($validated);
        $newValues = $payment->only(array_keys($validated));

        ActivityLogService::logUpdated($payment, $oldValues, $newValues);

        return response()->json($payment->load('supplier', 'invoice'));
    }

    public function destroy(Transaction $payment)
    {
        ActivityLogService::logDeleted($payment);
        $payment->delete();

        return response()->json(['message' => 'Payment deleted successfully']);
    }
}

