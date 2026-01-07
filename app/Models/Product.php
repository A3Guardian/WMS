<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
    ];

    protected $casts = [
        'price' => 'decimal:2',
    ];

    protected $appends = [
        'total_inventory_quantity',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function inventories(): HasMany
    {
        return $this->hasMany(Inventory::class);
    }

    public function getTotalInventoryQuantityAttribute(): int
    {
        if ($this->relationLoaded('inventories')) {
            return $this->inventories->sum('quantity');
        }
        
        return $this->inventories()->sum('quantity');
    }
}

