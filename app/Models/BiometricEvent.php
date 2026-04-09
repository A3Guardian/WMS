<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BiometricEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'biometric_device_id',
        'user_id',
        'deposit_id',
        'event_type',
        'fingerprint_uid',
        'fingerprint_image_path',
        'access_granted',
        'match_score',
        'payload',
        'occurred_at',
    ];

    protected $casts = [
        'access_granted' => 'boolean',
        'payload' => 'array',
        'occurred_at' => 'datetime',
    ];

    public function device(): BelongsTo
    {
        return $this->belongsTo(BiometricDevice::class, 'biometric_device_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function deposit(): BelongsTo
    {
        return $this->belongsTo(Deposit::class);
    }
}
