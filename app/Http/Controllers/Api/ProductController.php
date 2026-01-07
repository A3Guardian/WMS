<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Inventory;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['supplier', 'inventories.deposit', 'inventories.shelf']);

        if ($request->has('search')) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('sku', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('deposit_id')) {
            $query->whereHas('inventories', function($q) use ($request) {
                $q->where('deposit_id', $request->deposit_id);
            });
        }

        if ($request->has('shelf_id')) {
            $query->whereHas('inventories', function($q) use ($request) {
                $q->where('shelf_id', $request->shelf_id);
            });
        }

        return response()->json($query->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sku' => 'required|string|unique:products,sku',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
            
            'quantity' => 'nullable|integer|min:0',
            'deposit_id' => 'nullable|exists:deposits,id',
            'shelf_id' => 'nullable|exists:shelves,id',
            'reorder_level' => 'nullable|integer|min:0',
        ]);

        if (isset($validated['shelf_id']) && isset($validated['deposit_id'])) {
            $shelf = \App\Models\Shelf::find($validated['shelf_id']);
            if ($shelf && $shelf->deposit_id != $validated['deposit_id']) {
                return response()->json([
                    'message' => 'The shelf does not belong to the selected deposit.'
                ], 422);
            }
        }

        if (isset($validated['quantity']) && $validated['quantity'] > 0 && !isset($validated['deposit_id'])) {
            return response()->json([
                'message' => 'Deposit ID is required when adding initial quantity.'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $inventoryData = array_filter([
                'quantity' => $validated['quantity'] ?? null,
                'deposit_id' => $validated['deposit_id'] ?? null,
                'shelf_id' => $validated['shelf_id'] ?? null,
                'reorder_level' => $validated['reorder_level'] ?? 0,
            ], fn($value) => $value !== null);

            $productData = array_diff_key($validated, array_flip([
                'quantity', 'deposit_id', 'shelf_id', 'reorder_level'
            ]));

            $product = Product::create($productData);
            
            if (!empty($inventoryData) && isset($inventoryData['quantity']) && $inventoryData['quantity'] > 0) {
                $inventoryData['product_id'] = $product->id;
                $inventory = Inventory::create($inventoryData);
                ActivityLogService::logCreated($inventory, $inventoryData);
            }

            $product->load(['supplier', 'inventories.deposit', 'inventories.shelf']);
            
            ActivityLogService::logCreated($product, $productData);

            DB::commit();

            return response()->json($product, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create product: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show(Product $product)
    {
        $product->load(['supplier', 'inventories.deposit', 'inventories.shelf']);
        return response()->json($product);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'sku' => 'sometimes|required|string|unique:products,sku,' . $product->id,
            'description' => 'nullable|string',
            'price' => 'sometimes|required|numeric|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
        ]);

        $oldValues = $product->only(array_keys($validated));
        $product->update($validated);
        $product->load(['supplier', 'inventories.deposit', 'inventories.shelf']);
        $newValues = $product->only(array_keys($validated));

        ActivityLogService::logUpdated($product, $oldValues, $newValues);

        return response()->json($product);
    }

    public function destroy(Product $product)
    {
      
        foreach ($product->inventories as $inventory) {
            ActivityLogService::logDeleted($inventory);
        }

        ActivityLogService::logDeleted($product);
        $product->delete();

        return response()->json(['message' => 'Product deleted successfully']);
    }
}