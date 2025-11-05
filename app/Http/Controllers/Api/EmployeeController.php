<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Salary;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EmployeeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('view employees')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Employee::with(['user', 'department']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('employee_code', 'like', '%' . $search . '%')
                  ->orWhere('position', 'like', '%' . $search . '%')
                  ->orWhereHas('user', function($userQuery) use ($search) {
                      $userQuery->where('name', 'like', '%' . $search . '%')
                                ->orWhere('email', 'like', '%' . $search . '%');
                  });
            });
        }

        if ($request->has('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('employment_type')) {
            $query->where('employment_type', $request->employment_type);
        }

        $perPage = $request->per_page ?? 15;
        $perPage = min(max((int)$perPage, 1), 100);

        return response()->json($query->orderBy('created_at', 'desc')->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('create employees')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'employee_code' => 'required|string|max:255|unique:employees,employee_code',
            'department_id' => 'nullable|exists:departments,id',
            'position' => 'nullable|string|max:255',
            'hire_date' => 'required|date',
            'employment_type' => 'required|in:full-time,part-time,contractor,intern',
            'salary' => 'nullable|numeric|min:0',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:255',
            'status' => 'sometimes|in:active,inactive,terminated,on_leave',
        ]);

        $employee = Employee::create($validated);
        
        if (isset($validated['salary']) && $validated['salary'] > 0) {
            Salary::create([
                'employee_id' => $employee->id,
                'amount' => $validated['salary'],
                'effective_date' => $validated['hire_date'],
                'type' => 'base',
                'notes' => 'Initial salary set during employee creation',
            ]);
        }
        
        ActivityLogService::logCreated($employee);

        return response()->json($employee->load(['user', 'department']), 201);
    }

    public function show(Employee $employee): JsonResponse
    {
        if (!request()->user()->can('view employees')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($employee->load(['user', 'department']));
    }

    public function update(Request $request, Employee $employee): JsonResponse
    {
        if (!$request->user()->can('edit employees')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'user_id' => 'sometimes|nullable|exists:users,id',
            'employee_code' => 'sometimes|required|string|max:255|unique:employees,employee_code,' . $employee->id,
            'department_id' => 'sometimes|nullable|exists:departments,id',
            'position' => 'sometimes|nullable|string|max:255',
            'hire_date' => 'sometimes|required|date',
            'employment_type' => 'sometimes|required|in:full-time,part-time,contractor,intern',
            'salary' => 'sometimes|nullable|numeric|min:0',
            'phone' => 'sometimes|nullable|string|max:255',
            'address' => 'sometimes|nullable|string',
            'emergency_contact_name' => 'sometimes|nullable|string|max:255',
            'emergency_contact_phone' => 'sometimes|nullable|string|max:255',
            'status' => 'sometimes|in:active,inactive,terminated,on_leave',
        ]);

        $oldValues = $employee->only(array_keys($validated));
        
        $salaryChanged = isset($validated['salary']) && 
                         $validated['salary'] != $employee->salary && 
                         $validated['salary'] > 0;
        
        $employee->update($validated);
        $newValues = $employee->only(array_keys($validated));
        
        if ($salaryChanged) {
            Salary::create([
                'employee_id' => $employee->id,
                'amount' => $validated['salary'],
                'effective_date' => now()->toDateString(),
                'type' => 'base',
                'notes' => 'Salary updated from employee profile',
            ]);
        }
        
        ActivityLogService::logUpdated($employee, $oldValues, $newValues);

        return response()->json($employee->load(['user', 'department']));
    }

    public function destroy(Employee $employee): JsonResponse
    {
        if (!request()->user()->can('delete employees')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        ActivityLogService::logDeleted($employee);
        $employee->delete();

        return response()->json(['message' => 'Employee deleted successfully']);
    }
}
