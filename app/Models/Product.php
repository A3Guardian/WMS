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
        'images',
    ];

    protected $casts = [
        'price' => 'decimal:2',
    ];

    protected $appends = [
        'total_inventory_quantity',
    ];

    public function getImagesAttribute($value): array
    {
        $decoded = is_string($value) ? json_decode($value, true) : $value;
        $arr = is_array($decoded) ? $decoded : [];
        return array_map(function ($img) {
            $path = $img['url'] ?? '';
            $url = $path && !str_starts_with($path, 'http') ? asset('storage/' . ltrim($path, '/')) : $path;
            return ['url' => $url, 'display_type' => (int) ($img['display_type'] ?? 0)];
        }, $arr);
    }

    public function setImagesAttribute($value): void
    {
        $arr = is_array($value) ? $value : (is_string($value) ? json_decode($value, true) : []);
        $normalized = array_map(function ($img) {
            $url = $img['url'] ?? '';
            $prefix = asset('storage/');
            if ($url && str_starts_with($url, $prefix)) {
                $url = str_replace([$prefix, '\\'], ['', '/'], $url);
            }
            return ['url' => $url, 'display_type' => (int) ($img['display_type'] ?? 0)];
        }, is_array($arr) ? $arr : []);
        $this->attributes['images'] = json_encode($normalized);
    }

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

