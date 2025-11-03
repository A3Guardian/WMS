<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Services\InventoryService;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    protected $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    public function index(Request $request)
    {
        $query = Inventory::with('product');

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
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
            'location' => 'nullable|string|max:255',
            'reorder_level' => 'nullable|integer|min:0',
        ]);

        $inventory = Inventory::create($validated);

        return response()->json($inventory->load('product'), 201);
    }

    public function show(Inventory $inventory)
    {
        return response()->json($inventory->load('product'));
    }

    public function update(Request $request, Inventory $inventory)
    {
        $validated = $request->validate([
            'quantity' => 'sometimes|required|integer|min:0',
            'location' => 'nullable|string|max:255',
            'reorder_level' => 'nullable|integer|min:0',
        ]);

        $inventory->update($validated);

        return response()->json($inventory->load('product'));
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
        $inventory->delete();

        return response()->json(['message' => 'Inventory record deleted successfully']);
    }
}

