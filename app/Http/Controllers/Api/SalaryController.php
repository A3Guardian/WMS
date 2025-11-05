<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Salary;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalaryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('view salaries')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Salary::with(['employee.user', 'employee.department']);

        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        $perPage = $request->per_page ?? 15;
        $perPage = min(max((int)$perPage, 1), 100);

        return response()->json($query->orderBy('effective_date', 'desc')->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('manage salaries')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'amount' => 'required|numeric|min:0',
            'effective_date' => 'required|date',
            'end_date' => 'nullable|date|after:effective_date',
            'type' => 'required|in:base,bonus,deduction,adjustment',
            'notes' => 'nullable|string',
        ]);

        $salary = Salary::create($validated);
        
        if ($validated['type'] === 'base') {
            $employee = \App\Models\Employee::find($validated['employee_id']);
            if ($employee) {
                $employee->update(['salary' => $validated['amount']]);
            }
        }
        
        ActivityLogService::logCreated($salary);

        return response()->json($salary->load(['employee.user', 'employee.department']), 201);
    }

    public function show(Salary $salary): JsonResponse
    {
        if (!request()->user()->can('view salaries')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($salary->load(['employee.user', 'employee.department']));
    }

    public function update(Request $request, Salary $salary): JsonResponse
    {
        if (!$request->user()->can('manage salaries')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'sometimes|required|exists:employees,id',
            'amount' => 'sometimes|required|numeric|min:0',
            'effective_date' => 'sometimes|required|date',
            'end_date' => 'nullable|date|after:effective_date',
            'type' => 'sometimes|required|in:base,bonus,deduction,adjustment',
            'notes' => 'nullable|string',
        ]);

        $oldValues = $salary->only(array_keys($validated));
        $salary->update($validated);
        $newValues = $salary->only(array_keys($validated));
        
        if (($validated['type'] ?? $salary->type) === 'base' && isset($validated['amount'])) {
            $employee = $salary->employee;
            if ($employee) {
                $employee->update(['salary' => $validated['amount']]);
            }
        }
        
        ActivityLogService::logUpdated($salary, $oldValues, $newValues);

        return response()->json($salary->load(['employee.user', 'employee.department']));
    }

    public function destroy(Salary $salary): JsonResponse
    {
        if (!request()->user()->can('manage salaries')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        ActivityLogService::logDeleted($salary);
        $salary->delete();

        return response()->json(['message' => 'Salary deleted successfully']);
    }
}
