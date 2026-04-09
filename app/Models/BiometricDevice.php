<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BiometricDevice extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'purpose',
        'service_url',
        'deposit_id',
        'api_key',
        'is_active',
        'last_seen_at',
        'meta',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_seen_at' => 'datetime',
        'meta' => 'array',
    ];

    public function deposit(): BelongsTo
    {
        return $this->belongsTo(Deposit::class);
    }

    public function templates(): HasMany
    {
        return $this->hasMany(BiometricTemplate::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(BiometricEvent::class);
    }
}
