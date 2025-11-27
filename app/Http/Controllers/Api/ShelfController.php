<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shelf;
use App\Models\Deposit;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;

class ShelfController extends Controller
{
    public function index(Request $request, $depositId)
    {
        $deposit = Deposit::findOrFail($depositId);
        $shelves = $deposit->shelves()->orderBy('created_at', 'asc')->get();
        
        return response()->json($shelves);
    }

    public function store(Request $request, $depositId)
    {
        $deposit = Deposit::findOrFail($depositId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:255',
            'x_position' => 'required|numeric|min:0',
            'y_position' => 'required|numeric|min:0',
            'width' => 'required|numeric|min:0',
            'height' => 'required|numeric|min:0',
            'depth' => 'nullable|numeric|min:0',
            'capacity' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        if ($validated['x_position'] + $validated['width'] > $deposit->width) {
            return response()->json([
                'message' => 'Shelf width exceeds deposit width at this position'
            ], 422);
        }

        if ($validated['y_position'] + $validated['height'] > $deposit->height) {
            return response()->json([
                'message' => 'Shelf height exceeds deposit height at this position'
            ], 422);
        }

        if (!isset($validated['capacity']) && isset($validated['width']) && isset($validated['height']) && isset($validated['depth'])) {
            $validated['capacity'] = $validated['width'] * $validated['height'] * $validated['depth'];
        }

        $validated['deposit_id'] = $depositId;
        $shelf = Shelf::create($validated);

        ActivityLogService::logCreated($shelf, $validated);

        return response()->json($shelf, 201);
    }

    public function show($depositId, $shelfId)
    {
        $shelf = Shelf::where('deposit_id', $depositId)->findOrFail($shelfId);
        return response()->json($shelf);
    }

    public function update(Request $request, $depositId, $shelfId)
    {
        $deposit = Deposit::findOrFail($depositId);
        $shelf = Shelf::where('deposit_id', $depositId)->findOrFail($shelfId);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'nullable|string|max:255',
            'x_position' => 'sometimes|numeric|min:0',
            'y_position' => 'sometimes|numeric|min:0',
            'width' => 'sometimes|numeric|min:0',
            'height' => 'sometimes|numeric|min:0',
            'depth' => 'nullable|numeric|min:0',
            'capacity' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $xPos = $validated['x_position'] ?? $shelf->x_position;
        $yPos = $validated['y_position'] ?? $shelf->y_position;
        $width = $validated['width'] ?? $shelf->width;
        $height = $validated['height'] ?? $shelf->height;

        if ($xPos + $width > $deposit->width) {
            return response()->json([
                'message' => 'Shelf width exceeds deposit width at this position'
            ], 422);
        }

        if ($yPos + $height > $deposit->height) {
            return response()->json([
                'message' => 'Shelf height exceeds deposit height at this position'
            ], 422);
        }

        if (isset($validated['width']) || isset($validated['height']) || isset($validated['depth'])) {
            $width = $validated['width'] ?? $shelf->width;
            $height = $validated['height'] ?? $shelf->height;
            $depth = $validated['depth'] ?? $shelf->depth;
            if ($width && $height && $depth) {
                $validated['capacity'] = $width * $height * $depth;
            }
        }

        $oldValues = $shelf->only(array_keys($validated));
        $shelf->update($validated);
        $newValues = $shelf->only(array_keys($validated));

        ActivityLogService::logUpdated($shelf, $oldValues, $newValues);

        return response()->json($shelf);
    }

    public function destroy($depositId, $shelfId)
    {
        $shelf = Shelf::where('deposit_id', $depositId)->findOrFail($shelfId);
        
        ActivityLogService::logDeleted($shelf);
        $shelf->delete();

        return response()->json(['message' => 'Shelf deleted successfully']);
    }
}

