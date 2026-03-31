<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InvoiceController extends Controller
{
    public function uploadAttachments(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'attachments' => 'required|array|min:1',
            'attachments.*' => 'file|max:10240',
        ]);

        $existing = is_array($invoice->attachments) ? $invoice->attachments : [];
        $stored = [];
        foreach ($request->file('attachments') as $file) {
            $stored[] = $file->store('invoices/' . $invoice->id, 'public');
        }
        $invoice->attachments = array_values(array_merge($existing, $stored));
        $invoice->save();

        return response()->json($invoice->load([
            'supplier',
            'customer',
            'transactions',
            'items.product',
        ]));
    }

    public function index(Request $request)
    {
        $query = Invoice::with(['supplier', 'customer']);

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

        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
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
            'customer_id' => 'nullable|exists:customers,id',
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
            'items' => 'nullable|array',
            'items.*.item_type' => 'required_with:items|in:product,service',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.name' => 'nullable|string|max:255',
            'items.*.sku' => 'nullable|string|max:255',
            'items.*.description' => 'nullable|string',
            'items.*.quantity' => 'required_with:items|numeric|min:0.001',
            'items.*.unit' => 'nullable|string|max:50',
            'items.*.unit_price' => 'required_with:items|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        if (!isset($validated['invoice_number'])) {
            $prefix = $validated['type'] === 'income' ? 'INV-IN' : 'INV-EX';
            $validated['invoice_number'] = $prefix . '-' . strtoupper(Str::random(8));
        }

        $itemsInput = $validated['items'] ?? [];
        unset($validated['items']);

        return DB::transaction(function () use ($validated, $itemsInput) {
            $invoice = Invoice::create($validated);

            $this->syncItems($invoice, $itemsInput);

            ActivityLogService::logCreated($invoice, $validated);

            return response()->json(
                $invoice->load(['supplier', 'customer', 'items.product']),
                201
            );
        });
    }

    public function show(Invoice $invoice)
    {
        return response()->json($invoice->load([
            'supplier',
            'customer',
            'transactions',
            'items.product',
        ]));
    }

    public function update(Request $request, Invoice $invoice)
    {
        $immutableAllowedKeys = ['status', 'paid_date', 'attachments'];
        if ($invoice->status !== 'draft') {
            $attempted = array_keys($request->all());
            if ($request->hasFile('attachments')) {
                $attempted[] = 'attachments';
            }
            $disallowed = array_values(array_diff($attempted, $immutableAllowedKeys));
            if (!empty($disallowed)) {
                return response()->json([
                    'message' => 'This invoice cannot be modified unless it is in draft status.',
                ], 422);
            }
        }

        $validated = $request->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'customer_id' => 'nullable|exists:customers,id',
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
            'items' => 'nullable|array',
            'items.*.item_type' => 'required_with:items|in:product,service',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.name' => 'nullable|string|max:255',
            'items.*.sku' => 'nullable|string|max:255',
            'items.*.description' => 'nullable|string',
            'items.*.quantity' => 'required_with:items|numeric|min:0.001',
            'items.*.unit' => 'nullable|string|max:50',
            'items.*.unit_price' => 'required_with:items|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_rate' => 'nullable|numeric|min:0|max:100',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240',
        ]);

        $itemsInput = $validated['items'] ?? null;
        unset($validated['items']);
        unset($validated['attachments']);

        return DB::transaction(function () use ($request, $invoice, $validated, $itemsInput) {
            $oldValues = $invoice->only(array_keys($validated));
            $invoice->update($validated);
            $newValues = $invoice->only(array_keys($validated));

            if (is_array($itemsInput)) {
                $this->syncItems($invoice, $itemsInput);
            }

            if ($request->hasFile('attachments')) {
                $existing = is_array($invoice->attachments) ? $invoice->attachments : [];
                $stored = [];
                foreach ($request->file('attachments') as $file) {
                    $stored[] = $file->store('invoices/' . $invoice->id, 'public');
                }
                $invoice->attachments = array_values(array_merge($existing, $stored));
                $invoice->save();
            }

            ActivityLogService::logUpdated($invoice, $oldValues, $newValues);

            return response()->json($invoice->load([
                'supplier',
                'customer',
                'transactions',
                'items.product',
            ]));
        });
    }

    private function syncItems(Invoice $invoice, array $itemsInput): void
    {
        $invoice->items()->delete();

        foreach (array_values($itemsInput) as $idx => $item) {
            $itemType = $item['item_type'] ?? 'product';

            $product = null;
            if (!empty($item['product_id'])) {
                $product = Product::find($item['product_id']);
            }

            $quantity = (float) ($item['quantity'] ?? 0);
            $unitPrice = (float) ($item['unit_price'] ?? 0);
            $taxRate = (float) ($item['tax_rate'] ?? 0);
            $discountRate = (float) ($item['discount_rate'] ?? 0);

            $base = $quantity * $unitPrice;
            $discount = $base * ($discountRate / 100);
            $lineSubtotal = max(0, $base - $discount);
            $lineTax = $lineSubtotal * ($taxRate / 100);
            $lineTotal = $lineSubtotal + $lineTax;

            $snapshotName = $item['name']
                ?? ($product?->name)
                ?? ($itemType === 'service' ? 'Service' : 'Product');

            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'position' => $idx,
                'item_type' => $itemType,
                'product_id' => $product?->id,
                'name' => $snapshotName,
                'sku' => $item['sku'] ?? ($product?->sku),
                'description' => $item['description'] ?? ($product?->description),
                'quantity' => $quantity,
                'unit' => $item['unit'] ?? null,
                'unit_price' => $unitPrice,
                'tax_rate' => $taxRate,
                'discount_rate' => $discountRate,
                'line_subtotal' => $lineSubtotal,
                'line_tax' => $lineTax,
                'line_total' => $lineTotal,
            ]);
        }
    }

    public function destroy(Invoice $invoice)
    {
        ActivityLogService::logDeleted($invoice);
        $invoice->delete();

        return response()->json(['message' => 'Invoice deleted successfully']);
    }
}
