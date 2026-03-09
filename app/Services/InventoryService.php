<?php

namespace App\Services;

use App\Models\Inventory;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    public function adjustStock(Inventory $inventory, int $quantity, ?string $reason = null): Inventory
    {
        $oldQuantity = $inventory->quantity;

        DB::transaction(function () use ($inventory, $quantity) {
            $newQuantity = max(0, $inventory->quantity + $quantity);
            $inventory->update(['quantity' => $newQuantity]);
        });

        $inventory->refresh();

        ActivityLogService::log('adjusted', $inventory, [
            'quantity' => ['old' => $oldQuantity, 'new' => $inventory->quantity],
        ], $reason ? "Stock adjustment: {$reason}" : 'Stock adjustment');

        return $inventory;
    }

    public function checkLowStock(): array
    {
        return Inventory::whereColumn('quantity', '<=', 'reorder_level')
            ->with('product')
            ->get()
            ->toArray();
    }
}

