<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Leave;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('view leaves')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Leave::with(['employee.user', 'employee.department', 'leaveType', 'approvedBy']);

        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('leave_type_id')) {
            $query->where('leave_type_id', $request->leave_type_id);
        }

        $perPage = $request->per_page ?? 15;
        $perPage = min(max((int)$perPage, 1), 100);

        return response()->json($query->orderBy('start_date', 'desc')->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('create leaves')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'nullable|string',
        ]);

        $startDate = new \DateTime($validated['start_date']);
        $endDate = new \DateTime($validated['end_date']);
        $days = $startDate->diff($endDate)->days + 1;

        $validated['days'] = $days;
        $validated['status'] = 'pending';

        $leave = Leave::create($validated);
        ActivityLogService::logCreated($leave);

        return response()->json($leave->load(['employee.user', 'employee.department', 'leaveType']), 201);
    }

    public function show(Leave $leave): JsonResponse
    {
        if (!request()->user()->can('view leaves')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($leave->load(['employee.user', 'employee.department', 'leaveType', 'approvedBy']));
    }

    public function update(Request $request, Leave $leave): JsonResponse
    {
        if (!$request->user()->can('edit leaves')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'sometimes|required|exists:employees,id',
            'leave_type_id' => 'sometimes|required|exists:leave_types,id',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'sometimes|required|date|after_or_equal:start_date',
            'status' => 'sometimes|in:pending,approved,rejected,cancelled',
            'reason' => 'nullable|string',
            'rejection_reason' => 'nullable|string',
        ]);

        if (isset($validated['start_date']) || isset($validated['end_date'])) {
            $startDate = new \DateTime($validated['start_date'] ?? $leave->start_date);
            $endDate = new \DateTime($validated['end_date'] ?? $leave->end_date);
            $validated['days'] = $startDate->diff($endDate)->days + 1;
        }

        if (isset($validated['status']) && $validated['status'] === 'approved') {
            $validated['approved_by'] = $request->user()->id;
            $validated['approved_at'] = now();
        }

        $oldValues = $leave->only(array_keys($validated));
        $leave->update($validated);
        $newValues = $leave->only(array_keys($validated));
        ActivityLogService::logUpdated($leave, $oldValues, $newValues);

        return response()->json($leave->load(['employee.user', 'employee.department', 'leaveType', 'approvedBy']));
    }

    public function destroy(Leave $leave): JsonResponse
    {
        if (!request()->user()->can('delete leaves')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        ActivityLogService::logDeleted($leave);
        $leave->delete();

        return response()->json(['message' => 'Leave deleted successfully']);
    }
}
