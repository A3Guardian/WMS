<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['deposit', 'shelf', 'supplier']);

        if ($request->has('search')) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('sku', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('shelf_id')) {
            $query->where('shelf_id', $request->shelf_id);
        }

        if ($request->has('deposit_id')) {
            $query->where('deposit_id', $request->deposit_id);
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
            'deposit_id' => 'nullable|exists:deposits,id',
            'shelf_id' => 'nullable|exists:shelves,id',
        ]);

        if ($validated['shelf_id'] && $validated['deposit_id']) {
            $shelf = \App\Models\Shelf::find($validated['shelf_id']);
            if ($shelf && $shelf->deposit_id != $validated['deposit_id']) {
                return response()->json([
                    'message' => 'The shelf does not belong to the selected deposit.'
                ], 422);
            }
        }

        $product = Product::create($validated);
        $product->load(['deposit', 'shelf', 'supplier']);

        ActivityLogService::logCreated($product, $validated);

        return response()->json($product, 201);
    }

    public function show(Product $product)
    {
        $product->load(['deposit', 'shelf', 'supplier']);
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
            'deposit_id' => 'nullable|exists:deposits,id',
            'shelf_id' => 'nullable|exists:shelves,id',
        ]);

        if (isset($validated['shelf_id']) && isset($validated['deposit_id'])) {
            $shelf = \App\Models\Shelf::find($validated['shelf_id']);
            if ($shelf && $shelf->deposit_id != $validated['deposit_id']) {
                return response()->json([
                    'message' => 'The shelf does not belong to the selected deposit.'
                ], 422);
            }
        }

        if (isset($validated['deposit_id']) && !isset($validated['shelf_id']) && $product->shelf_id) {
            $shelf = \App\Models\Shelf::find($product->shelf_id);
            if ($shelf && $shelf->deposit_id != $validated['deposit_id']) {
                $validated['shelf_id'] = null;
            }
        }

        $oldValues = $product->only(array_keys($validated));
        $product->update($validated);
        $product->load(['deposit', 'shelf', 'supplier']);
        $newValues = $product->only(array_keys($validated));

        ActivityLogService::logUpdated($product, $oldValues, $newValues);

        return response()->json($product);
    }

    public function destroy(Product $product)
    {
        ActivityLogService::logDeleted($product);
        $product->delete();

        return response()->json(['message' => 'Product deleted successfully']);
    }
}

