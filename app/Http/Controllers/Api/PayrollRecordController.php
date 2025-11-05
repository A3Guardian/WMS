<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollRecord;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollRecordController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('view payroll')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = PayrollRecord::with(['employee.user', 'employee.department']);

        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->has('month')) {
            $query->where('month', $request->month);
        }

        if ($request->has('year')) {
            $query->where('year', $request->year);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $perPage = $request->per_page ?? 15;
        $perPage = min(max((int)$perPage, 1), 100);

        return response()->json($query->orderBy('year', 'desc')->orderBy('month', 'desc')->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('manage payroll')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2000|max:9999',
            'base_salary' => 'nullable|numeric|min:0',
            'deductions' => 'nullable|numeric|min:0',
            'bonuses' => 'nullable|numeric|min:0',
            'overtime_pay' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        if (!isset($validated['base_salary'])) {
            $employee = \App\Models\Employee::find($validated['employee_id']);
            $validated['base_salary'] = $employee ? ($employee->salary ?? 0) : 0;
        }

        $netSalary = $validated['base_salary'] 
            + ($validated['bonuses'] ?? 0) 
            + ($validated['overtime_pay'] ?? 0) 
            - ($validated['deductions'] ?? 0);

        $validated['net_salary'] = $netSalary;
        $validated['status'] = 'draft';

        $payrollRecord = PayrollRecord::create($validated);
        ActivityLogService::logCreated($payrollRecord);

        return response()->json($payrollRecord->load(['employee.user', 'employee.department']), 201);
    }

    public function show(PayrollRecord $payrollRecord): JsonResponse
    {
        if (!request()->user()->can('view payroll')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($payrollRecord->load(['employee.user', 'employee.department']));
    }

    public function update(Request $request, PayrollRecord $payrollRecord): JsonResponse
    {
        if (!$request->user()->can('manage payroll')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'sometimes|required|exists:employees,id',
            'month' => 'sometimes|required|integer|between:1,12',
            'year' => 'sometimes|required|integer|min:2000|max:9999',
            'base_salary' => 'nullable|numeric|min:0',
            'deductions' => 'nullable|numeric|min:0',
            'bonuses' => 'nullable|numeric|min:0',
            'overtime_pay' => 'nullable|numeric|min:0',
            'status' => 'sometimes|in:draft,processed,paid,cancelled',
            'notes' => 'nullable|string',
        ]);

        if (!isset($validated['base_salary'])) {
            $employeeId = $validated['employee_id'] ?? $payrollRecord->employee_id;
            $employee = \App\Models\Employee::find($employeeId);
            $validated['base_salary'] = $employee ? ($employee->salary ?? $payrollRecord->base_salary) : $payrollRecord->base_salary;
        }

        if (isset($validated['base_salary']) || isset($validated['bonuses']) || isset($validated['deductions']) || isset($validated['overtime_pay'])) {
            $baseSalary = $validated['base_salary'] ?? $payrollRecord->base_salary;
            $bonuses = $validated['bonuses'] ?? $payrollRecord->bonuses ?? 0;
            $deductions = $validated['deductions'] ?? $payrollRecord->deductions ?? 0;
            $overtimePay = $validated['overtime_pay'] ?? $payrollRecord->overtime_pay ?? 0;
            $validated['net_salary'] = $baseSalary + $bonuses + $overtimePay - $deductions;
        }

        if (isset($validated['status']) && $validated['status'] === 'paid') {
            $validated['paid_at'] = now();
        }

        $oldValues = $payrollRecord->only(array_keys($validated));
        $payrollRecord->update($validated);
        $newValues = $payrollRecord->only(array_keys($validated));
        ActivityLogService::logUpdated($payrollRecord, $oldValues, $newValues);

        return response()->json($payrollRecord->load(['employee.user', 'employee.department']));
    }

    public function destroy(PayrollRecord $payrollRecord): JsonResponse
    {
        if (!request()->user()->can('manage payroll')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        ActivityLogService::logDeleted($payrollRecord);
        $payrollRecord->delete();

        return response()->json(['message' => 'Payroll record deleted successfully']);
    }
}
