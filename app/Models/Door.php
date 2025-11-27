<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Door extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'deposit_id',
        'wall_id',
        'name',
        'x_position',
        'y_position',
        'width',
        'orientation',
        'description',
    ];

    protected $casts = [
        'x_position' => 'decimal:2',
        'y_position' => 'decimal:2',
        'width' => 'decimal:2',
    ];

    public function deposit(): BelongsTo
    {
        return $this->belongsTo(Deposit::class);
    }

    public function wall(): BelongsTo
    {
        return $this->belongsTo(Wall::class);
    }
}

