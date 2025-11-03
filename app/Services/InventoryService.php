<?php

namespace App\Services;

use App\Models\Inventory;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    public function adjustStock(Inventory $inventory, int $quantity, ?string $reason = null): Inventory
    {
        DB::transaction(function () use ($inventory, $quantity, $reason) {
            $oldQuantity = $inventory->quantity;
            $newQuantity = max(0, $oldQuantity + $quantity);

            $inventory->update([
                'quantity' => $newQuantity,
            ]);

        });

        return $inventory->fresh();
    }

    public function checkLowStock(): array
    {
        return Inventory::whereColumn('quantity', '<=', 'reorder_level')
            ->with('product')
            ->get()
            ->toArray();
    }
}

