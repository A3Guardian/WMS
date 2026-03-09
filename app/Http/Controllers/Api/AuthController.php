<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (Auth::attempt($request->only('email', 'password'))) {
            $user = Auth::user();
            $token = $user->createToken('auth-token')->plainTextToken;

            $permissions = $user->getAllPermissions()->pluck('name')->toArray();
            $roles = $user->roles->pluck('name')->toArray();

            return response()->json([
                'user' => $this->userResponse($user),
                'token' => $token,
            ]);
        }

        throw ValidationException::withMessages([
            'email' => ['The provided credentials are incorrect.'],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json($this->userResponse($request->user()));
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        if (! empty($validated['name'])) {
            $user->name = $validated['name'];
        }
        if (isset($validated['email']) && $validated['email'] !== '') {
            $user->email = $validated['email'];
        }
        if (array_key_exists('phone', $validated)) {
            $user->phone = $validated['phone'];
        }
        if (array_key_exists('address', $validated)) {
            $user->address = $validated['address'];
        }
        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }
        $user->save();

        return response()->json($this->userResponse($user));
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        $user = $request->user();
        $file = $request->file('avatar');
        $path = $file->store('avatars', 'public');

        if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
            Storage::disk('public')->delete($user->avatar);
        }
        $user->avatar = $path;
        $user->save();

        $avatarUrl = asset('storage/' . $path);
        return response()->json([
            'avatar' => $path,
            'avatar_url' => $avatarUrl,
            'user' => $this->userResponse($user),
        ]);
    }

    private function userResponse($user): array
    {
        $permissions = $user->getAllPermissions()->pluck('name')->toArray();
        $roles = $user->roles->pluck('name')->toArray();
        $avatarUrl = $user->avatar ? asset('storage/' . $user->avatar) : null;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'address' => $user->address,
            'avatar' => $user->avatar,
            'avatar_url' => $avatarUrl,
            'roles' => $roles,
            'permissions' => $permissions,
        ];
    }
}

