<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Exceptions\HttpResponseException;

class RoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('view roles')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $roles = Role::with('permissions')->get();

        return response()->json($roles);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('create roles')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $validated = $request->validate([
            'name' => 'required|string|unique:roles,name',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,name',
        ]);

        $role = Role::create(['name' => $validated['name']]);

        if (isset($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        $role->load('permissions');

        return response()->json($role, 201);
    }

    public function show(Request $request, Role $role): JsonResponse
    {
        if (!$request->user()->can('view roles')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $role->load('permissions');

        return response()->json($role);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        if (!$request->user()->can('edit roles')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|unique:roles,name,' . $role->id,
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,name',
        ]);

        if (isset($validated['name'])) {
            $role->name = $validated['name'];
            $role->save();
        }

        if (isset($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        $role->load('permissions');

        return response()->json($role);
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        if (!$request->user()->can('delete roles')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $role->delete();

        return response()->json(['message' => 'Role deleted successfully']);
    }

    public function assignPermissions(Request $request, Role $role): JsonResponse
    {
        if (!$request->user()->can('manage permissions')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,name',
        ]);

        $role->syncPermissions($validated['permissions']);

        $role->load('permissions');

        return response()->json($role);
    }
}

