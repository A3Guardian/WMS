<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Inventory;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class OrderService
{
    public function __construct(
        protected InventoryService $inventoryService,
    ) {
    }

    public function createOrder(array $data): Order
    {
        return DB::transaction(function () use ($data) {
            $order = Order::create([
                'customer_id' => $data['customer_id'] ?? null,
                'order_number' => $data['order_number'] ?? $this->generateOrderNumber(),
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
                'tax_rate' => $data['tax_rate'] ?? null,
                'shipping_amount' => $data['shipping_amount'] ?? null,
            ]);

            $subtotal = 0;

            foreach ($data['items'] as $item) {
                $price = $this->resolveItemPrice($item);

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'price' => $price,
                ]);

                $subtotal += (float) $item['quantity'] * $price;
            }

            $order->update([
                'total_amount' => $this->calculateTotalAmount(
                    $subtotal,
                    $data['tax_rate'] ?? $order->tax_rate,
                    $data['shipping_amount'] ?? $order->shipping_amount,
                ),
            ]);

            return $order->fresh(['items.product']);
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
                    $price = $this->resolveItemPrice($item);

                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $item['product_id'],
                        'quantity' => $item['quantity'],
                        'price' => $price,
                    ]);
                    $subtotal += (float) $item['quantity'] * $price;
                }
                $taxRate = array_key_exists('tax_rate', $data) ? $data['tax_rate'] : $order->tax_rate;
                $shipping = isset($data['shipping_amount']) ? (float) $data['shipping_amount'] : (float) ($order->shipping_amount ?? 0);
                $order->update([
                    'total_amount' => $this->calculateTotalAmount($subtotal, $taxRate, $shipping),
                ]);
            } elseif (array_key_exists('tax_rate', $data) || array_key_exists('shipping_amount', $data)) {
                $subtotal = (float) $order->items()->with('product')->get()->sum(
                    fn (OrderItem $item) => (float) $item->quantity * $item->effective_price
                );
                $taxRate = isset($data['tax_rate']) ? (float) $data['tax_rate'] : (float) ($order->tax_rate ?? 0);
                $shipping = array_key_exists('shipping_amount', $data) ? (float) $data['shipping_amount'] : (float) ($order->shipping_amount ?? 0);
                $order->update([
                    'total_amount' => $this->calculateTotalAmount($subtotal, $taxRate, $shipping),
                ]);
            }

            return $order->fresh(['items.product']);
        });
    }

    public function normalizeStoredPrices(Order $order): Order
    {
        return DB::transaction(function () use ($order) {
            $order->load('items.product');
            $dirty = false;

            foreach ($order->items as $item) {
                if ((float) $item->price > 0) {
                    continue;
                }

                $resolved = $this->resolveItemPrice([
                    'product_id' => $item->product_id,
                    'price' => $item->price,
                ]);

                if ($resolved <= 0) {
                    continue;
                }

                $item->update(['price' => $resolved]);
                $dirty = true;
            }

            if (! $dirty) {
                return $order->fresh(['items.product']);
            }

            $order->refresh()->load('items.product');
            $subtotal = $order->items->sum(
                fn (OrderItem $item) => (float) $item->quantity * (float) $item->price
            );

            $order->update([
                'total_amount' => $this->calculateTotalAmount(
                    $subtotal,
                    $order->tax_rate,
                    $order->shipping_amount,
                ),
            ]);

            return $order->fresh(['items.product']);
        });
    }

    public function fulfillOrder(Order $order): Order
    {
        return DB::transaction(function () use ($order) {
            $order->load('items.product');

            foreach ($order->items as $item) {
                $remaining = (int) $item->quantity;
                $inventories = Inventory::where('product_id', $item->product_id)
                    ->orderBy('id')
                    ->get();

                $available = $inventories->sum('quantity');
                if ($available < $remaining) {
                    $productLabel = $item->product?->name ?? "produs #{$item->product_id}";
                    throw new \InvalidArgumentException(
                        "Stoc insuficient pentru {$productLabel}. Disponibil: {$available}, necesar: {$remaining}."
                    );
                }

                foreach ($inventories as $inventory) {
                    if ($remaining <= 0) {
                        break;
                    }

                    $deduct = min($inventory->quantity, $remaining);
                    if ($deduct <= 0) {
                        continue;
                    }

                    $productLabel = $item->product?->name ?? "produs #{$item->product_id}";
                    $reason = sprintf(
                        'Comandă finalizată %s — %s (−%d)',
                        $order->order_number,
                        $productLabel,
                        $deduct
                    );

                    $this->inventoryService->adjustStock($inventory, -$deduct, $reason);
                    $remaining -= $deduct;
                }
            }

            return $order->fresh();
        });
    }

    protected function generateOrderNumber(): string
    {
        return 'ORD-' . date('Ymd') . '-' . str_pad(Order::count() + 1, 4, '0', STR_PAD_LEFT);
    }

    protected function calculateTotalAmount(float $subtotal, mixed $taxRate, mixed $shippingAmount): float
    {
        $tax = (float) $taxRate;
        $taxAmount = $tax > 0 ? $subtotal * $tax / 100 : 0;
        $shipping = (float) ($shippingAmount ?? 0);

        return round($subtotal + $taxAmount + $shipping, 2);
    }

    protected function resolveItemPrice(array $item): float
    {
        $price = isset($item['price']) ? (float) $item['price'] : 0;

        if ($price > 0) {
            return round($price, 2);
        }

        $product = Product::find($item['product_id']);

        return $product ? round((float) $product->price, 2) : 0;
    }
}

