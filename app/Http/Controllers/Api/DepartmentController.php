<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('view employees')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Department::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('description', 'like', '%' . $search . '%');
            });
        }

        $perPage = $request->per_page ?? 100;
        $perPage = min(max((int)$perPage, 1), 100);

        return response()->json($query->orderBy('name')->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('create employees')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $department = Department::create($validated);
        ActivityLogService::logCreated($department);

        return response()->json($department, 201);
    }

    public function show(Department $department): JsonResponse
    {
        if (!request()->user()->can('view employees')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($department->load('employees'));
    }

    public function update(Request $request, Department $department): JsonResponse
    {
        if (!$request->user()->can('edit employees')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|nullable|string',
        ]);

        $oldValues = $department->only(array_keys($validated));
        $department->update($validated);
        $newValues = $department->only(array_keys($validated));
        ActivityLogService::logUpdated($department, $oldValues, $newValues);

        return response()->json($department);
    }

    public function destroy(Department $department): JsonResponse
    {
        if (!request()->user()->can('delete employees')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        ActivityLogService::logDeleted($department);
        $department->delete();

        return response()->json(['message' => 'Department deleted successfully']);
    }
}
