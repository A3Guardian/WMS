<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_id');
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    public static function set(string $key, ?string $value, ?int $userId = null): self
    {
        $setting = static::firstOrNew(['key' => $key]);
        $setting->value = $value;
        if ($userId) {
            $setting->updated_by_id = $userId;
            if (!$setting->exists) {
                $setting->created_by_id = $userId;
            }
        }
        $setting->save();
        return $setting;
    }
}
