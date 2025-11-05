<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActivityLogService
{
    public static function log(string $action, Model $model, ?array $changes = null, ?string $description = null): ActivityLog
    {
        $user = Auth::user();
        $request = request();

        $activity = ActivityLog::create([
            'user_id' => $user?->id,
            'action' => $action,
            'model_type' => get_class($model),
            'model_id' => $model->id,
            'description' => $description ?? self::generateDescription($action, $model),
            'changes' => $changes,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);

        return $activity;
    }

    protected static function generateDescription(string $action, Model $model): string
    {
        $modelName = class_basename($model);
        
        return match($action) {
            'created' => "Created {$modelName} #{$model->id}",
            'updated' => "Updated {$modelName} #{$model->id}",
            'deleted' => "Deleted {$modelName} #{$model->id}",
            'restored' => "Restored {$modelName} #{$model->id}",
            'force_deleted' => "Permanently deleted {$modelName} #{$model->id}",
            default => "{$action} {$modelName} #{$model->id}",
        };
    }

    public static function logCreated(Model $model, ?array $changes = null): ActivityLog
    {
        return self::log('created', $model, $changes);
    }

    public static function logUpdated(Model $model, array $oldValues, array $newValues): ActivityLog
    {
        $changes = [];
        foreach ($newValues as $key => $value) {
            if (isset($oldValues[$key]) && $oldValues[$key] != $value) {
                $changes[$key] = [
                    'old' => $oldValues[$key],
                    'new' => $value,
                ];
            } elseif (!isset($oldValues[$key])) {
                $changes[$key] = [
                    'old' => null,
                    'new' => $value,
                ];
            }
        }

        return self::log('updated', $model, $changes);
    }

    public static function logDeleted(Model $model): ActivityLog
    {
        return self::log('deleted', $model);
    }

    public static function logRestored(Model $model): ActivityLog
    {
        return self::log('restored', $model);
    }

    public static function logForceDeleted(Model $model): ActivityLog
    {
        return self::log('force_deleted', $model);
    }
}

