<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Deposit extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'location',
        'width',
        'height',
        'depth',
        'capacity',
        'status',
        'description',
        'notes',
    ];

    protected $casts = [
        'width' => 'decimal:2',
        'height' => 'decimal:2',
        'depth' => 'decimal:2',
        'capacity' => 'decimal:2',
    ];

    public function shelves(): HasMany
    {
        return $this->hasMany(Shelf::class);
    }
    
    public function inventories(): HasMany
{
    return $this->hasMany(Inventory::class);
}

    public function walls(): HasMany
    {
        return $this->hasMany(Wall::class);
    }

    public function doors(): HasMany
    {
        return $this->hasMany(Door::class);
    }

    public function usersWithAccess(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'deposit_user_accesses')
            ->withTimestamps();
    }
}

