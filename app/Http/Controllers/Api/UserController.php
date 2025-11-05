<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Exceptions\HttpResponseException;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('view users')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $query = User::with('roles', 'permissions');

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('email', 'like', '%' . $search . '%');
            });
        }

        $perPage = $request->per_page ?? 20;
        $perPage = min(max((int)$perPage, 1), 100);

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('create users')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'roles' => 'nullable|array',
            'roles.*' => 'exists:roles,name',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'email_verified_at' => now(),
        ]);

        if (isset($validated['roles'])) {
            $user->assignRole($validated['roles']);
        }

        $user->load('roles', 'permissions');

        ActivityLogService::logCreated($user, [
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $validated['roles'] ?? [],
        ]);

        return response()->json($user, 201);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->can('view users')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $user->load('roles', 'permissions');

        return response()->json($user);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->can('edit users')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $user->id,
            'password' => 'sometimes|nullable|string|min:8',
            'roles' => 'nullable|array',
            'roles.*' => 'exists:roles,name',
        ]);

        $oldValues = [
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->roles->pluck('name')->toArray(),
        ];

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }

        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }

        if (isset($validated['password']) && $validated['password']) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        if (isset($validated['roles'])) {
            $user->syncRoles($validated['roles']);
        }

        $user->load('roles', 'permissions');

        $newValues = [
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->roles->pluck('name')->toArray(),
        ];

        ActivityLogService::logUpdated($user, $oldValues, $newValues);

        return response()->json($user);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->can('delete users')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        ActivityLogService::logDeleted($user);
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    public function assignRoles(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->can('assign roles')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $validated = $request->validate([
            'roles' => 'required|array',
            'roles.*' => 'exists:roles,name',
        ]);

        $user->syncRoles($validated['roles']);

        $user->load('roles', 'permissions');

        return response()->json($user);
    }
}

