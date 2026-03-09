<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Inventory;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

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
            'inventories' => 'nullable|array',
            'inventories.*.deposit_id' => 'required_with:inventories|nullable|exists:deposits,id',
            'inventories.*.shelf_id' => 'nullable|exists:shelves,id',
            'inventories.*.quantity' => 'required_with:inventories|integer|min:0',
            'inventories.*.reorder_level' => 'nullable|integer|min:0',
            'quantity' => 'nullable|integer|min:0',
            'deposit_id' => 'nullable|exists:deposits,id',
            'shelf_id' => 'nullable|exists:shelves,id',
            'reorder_level' => 'nullable|integer|min:0',
        ]);

        $inventoriesInput = $request->input('inventories');
        if (empty($inventoriesInput) && isset($validated['quantity']) && $validated['quantity'] > 0) {
            $inventoriesInput = [[
                'deposit_id' => $validated['deposit_id'] ?? null,
                'shelf_id' => $validated['shelf_id'] ?? null,
                'quantity' => $validated['quantity'],
                'reorder_level' => $validated['reorder_level'] ?? 0,
            ]];
        }

        if (!empty($inventoriesInput) && empty($inventoriesInput[0]['deposit_id'])) {
            return response()->json([
                'message' => 'Deposit is required for each inventory location.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            $productData = array_diff_key($validated, array_flip([
                'quantity', 'deposit_id', 'shelf_id', 'reorder_level', 'inventories', 'inventories.*'
            ]));
            $productData = array_filter($productData, fn($key) => !str_starts_with((string)$key, 'inventories'), ARRAY_FILTER_USE_KEY);
            $productData = collect($validated)->only(['name', 'sku', 'description', 'price', 'supplier_id'])->all();

            $product = Product::create($productData);

            if (!empty($inventoriesInput)) {
                foreach ($inventoriesInput as $inv) {
                    $depositId = $inv['deposit_id'] ?? null;
                    $shelfId = $inv['shelf_id'] ?? null;
                    if ($shelfId && $depositId) {
                        $shelf = \App\Models\Shelf::find($shelfId);
                        if ($shelf && $shelf->deposit_id != $depositId) {
                            DB::rollBack();
                            return response()->json([
                                'message' => 'The shelf does not belong to the selected deposit.',
                            ], 422);
                        }
                    }
                    $inventory = Inventory::create([
                        'product_id' => $product->id,
                        'quantity' => (int) ($inv['quantity'] ?? 0),
                        'deposit_id' => $depositId,
                        'shelf_id' => $shelfId,
                        'reorder_level' => (int) ($inv['reorder_level'] ?? 0),
                    ]);
                    ActivityLogService::logCreated($inventory, $inv);
                }
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
            'inventories' => 'nullable|array',
            'inventories.*.id' => 'nullable|integer|exists:inventories,id',
            'inventories.*.deposit_id' => 'required_with:inventories|nullable|exists:deposits,id',
            'inventories.*.shelf_id' => 'nullable|exists:shelves,id',
            'inventories.*.quantity' => 'required_with:inventories|integer|min:0',
            'inventories.*.reorder_level' => 'nullable|integer|min:0',
            'images' => 'nullable|array',
            'images.*.url' => 'nullable|string',
            'images.*.display_type' => 'nullable|integer|in:0,1',
        ]);

        $productOnly = collect($validated)->only(['name', 'sku', 'description', 'price', 'supplier_id'])->all();
        if (!empty($productOnly)) {
            $oldValues = $product->only(array_keys($productOnly));
            $product->update($productOnly);
            $newValues = $product->only(array_keys($productOnly));
            ActivityLogService::logUpdated($product, $oldValues, $newValues);
        }

        if (array_key_exists('inventories', $validated)) {
            $inventoriesInput = $validated['inventories'] ?? [];
            $updatedIds = [];

            foreach ($inventoriesInput as $inv) {
                $depositId = $inv['deposit_id'] ?? null;
                $shelfId = $inv['shelf_id'] ?? null;
                if ($shelfId && $depositId) {
                    $shelf = \App\Models\Shelf::find($shelfId);
                    if ($shelf && $shelf->deposit_id != $depositId) {
                        return response()->json([
                            'message' => 'The shelf does not belong to the selected deposit.',
                        ], 422);
                    }
                }

                if (!empty($inv['id'])) {
                    $inventory = Inventory::where('product_id', $product->id)->find($inv['id']);
                    if ($inventory) {
                        $oldValues = $inventory->only(['quantity', 'deposit_id', 'shelf_id', 'reorder_level']);
                        $inventory->update([
                            'quantity' => (int) ($inv['quantity'] ?? 0),
                            'deposit_id' => $depositId,
                            'shelf_id' => $shelfId,
                            'reorder_level' => (int) ($inv['reorder_level'] ?? 0),
                        ]);
                        $newValues = $inventory->only(['quantity', 'deposit_id', 'shelf_id', 'reorder_level']);
                        ActivityLogService::logUpdated($inventory, $oldValues, $newValues);
                        $updatedIds[] = $inventory->id;
                    }
                } else {
                    $inventory = Inventory::create([
                        'product_id' => $product->id,
                        'quantity' => (int) ($inv['quantity'] ?? 0),
                        'deposit_id' => $depositId,
                        'shelf_id' => $shelfId,
                        'reorder_level' => (int) ($inv['reorder_level'] ?? 0),
                    ]);
                    ActivityLogService::logCreated($inventory, $inv);
                    $updatedIds[] = $inventory->id;
                }
            }

            Inventory::where('product_id', $product->id)
                ->whereNotIn('id', $updatedIds)
                ->get()
                ->each(function ($existing) {
                    ActivityLogService::logDeleted($existing);
                    $existing->delete();
                });
        }

        if (array_key_exists('images', $validated)) {
            $product->images = $validated['images'] ?? [];
            $product->save();
        }

        $product->load(['supplier', 'inventories.deposit', 'inventories.shelf']);
        return response()->json($product);
    }

    public function uploadImage(Request $request, Product $product)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'display_type' => 'nullable|integer|in:0,1',
        ]);

        $file = $request->file('image');
        $dir = 'products/' . $product->id;
        $path = $file->store($dir, 'public');

        $displayType = (int) ($request->input('display_type', 0));
        $current = $product->getRawOriginal('images');
        $images = is_string($current) ? json_decode($current, true) : [];
        if (!is_array($images)) {
            $images = [];
        }
        if ($displayType === 1) {
            $images = array_map(fn ($img) => array_merge($img, ['display_type' => 0]), $images);
        }
        $images[] = ['url' => $path, 'display_type' => $displayType];
        $product->setRawAttributes(array_merge($product->getAttributes(), ['images' => json_encode($images)]));
        $product->save();

        $product->load(['supplier', 'inventories.deposit', 'inventories.shelf']);
        $product->refresh();
        $fullUrl = asset('storage/' . $path);
        return response()->json([
            'url' => $fullUrl,
            'path' => $path,
            'display_type' => $displayType,
            'product' => $product,
        ], 201);
    }

    public function deleteImage(Request $request, Product $product)
    {
        $urlToRemove = $request->input('url') ?? $request->query('url');
        if (empty($urlToRemove)) {
            return response()->json(['message' => 'URL is required.'], 422);
        }
        $prefix = asset('storage/');
        $pathToRemove = $urlToRemove;
        if (str_starts_with($urlToRemove, $prefix)) {
            $pathToRemove = str_replace([$prefix, '\\'], ['', '/'], $urlToRemove);
        }
        $current = $product->getRawOriginal('images');
        $images = is_string($current) ? json_decode($current, true) : [];
        if (!is_array($images)) {
            $images = [];
        }
        $before = count($images);
        $images = array_values(array_filter($images, function ($img) use ($pathToRemove, $urlToRemove) {
            $u = $img['url'] ?? '';
            return $u !== $pathToRemove && $u !== $urlToRemove;
        }));
        if (count($images) === $before) {
            return response()->json(['message' => 'Image not found.'], 404);
        }
        if (Storage::disk('public')->exists($pathToRemove)) {
            Storage::disk('public')->delete($pathToRemove);
        }
        $product->setRawAttributes(array_merge($product->getAttributes(), ['images' => json_encode($images)]));
        $product->save();
        $product->load(['supplier', 'inventories.deposit', 'inventories.shelf']);
        $product->refresh();
        return response()->json(['message' => 'Image deleted.', 'product' => $product]);
    }

    public function destroy(Product $product)
    {
        foreach ($product->inventories as $inventory) {
            ActivityLogService::logDeleted($inventory);
            $inventory->delete();
        }

        ActivityLogService::logDeleted($product);
        $product->delete();

        return response()->json(['message' => 'Product deleted successfully']);
    }
}