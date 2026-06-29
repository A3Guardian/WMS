<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'customer_id',
        'assigned_to',
        'order_number',
        'status',
        'notes',
        'total_amount',
        'tax_rate',
        'shipping_amount',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'shipping_amount' => 'decimal:2',
    ];

    protected $appends = [
        'barcode_svg',
        'subtotal',
        'computed_total',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'assigned_to');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(OrderDocument::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function getBarcodeSvgAttribute(): ?string
    {
        if (empty($this->order_number)) {
            return null;
        }

        try {
            return \app('DNS1D')->getBarcodeSVG((string) $this->order_number, 'C128', 2, 60, 'black', true);
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function getSubtotalAttribute(): float
    {
        if ($this->relationLoaded('items')) {
            return round((float) $this->items->sum(
                fn (OrderItem $item) => (float) $item->quantity * $item->effective_price
            ), 2);
        }

        return round((float) $this->items()->join('products', 'products.id', '=', 'order_items.product_id')
            ->sum(DB::raw('order_items.quantity * CASE WHEN order_items.price > 0 THEN order_items.price ELSE products.price END')), 2);
    }

    public function getComputedTotalAttribute(): float
    {
        $subtotal = $this->subtotal;
        $taxRate = (float) ($this->tax_rate ?? 0);
        $taxAmount = $taxRate > 0 ? $subtotal * $taxRate / 100 : 0;
        $shipping = (float) ($this->shipping_amount ?? 0);

        return round($subtotal + $taxAmount + $shipping, 2);
    }
}

