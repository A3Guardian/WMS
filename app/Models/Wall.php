<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Wall extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'deposit_id',
        'name',
        'x_start',
        'y_start',
        'x_end',
        'y_end',
        'thickness',
        'description',
    ];

    protected $casts = [
        'x_start' => 'decimal:2',
        'y_start' => 'decimal:2',
        'x_end' => 'decimal:2',
        'y_end' => 'decimal:2',
        'thickness' => 'decimal:2',
    ];

    public function deposit(): BelongsTo
    {
        return $this->belongsTo(Deposit::class);
    }

    public function getLengthAttribute(): float
    {
        $dx = $this->x_end - $this->x_start;
        $dy = $this->y_end - $this->y_start;
        return sqrt($dx * $dx + $dy * $dy);
    }

    public function isHorizontal(): bool
    {
        return abs($this->y_end - $this->y_start) < 0.01;
    }

    public function isVertical(): bool
    {
        return abs($this->x_end - $this->x_start) < 0.01;
    }
}

