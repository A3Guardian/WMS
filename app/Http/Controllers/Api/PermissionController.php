<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Exceptions\HttpResponseException;

class PermissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('view permissions')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $permissions = Permission::all();

        return response()->json($permissions);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('manage permissions')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $validated = $request->validate([
            'name' => 'required|string|unique:permissions,name',
        ]);

        $permission = Permission::create(['name' => $validated['name']]);

        return response()->json($permission, 201);
    }

    public function show(Request $request, Permission $permission): JsonResponse
    {
        if (!$request->user()->can('view permissions')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        return response()->json($permission);
    }

    public function update(Request $request, Permission $permission): JsonResponse
    {
        if (!$request->user()->can('manage permissions')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $validated = $request->validate([
            'name' => 'required|string|unique:permissions,name,' . $permission->id,
        ]);

        $permission->name = $validated['name'];
        $permission->save();

        return response()->json($permission);
    }

    public function destroy(Request $request, Permission $permission): JsonResponse
    {
        if (!$request->user()->can('manage permissions')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $permission->delete();

        return response()->json(['message' => 'Permission deleted successfully']);
    }
}

