<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\ActivityLogService;
use App\Services\OrderService;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    protected $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    public function index(Request $request)
    {
        $query = Order::with(['items', 'supplier']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'order_number' => 'nullable|string|unique:orders,order_number',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
        ]);

        $order = $this->orderService->createOrder($validated);

        ActivityLogService::logCreated($order, [
            'order_number' => $order->order_number,
            'supplier_id' => $order->supplier_id,
            'status' => $order->status,
        ]);

        return response()->json($order->load(['items', 'supplier']), 201);
    }

    public function show(Order $order)
    {
        return response()->json($order->load(['items.product', 'supplier']));
    }

    public function update(Request $request, Order $order)
    {
        $validated = $request->validate([
            'status' => 'sometimes|required|in:pending,processing,completed,cancelled',
            'notes' => 'nullable|string',
        ]);

        $oldValues = $order->only(array_keys($validated));
        $order->update($validated);
        $newValues = $order->only(array_keys($validated));

        ActivityLogService::logUpdated($order, $oldValues, $newValues);

        if (isset($validated['status']) && $validated['status'] === 'completed') {
            $this->orderService->fulfillOrder($order);
        }

        return response()->json($order->load(['items.product', 'supplier']));
    }

    public function destroy(Order $order)
    {
        ActivityLogService::logDeleted($order);
        $order->delete();

        return response()->json(['message' => 'Order deleted successfully']);
    }
}

