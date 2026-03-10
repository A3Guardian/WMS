<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Door;
use App\Models\Deposit;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;

class DoorController extends Controller
{
    public function index(Request $request, $depositId)
    {
        $deposit = Deposit::findOrFail($depositId);
        $doors = $deposit->doors()->with('wall')->orderBy('created_at', 'asc')->get();

        return response()->json($doors);
    }

    public function store(Request $request, $depositId)
    {
        $deposit = Deposit::findOrFail($depositId);

        $validated = $request->validate([
            'wall_id' => 'nullable|exists:walls,id',
            'name' => 'nullable|string|max:255',
            'x_position' => 'required|numeric|min:0',
            'y_position' => 'required|numeric|min:0',
            'width' => 'nullable|numeric|min:0',
            'orientation' => 'required|in:horizontal,vertical',
            'description' => 'nullable|string',
        ]);

        $width = $validated['width'] ?? 0.9;

        if ($validated['orientation'] === 'horizontal') {
            if (($validated['x_position'] - ($width / 2)) < 0 || ($validated['x_position'] + ($width / 2)) > $deposit->width) {
                return response()->json([
                    'message' => 'Door extends beyond deposit width'
                ], 422);
            }
        } else {
            if (($validated['y_position'] - ($width / 2)) < 0 || ($validated['y_position'] + ($width / 2)) > $deposit->height) {
                return response()->json([
                    'message' => 'Door extends beyond deposit height'
                ], 422);
            }
        }

        if (!isset($validated['width'])) {
            $validated['width'] = 0.9;
        }

        $validated['deposit_id'] = $depositId;
        $door = Door::create($validated);

        ActivityLogService::logCreated($door, $validated);

        return response()->json($door->load('wall'), 201);
    }

    public function show($depositId, $doorId)
    {
        $door = Door::where('deposit_id', $depositId)->with('wall')->findOrFail($doorId);
        return response()->json($door);
    }

    public function update(Request $request, $depositId, $doorId)
    {
        $deposit = Deposit::findOrFail($depositId);
        $door = Door::where('deposit_id', $depositId)->findOrFail($doorId);

        $validated = $request->validate([
            'wall_id' => 'nullable|exists:walls,id',
            'name' => 'nullable|string|max:255',
            'x_position' => 'sometimes|numeric|min:0',
            'y_position' => 'sometimes|numeric|min:0',
            'width' => 'nullable|numeric|min:0',
            'orientation' => 'sometimes|in:horizontal,vertical',
            'description' => 'nullable|string',
        ]);

        $xPos = $validated['x_position'] ?? $door->x_position;
        $yPos = $validated['y_position'] ?? $door->y_position;
        $width = $validated['width'] ?? $door->width;
        $orientation = $validated['orientation'] ?? $door->orientation;

        if ($orientation === 'horizontal') {
            if (($xPos - ($width / 2)) < 0 || ($xPos + ($width / 2)) > $deposit->width) {
                return response()->json([
                    'message' => 'Door extends beyond deposit width'
                ], 422);
            }
        } else {
            if (($yPos - ($width / 2)) < 0 || ($yPos + ($width / 2)) > $deposit->height) {
                return response()->json([
                    'message' => 'Door extends beyond deposit height'
                ], 422);
            }
        }

        $oldValues = $door->only(array_keys($validated));
        $door->update($validated);
        $door->refresh();
        $newValues = $door->only(array_keys($validated));

        ActivityLogService::logUpdated($door, $oldValues, $newValues);

        return response()->json($door->load('wall'));
    }

    public function destroy($depositId, $doorId)
    {
        $door = Door::where('deposit_id', $depositId)->findOrFail($doorId);

        ActivityLogService::logDeleted($door);
        $door->delete();

        return response()->json(['message' => 'Door deleted successfully']);
    }
}
