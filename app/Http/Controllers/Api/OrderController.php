<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderDocument;
use App\Models\Task;
use App\Models\Invoice;
use App\Services\ActivityLogService;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    protected $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    public function index(Request $request)
    {
        if ($request->user()->hasRole('Employee')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Order::with(['items.product', 'customer']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', '%' . $search . '%')
                    ->orWhereHas('customer', function ($customerQuery) use ($search) {
                        $customerQuery->where('name', 'like', '%' . $search . '%')
                            ->orWhere('company_name', 'like', '%' . $search . '%');
                    });
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = strtolower($request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';
        $allowedSort = ['status', 'customer_id', 'created_at', 'order_number', 'total_amount'];
        if (!in_array($sortBy, $allowedSort, true)) {
            $sortBy = 'created_at';
        }
        $query->orderBy($sortBy, $sortOrder);

        return response()->json($query->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'order_number' => 'nullable|string|unique:orders,order_number',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $order = $this->orderService->createOrder($validated);

        ActivityLogService::logCreated($order, [
            'order_number' => $order->order_number,
            'customer_id' => $order->customer_id,
            'status' => $order->status,
        ]);

        return response()->json($order->load(['items.product', 'customer']), 201);
    }

    public function show(Request $request, Order $order)
    {
        if ($request->user()->hasRole('Employee')) {
            $user = $request->user();
            $employee = $user->employee;
            $canAccess = false;
            if ($employee && (int) $order->assigned_to === (int) $employee->id) {
                $canAccess = true;
            }
            if (! $canAccess && Task::where('order_id', $order->id)->where('assigned_to', $user->id)->exists()) {
                $canAccess = true;
            }
            if (! $canAccess) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $order = $this->orderService->normalizeStoredPrices($order);

        return response()->json($order->load([
            'items.product',
            'customer',
            'documents',
            'assignedTo.user',
            'tasks.assignedTo',
        ]));
    }

    public function update(Request $request, Order $order)
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'status' => 'sometimes|in:pending,processing,completed,cancelled',
            'notes' => 'nullable|string',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'shipping_amount' => 'nullable|numeric|min:0',
            'items' => 'sometimes|array|min:0',
            'items.*.product_id' => 'required_with:items|exists:products,id',
            'items.*.quantity' => 'required_with:items|integer|min:1',
            'items.*.price' => 'required_with:items|numeric|min:0',
        ]);

        $payload = collect($validated)->only(['customer_id', 'status', 'notes', 'tax_rate', 'shipping_amount', 'items'])->all();
        $previousStatus = $order->status;
        $wasCompleted = $previousStatus === 'completed';
        $oldValues = $order->only(['customer_id', 'status', 'notes']);
        $order = $this->orderService->updateOrder($order, $payload);
        $newValues = $order->only(['customer_id', 'status', 'notes']);
        ActivityLogService::logUpdated($order, $oldValues, $newValues);

        if (isset($validated['status']) && $validated['status'] === 'completed' && ! $wasCompleted) {
            try {
                $this->orderService->fulfillOrder($order);
            } catch (\InvalidArgumentException $e) {
                $order->update(['status' => $previousStatus]);

                return response()->json(['message' => $e->getMessage()], 422);
            }
        }

        return response()->json($order->load(['items.product', 'customer']));
    }

    public function destroy(Order $order)
    {
        ActivityLogService::logDeleted($order);
        $order->delete();

        return response()->json(['message' => 'Order deleted successfully']);
    }

    public function uploadDocument(Request $request, Order $order)
    {
        $request->validate([
            'file' => 'required|file|max:10240', // 10MB
            'name' => 'nullable|string|max:255',
            'type' => 'nullable|string|in:awb,invoice,other',
        ]);

        $file = $request->file('file');
        $dir = 'orders/' . $order->id;
        $path = $file->store($dir, 'public');
        $name = $request->input('name') ?: $file->getClientOriginalName();
        $type = $request->input('type', 'other');

        $doc = OrderDocument::create([
            'order_id' => $order->id,
            'name' => $name,
            'file_path' => $path,
            'type' => $type,
        ]);

        ActivityLogService::logCreated($doc, ['name' => $name, 'type' => $type]);

        $order->load(['documents']);
        return response()->json(['document' => $doc, 'order' => $order], 201);
    }

    public function deleteDocument(Order $order, $document)
    {
        $document = OrderDocument::where('order_id', $order->id)->findOrFail($document);
        if (Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }
        ActivityLogService::logDeleted($document);
        $document->delete();
        $order->load(['documents']);
        return response()->json(['message' => 'Document deleted.', 'order' => $order]);
    }

    public function assign(Request $request, Order $order)
    {
        $validated = $request->validate([
            'employee_id' => 'nullable|exists:employees,id',
        ]);

        $oldValue = $order->assigned_to;
        $order->update(['assigned_to' => $validated['employee_id'] ?? null]);
        ActivityLogService::logUpdated($order, ['assigned_to' => $oldValue], ['assigned_to' => $order->assigned_to]);

        return response()->json($order->load(['items.product', 'customer', 'documents', 'assignedTo.user']));
    }

    public function generateInvoice(Order $order)
    {
        $invoiceNumber = 'INV-IN-' . strtoupper(Str::random(8));
        $invoice = Invoice::create([
            'invoice_number' => $invoiceNumber,
            'customer_id' => $order->customer_id,
            'type' => 'income',
            'status' => 'draft',
            'issue_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'subtotal' => $order->total_amount,
            'tax_amount' => 0,
            'discount_amount' => 0,
            'total_amount' => $order->total_amount,
            'category' => 'sales',
            'description' => 'Factură generată din comanda ' . $order->order_number,
        ]);

        ActivityLogService::logCreated($invoice, ['customer_id' => $order->customer_id]);

        return response()->json($invoice->load(['customer']), 201);
    }
}

