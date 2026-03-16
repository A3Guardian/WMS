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
                'customer_id' => $data['customer_id'] ?? null,
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

    public function updateOrder(Order $order, array $data): Order
    {
        return DB::transaction(function () use ($order, $data) {
            $order->update([
                'customer_id' => $data['customer_id'] ?? $order->customer_id,
                'status' => $data['status'] ?? $order->status,
                'notes' => array_key_exists('notes', $data) ? $data['notes'] : $order->notes,
                'tax_rate' => array_key_exists('tax_rate', $data) ? $data['tax_rate'] : $order->tax_rate,
                'shipping_amount' => array_key_exists('shipping_amount', $data) ? $data['shipping_amount'] : $order->shipping_amount,
            ]);

            if (isset($data['items']) && is_array($data['items'])) {
                $order->items()->delete();
                $subtotal = 0;
                foreach ($data['items'] as $item) {
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $item['product_id'],
                        'quantity' => $item['quantity'],
                        'price' => $item['price'],
                    ]);
                    $subtotal += (float) $item['quantity'] * (float) $item['price'];
                }
                $taxRate = array_key_exists('tax_rate', $data) ? $data['tax_rate'] : $order->tax_rate;
                $taxAmount = $taxRate ? $subtotal * (float) $taxRate / 100 : 0;
                $shipping = isset($data['shipping_amount']) ? (float) $data['shipping_amount'] : (float) ($order->shipping_amount ?? 0);
                $order->update(['total_amount' => $subtotal + $taxAmount + $shipping]);
            } elseif (array_key_exists('tax_rate', $data) || array_key_exists('shipping_amount', $data)) {
                $subtotal = $order->items->sum(fn ($item) => $item->quantity * $item->price);
                $taxRate = isset($data['tax_rate']) ? (float) $data['tax_rate'] : (float) ($order->tax_rate ?? 0);
                $taxAmount = $subtotal * $taxRate / 100;
                $shipping = array_key_exists('shipping_amount', $data) ? (float) $data['shipping_amount'] : (float) ($order->shipping_amount ?? 0);
                $order->update(['total_amount' => $subtotal + $taxAmount + $shipping]);
            }

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

