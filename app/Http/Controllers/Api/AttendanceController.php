<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('view attendance')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Attendance::with(['employee.user', 'employee.department']);

        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->has('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $perPage = $request->per_page ?? 15;
        $perPage = min(max((int)$perPage, 1), 100);

        return response()->json($query->orderBy('date', 'desc')->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('manage attendance')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'clock_in' => 'nullable|date',
            'clock_out' => 'nullable|date|after:clock_in',
            'status' => 'sometimes|in:present,absent,late,half_day,on_leave',
            'notes' => 'nullable|string',
        ]);

        if (isset($validated['clock_in']) && isset($validated['clock_out'])) {
            $clockIn = new \DateTime($validated['clock_in']);
            $clockOut = new \DateTime($validated['clock_out']);
            $diff = $clockIn->diff($clockOut);
            $totalHours = $diff->h + ($diff->i / 60) + ($diff->s / 3600);
            $validated['total_hours'] = round($totalHours, 2);
            
            if ($totalHours > 8) {
                $validated['overtime_hours'] = round($totalHours - 8, 2);
            }
        }

        $attendance = Attendance::updateOrCreate(
            ['employee_id' => $validated['employee_id'], 'date' => $validated['date']],
            $validated
        );

        if ($attendance->wasRecentlyCreated) {
            ActivityLogService::logCreated($attendance);
        } else {
            $oldValues = $attendance->getOriginal();
            $newValues = $attendance->getAttributes();
            ActivityLogService::logUpdated($attendance, $oldValues, $newValues);
        }

        return response()->json($attendance->load(['employee.user', 'employee.department']), 201);
    }

    public function show(Attendance $attendance): JsonResponse
    {
        if (!request()->user()->can('view attendance')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($attendance->load(['employee.user', 'employee.department']));
    }

    public function update(Request $request, Attendance $attendance): JsonResponse
    {
        if (!$request->user()->can('manage attendance')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'sometimes|required|exists:employees,id',
            'date' => 'sometimes|required|date',
            'clock_in' => 'nullable|date',
            'clock_out' => 'nullable|date|after:clock_in',
            'total_hours' => 'nullable|numeric|min:0',
            'overtime_hours' => 'nullable|numeric|min:0',
            'status' => 'sometimes|in:present,absent,late,half_day,on_leave',
            'notes' => 'nullable|string',
        ]);

        if (isset($validated['clock_in']) && isset($validated['clock_out'])) {
            $clockIn = new \DateTime($validated['clock_in']);
            $clockOut = new \DateTime($validated['clock_out']);
            $diff = $clockIn->diff($clockOut);
            $totalHours = $diff->h + ($diff->i / 60) + ($diff->s / 3600);
            $validated['total_hours'] = round($totalHours, 2);
            
            if ($totalHours > 8) {
                $validated['overtime_hours'] = round($totalHours - 8, 2);
            }
        }

        $oldValues = $attendance->only(array_keys($validated));
        $attendance->update($validated);
        $newValues = $attendance->only(array_keys($validated));
        ActivityLogService::logUpdated($attendance, $oldValues, $newValues);

        return response()->json($attendance->load(['employee.user', 'employee.department']));
    }

    public function destroy(Attendance $attendance): JsonResponse
    {
        if (!request()->user()->can('manage attendance')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        ActivityLogService::logDeleted($attendance);
        $attendance->delete();

        return response()->json(['message' => 'Attendance record deleted successfully']);
    }
}
