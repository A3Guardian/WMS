<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Deposit;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DepositController extends Controller
{
    public function index(Request $request)
    {
        $query = Deposit::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('code', 'like', '%' . $search . '%')
                  ->orWhere('location', 'like', '%' . $search . '%')
                  ->orWhere('description', 'like', '%' . $search . '%');
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('location')) {
            $query->where('location', 'like', '%' . $request->location . '%');
        }

        $query->orderBy('created_at', 'desc');

        return response()->json($query->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:255|unique:deposits,code',
            'location' => 'nullable|string|max:255',
            'width' => 'nullable|numeric|min:0',
            'height' => 'nullable|numeric|min:0',
            'depth' => 'nullable|numeric|min:0',
            'capacity' => 'nullable|numeric|min:0',
            'status' => 'sometimes|in:active,inactive,maintenance',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if (!isset($validated['code']) && empty($validated['code'])) {
            $validated['code'] = 'DEP-' . strtoupper(Str::random(8));
        }

        if (!isset($validated['status'])) {
            $validated['status'] = 'active';
        }

        if (!isset($validated['capacity']) && isset($validated['width']) && isset($validated['height']) && isset($validated['depth'])) {
            $validated['capacity'] = $validated['width'] * $validated['height'] * $validated['depth'];
        }

        $deposit = Deposit::create($validated);

        ActivityLogService::logCreated($deposit, $validated);

        return response()->json($deposit, 201);
    }

    public function show(Deposit $deposit)
    {
        return response()->json($deposit);
    }

    public function update(Request $request, Deposit $deposit)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'nullable|string|max:255|unique:deposits,code,' . $deposit->id,
            'location' => 'nullable|string|max:255',
            'width' => 'nullable|numeric|min:0',
            'height' => 'nullable|numeric|min:0',
            'depth' => 'nullable|numeric|min:0',
            'capacity' => 'nullable|numeric|min:0',
            'status' => 'sometimes|in:active,inactive,maintenance',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if (!isset($validated['capacity']) && isset($validated['width']) && isset($validated['height']) && isset($validated['depth'])) {
            $validated['capacity'] = $validated['width'] * $validated['height'] * $validated['depth'];
        } elseif (isset($validated['width']) || isset($validated['height']) || isset($validated['depth'])) {
            $width = $validated['width'] ?? $deposit->width;
            $height = $validated['height'] ?? $deposit->height;
            $depth = $validated['depth'] ?? $deposit->depth;
            if ($width && $height && $depth) {
                $validated['capacity'] = $width * $height * $depth;
            }
        }

        $oldValues = $deposit->only(array_keys($validated));
        $deposit->update($validated);
        $newValues = $deposit->only(array_keys($validated));

        ActivityLogService::logUpdated($deposit, $oldValues, $newValues);

        return response()->json($deposit);
    }

    public function destroy(Deposit $deposit)
    {
        ActivityLogService::logDeleted($deposit);
        $deposit->delete();

        return response()->json(['message' => 'Deposit deleted successfully']);
    }
}

