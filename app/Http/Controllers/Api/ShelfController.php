<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shelf;
use App\Models\Deposit;
use App\Models\Product;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShelfController extends Controller
{
    public function index(Request $request, $depositId)
    {
        $deposit = Deposit::findOrFail($depositId);
        $shelves = $deposit->shelves()->orderBy('created_at', 'asc')->get();
        
        return response()->json($shelves);
    }

    public function store(Request $request, $depositId)
    {
        $deposit = Deposit::findOrFail($depositId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:255',
            'x_position' => 'required|numeric|min:0',
            'y_position' => 'required|numeric|min:0',
            'width' => 'required|numeric|min:0',
            'height' => 'required|numeric|min:0',
            'depth' => 'nullable|numeric|min:0',
            'capacity' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        if ($validated['x_position'] + $validated['width'] > $deposit->width) {
            return response()->json([
                'message' => 'Shelf width exceeds deposit width at this position'
            ], 422);
        }

        if ($validated['y_position'] + $validated['height'] > $deposit->height) {
            return response()->json([
                'message' => 'Shelf height exceeds deposit height at this position'
            ], 422);
        }

        if (!isset($validated['capacity']) && isset($validated['width']) && isset($validated['height']) && isset($validated['depth'])) {
            $validated['capacity'] = $validated['width'] * $validated['height'] * $validated['depth'];
        }

        $validated['deposit_id'] = $depositId;
        $shelf = Shelf::create($validated);

        ActivityLogService::logCreated($shelf, $validated);

        return response()->json($shelf, 201);
    }

    public function show($depositId, $shelfId)
    {
        $shelf = Shelf::where('deposit_id', $depositId)->findOrFail($shelfId);
        return response()->json($shelf);
    }

    public function update(Request $request, $depositId, $shelfId)
    {
        $deposit = Deposit::findOrFail($depositId);
        $shelf = Shelf::where('deposit_id', $depositId)->findOrFail($shelfId);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'nullable|string|max:255',
            'x_position' => 'sometimes|numeric|min:0',
            'y_position' => 'sometimes|numeric|min:0',
            'width' => 'sometimes|numeric|min:0',
            'height' => 'sometimes|numeric|min:0',
            'depth' => 'nullable|numeric|min:0',
            'capacity' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $xPos = $validated['x_position'] ?? $shelf->x_position;
        $yPos = $validated['y_position'] ?? $shelf->y_position;
        $width = $validated['width'] ?? $shelf->width;
        $height = $validated['height'] ?? $shelf->height;

        if ($xPos + $width > $deposit->width) {
            return response()->json([
                'message' => 'Shelf width exceeds deposit width at this position'
            ], 422);
        }

        if ($yPos + $height > $deposit->height) {
            return response()->json([
                'message' => 'Shelf height exceeds deposit height at this position'
            ], 422);
        }

        if (isset($validated['width']) || isset($validated['height']) || isset($validated['depth'])) {
            $width = $validated['width'] ?? $shelf->width;
            $height = $validated['height'] ?? $shelf->height;
            $depth = $validated['depth'] ?? $shelf->depth;
            if ($width && $height && $depth) {
                $validated['capacity'] = $width * $height * $depth;
            }
        }

        $oldValues = $shelf->only(array_keys($validated));
        $shelf->update($validated);
        $newValues = $shelf->only(array_keys($validated));

        ActivityLogService::logUpdated($shelf, $oldValues, $newValues);

        return response()->json($shelf);
    }

    public function destroy($depositId, $shelfId)
    {
        $shelf = Shelf::where('deposit_id', $depositId)->findOrFail($shelfId);
        
        ActivityLogService::logDeleted($shelf);
        $shelf->delete();

        return response()->json(['message' => 'Shelf deleted successfully']);
    }

    public function assignProduct(Request $request, $depositId, $shelfId)
    {
        $shelf = Shelf::where('deposit_id', $depositId)->findOrFail($shelfId);
        
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        
        $totalInventory = $product->inventories()->sum('quantity');
        
        $currentShelfQuantity = DB::table('product_shelf')
            ->where('product_id', $product->id)
            ->where('shelf_id', '!=', $shelfId)
            ->sum('quantity');
        
        $requestedQuantity = $validated['quantity'];
        $availableQuantity = $totalInventory - $currentShelfQuantity;
        
        $existingQuantity = DB::table('product_shelf')
            ->where('product_id', $product->id)
            ->where('shelf_id', $shelfId)
            ->value('quantity') ?? 0;
        
        $availableQuantity += $existingQuantity;
        
        if ($requestedQuantity > $availableQuantity) {
            return response()->json([
                'message' => "Insufficient inventory. Available: {$availableQuantity}, Requested: {$requestedQuantity}"
            ], 422);
        }

        $shelf->products()->syncWithoutDetaching([
            $product->id => ['quantity' => $requestedQuantity]
        ]);

        if (!$product->shelf_id) {
            $product->update([
                'deposit_id' => $depositId,
                'shelf_id' => $shelfId,
            ]);
        }

        $shelf->load('products');
        
        return response()->json([
            'message' => 'Product assigned successfully',
            'shelf' => $shelf,
        ]);
    }

    public function updateProductQuantity(Request $request, $depositId, $shelfId, $productId)
    {
        $shelf = Shelf::where('deposit_id', $depositId)->findOrFail($shelfId);
        $product = Product::findOrFail($productId);
        
        $validated = $request->validate([
            'quantity' => 'required|integer|min:0',
        ]);

        if ($validated['quantity'] == 0) {
            $shelf->products()->detach($productId);
            if ($product->shelf_id == $shelfId) {
                $product->update(['shelf_id' => null]);
            }
            return response()->json(['message' => 'Product removed from shelf']);
        }

        $totalInventory = $product->inventories()->sum('quantity');
        
        $currentShelfQuantity = DB::table('product_shelf')
            ->where('product_id', $product->id)
            ->where('shelf_id', '!=', $shelfId)
            ->sum('quantity');
        
        $requestedQuantity = $validated['quantity'];
        $availableQuantity = $totalInventory - $currentShelfQuantity;
        
        if ($requestedQuantity > $availableQuantity) {
            return response()->json([
                'message' => "Insufficient inventory. Available: {$availableQuantity}, Requested: {$requestedQuantity}"
            ], 422);
        }

        $shelf->products()->syncWithoutDetaching([
            $productId => ['quantity' => $requestedQuantity]
        ]);

        if ($product->shelf_id != $shelfId || $product->deposit_id != $depositId) {
            $product->update([
                'deposit_id' => $depositId,
                'shelf_id' => $shelfId,
            ]);
        }

        $shelf->load('products');
        
        return response()->json([
            'message' => 'Product quantity updated successfully',
            'shelf' => $shelf,
        ]);
    }

    public function removeProduct($depositId, $shelfId, $productId)
    {
        $shelf = Shelf::where('deposit_id', $depositId)->findOrFail($shelfId);
        $product = Product::findOrFail($productId);
        
        $shelf->products()->detach($productId);
        
        return response()->json(['message' => 'Product removed from shelf']);
    }

    public function getProducts($depositId, $shelfId)
    {
        $shelf = Shelf::where('deposit_id', $depositId)->findOrFail($shelfId);
        
        $pivotProducts = $shelf->products()
            ->with(['supplier', 'inventories'])
            ->get();
        
        $oldProducts = Product::where('shelf_id', $shelfId)
            ->where('deposit_id', $depositId)
            ->with(['supplier', 'inventories'])
            ->get();
        
        $productIds = $pivotProducts->pluck('id')->toArray();
        $oldProducts = $oldProducts->reject(function($product) use ($productIds) {
            return in_array($product->id, $productIds);
        });
        
        $allProducts = $pivotProducts->concat($oldProducts);
        
        $products = $allProducts->map(function($product) use ($shelfId) {
            $pivotQuantity = 0;
            if ($product->pivot && isset($product->pivot->quantity)) {
                $pivotQuantity = $product->pivot->quantity;
            } else {
                $pivotRecord = DB::table('product_shelf')
                    ->where('product_id', $product->id)
                    ->where('shelf_id', $shelfId)
                    ->first();
                if ($pivotRecord) {
                    $pivotQuantity = $pivotRecord->quantity;
                }
            }
            
            $totalInventory = $product->inventories->sum('quantity');
            
            $totalOnShelves = DB::table('product_shelf')
                ->where('product_id', $product->id)
                ->sum('quantity');
            
            $available = $totalInventory - $totalOnShelves + $pivotQuantity;
            
            return [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'quantity_on_shelf' => $pivotQuantity,
                'total_inventory' => $totalInventory,
                'available' => max(0, $available), // Ensure non-negative
                'supplier' => $product->supplier,
            ];
        });
        
        return response()->json($products);
    }
}

