<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Services\ActivityLogService;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use App\Models\Shelf;
use App\Models\Deposit;

class InventoryController extends Controller
{
    protected $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    public function index(Request $request)
    {
        $query = Inventory::with(['product', 'deposit', 'shelf']);

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->has('deposit_id')) {
            $query->where('deposit_id', $request->deposit_id);
        }

        if ($request->has('shelf_id')) {
            $query->where('shelf_id', $request->shelf_id);
        }

        if ($request->has('low_stock')) {
            $query->whereColumn('quantity', '<=', 'reorder_level');
        }

        return response()->json($query->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:0',
            'deposit_id' => 'nullable|exists:deposits,id',
            'shelf_id' => 'nullable|exists:shelves,id',
            'location' => 'nullable|string|max:255',
            'reorder_level' => 'nullable|integer|min:0',
        ]);

        if (isset($validated['shelf_id']) && isset($validated['deposit_id'])) {
            $shelf = Shelf::find($validated['shelf_id']);
            if ($shelf && $shelf->deposit_id != $validated['deposit_id']) {
                return response()->json([
                    'message' => 'The shelf does not belong to the selected deposit.'
                ], 422);
            }
        }

        $existing = Inventory::where('product_id', $validated['product_id'])
            ->where('deposit_id', $validated['deposit_id'] ?? null)
            ->where('shelf_id', $validated['shelf_id'] ?? null)
            ->first();

        if ($existing) {
            $existing->quantity += $validated['quantity'];
            $existing->save();
            $inventory = $existing;
        } else {
            $inventory = Inventory::create($validated);
        }

        ActivityLogService::logCreated($inventory, $validated);

        return response()->json($inventory->load(['product', 'deposit', 'shelf']), 201);
    }

    public function show(Inventory $inventory)
    {
        return response()->json($inventory->load(['product', 'deposit', 'shelf']));
    }

    public function update(Request $request, Inventory $inventory)
    {
        $validated = $request->validate([
            'quantity' => 'sometimes|required|integer|min:0',
            'deposit_id' => 'nullable|exists:deposits,id',
            'shelf_id' => 'nullable|exists:shelves,id',
            'location' => 'nullable|string|max:255',
            'reorder_level' => 'nullable|integer|min:0',
        ]);

        if (isset($validated['shelf_id']) && isset($validated['deposit_id'])) {
            $shelf = Shelf::find($validated['shelf_id']);
            if ($shelf && $shelf->deposit_id != $validated['deposit_id']) {
                return response()->json([
                    'message' => 'The shelf does not belong to the selected deposit.'
                ], 422);
            }
        }

        $oldValues = $inventory->only(array_keys($validated));
        $inventory->update($validated);
        $inventory->load(['product', 'deposit', 'shelf']);
        $newValues = $inventory->only(array_keys($validated));

        ActivityLogService::logUpdated($inventory, $oldValues, $newValues);

        return response()->json($inventory);
    }

    public function adjust(Request $request, Inventory $inventory)
    {
        $validated = $request->validate([
            'quantity' => 'required|integer',
            'reason' => 'nullable|string|max:255',
        ]);

        $result = $this->inventoryService->adjustStock(
            $inventory,
            $validated['quantity'],
            $validated['reason'] ?? null
        );

        return response()->json($result);
    }

    public function destroy(Inventory $inventory)
    {
        ActivityLogService::logDeleted($inventory);
        $inventory->delete();

        return response()->json(['message' => 'Inventory record deleted successfully']);
    }
}