<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Wall;
use App\Models\Deposit;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;

class WallController extends Controller
{
    public function index(Request $request, $depositId)
    {
        $deposit = Deposit::findOrFail($depositId);
        $walls = $deposit->walls()->orderBy('created_at', 'asc')->get();
        
        return response()->json($walls);
    }

    public function store(Request $request, $depositId)
    {
        $deposit = Deposit::findOrFail($depositId);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'x_start' => 'required|numeric|min:0',
            'y_start' => 'required|numeric|min:0',
            'x_end' => 'required|numeric|min:0',
            'y_end' => 'required|numeric|min:0',
            'thickness' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $maxX = max($validated['x_start'], $validated['x_end']);
        $maxY = max($validated['y_start'], $validated['y_end']);
        
        if ($maxX > $deposit->width) {
            return response()->json([
                'message' => 'Wall extends beyond deposit width'
            ], 422);
        }

        if ($maxY > $deposit->height) {
            return response()->json([
                'message' => 'Wall extends beyond deposit height'
            ], 422);
        }

        if (!isset($validated['thickness'])) {
            $validated['thickness'] = 0.2; 
        }

        $validated['deposit_id'] = $depositId;
        $wall = Wall::create($validated);

        ActivityLogService::logCreated($wall, $validated);

        return response()->json($wall, 201);
    }

    public function show($depositId, $wallId)
    {
        $wall = Wall::where('deposit_id', $depositId)->findOrFail($wallId);
        return response()->json($wall);
    }

    public function update(Request $request, $depositId, $wallId)
    {
        $deposit = Deposit::findOrFail($depositId);
        $wall = Wall::where('deposit_id', $depositId)->findOrFail($wallId);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'x_start' => 'sometimes|numeric|min:0',
            'y_start' => 'sometimes|numeric|min:0',
            'x_end' => 'sometimes|numeric|min:0',
            'y_end' => 'sometimes|numeric|min:0',
            'thickness' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $xStart = $validated['x_start'] ?? $wall->x_start;
        $yStart = $validated['y_start'] ?? $wall->y_start;
        $xEnd = $validated['x_end'] ?? $wall->x_end;
        $yEnd = $validated['y_end'] ?? $wall->y_end;

        $maxX = max($xStart, $xEnd);
        $maxY = max($yStart, $yEnd);

        if ($maxX > $deposit->width) {
            return response()->json([
                'message' => 'Wall extends beyond deposit width'
            ], 422);
        }

        if ($maxY > $deposit->height) {
            return response()->json([
                'message' => 'Wall extends beyond deposit height'
            ], 422);
        }

        $oldValues = $wall->only(array_keys($validated));
        $wall->update($validated);
        $newValues = $wall->only(array_keys($validated));

        ActivityLogService::logUpdated($wall, $oldValues, $newValues);

        return response()->json($wall);
    }

    public function destroy($depositId, $wallId)
    {
        $wall = Wall::where('deposit_id', $depositId)->findOrFail($wallId);
        
        ActivityLogService::logDeleted($wall);
        $wall->delete();

        return response()->json(['message' => 'Wall deleted successfully']);
    }
}

