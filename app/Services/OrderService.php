<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Inventory;
use Illuminate\Support\Facades\DB;

class OrderService
{
    public function createOrder(array $data): Order
    {
        return DB::transaction(function () use ($data) {
            $order = Order::create([
                'supplier_id' => $data['supplier_id'],
                'order_number' => $data['order_number'] ?? $this->generateOrderNumber(),
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
            ]);

            $totalAmount = 0;

            foreach ($data['items'] as $item) {
                $orderItem = OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                ]);

                $totalAmount += $orderItem->total;
            }

            $order->update(['total_amount' => $totalAmount]);

            return $order->fresh();
        });
    }

    public function fulfillOrder(Order $order): Order
    {
        return DB::transaction(function () use ($order) {
            foreach ($order->items as $item) {
                $inventory = Inventory::where('product_id', $item->product_id)->first();

                if ($inventory) {
                    $inventory->quantity += $item->quantity;
                    $inventory->save();
                } else {
                    Inventory::create([
                        'product_id' => $item->product_id,
                        'quantity' => $item->quantity,
                    ]);
                }
            }

            $order->update(['status' => 'completed']);

            return $order->fresh();
        });
    }

    protected function generateOrderNumber(): string
    {
        return 'ORD-' . date('Ymd') . '-' . str_pad(Order::count() + 1, 4, '0', STR_PAD_LEFT);
    }
}

