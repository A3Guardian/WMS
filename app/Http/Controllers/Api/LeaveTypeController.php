<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveType;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('view leave types')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = LeaveType::query();

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $perPage = $request->per_page ?? 100;
        $perPage = min(max((int)$perPage, 1), 100);

        return response()->json($query->orderBy('name')->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('manage leave types')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'max_days_per_year' => 'required|integer|min:0',
            'carry_forward' => 'boolean',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $leaveType = LeaveType::create($validated);
        ActivityLogService::logCreated($leaveType);

        return response()->json($leaveType, 201);
    }

    public function show(LeaveType $leaveType): JsonResponse
    {
        if (!request()->user()->can('view leave types')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($leaveType);
    }

    public function update(Request $request, LeaveType $leaveType): JsonResponse
    {
        if (!$request->user()->can('manage leave types')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'max_days_per_year' => 'sometimes|required|integer|min:0',
            'carry_forward' => 'boolean',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $oldValues = $leaveType->only(array_keys($validated));
        $leaveType->update($validated);
        $newValues = $leaveType->only(array_keys($validated));
        ActivityLogService::logUpdated($leaveType, $oldValues, $newValues);

        return response()->json($leaveType);
    }

    public function destroy(LeaveType $leaveType): JsonResponse
    {
        if (!request()->user()->can('manage leave types')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        ActivityLogService::logDeleted($leaveType);
        $leaveType->delete();

        return response()->json(['message' => 'Leave type deleted successfully']);
    }
}
