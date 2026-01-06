<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'sku',
        'description',
        'price',
        'supplier_id',
        'deposit_id',
        'shelf_id',
    ];

    protected $casts = [
        'price' => 'decimal:2',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function inventories(): HasMany
    {
        return $this->hasMany(Inventory::class);
    }

    public function deposit(): BelongsTo
    {
        return $this->belongsTo(Deposit::class);
    }

    public function shelf(): BelongsTo
    {
        return $this->belongsTo(Shelf::class);
    }

    public function shelves(): BelongsToMany
    {
        return $this->belongsToMany(Shelf::class, 'product_shelf')
            ->withPivot('quantity')
            ->withTimestamps();
    }

    public function getTotalInventoryQuantityAttribute(): int
    {
        return $this->inventories()->sum('quantity');
    }

    public function getTotalShelfQuantityAttribute(): int
    {
        return $this->shelves()->sum('product_shelf.quantity');
    }
}

