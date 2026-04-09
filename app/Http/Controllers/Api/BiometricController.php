<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BiometricDevice;
use App\Models\BiometricEvent;
use App\Models\BiometricTemplate;
use App\Models\Deposit;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BiometricController extends Controller
{
    public function indexDevices(Request $request): JsonResponse
    {
        $this->ensureCanManageUsers($request);

        $devices = BiometricDevice::with('deposit')->orderBy('name')->get();

        return response()->json($devices);
    }

    public function storeDevice(Request $request): JsonResponse
    {
        $this->ensureCanManageUsers($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:255|unique:biometric_devices,code',
            'deposit_id' => 'nullable|exists:deposits,id',
            'is_active' => 'sometimes|boolean',
            'meta' => 'nullable|array',
        ]);

        $device = BiometricDevice::create([
            ...$validated,
            'is_active' => $validated['is_active'] ?? true,
            'api_key' => Str::random(64),
        ]);

        return response()->json($device->load('deposit'), 201);
    }

    public function updateDevice(Request $request, BiometricDevice $device): JsonResponse
    {
        $this->ensureCanManageUsers($request);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:255|unique:biometric_devices,code,' . $device->id,
            'deposit_id' => 'nullable|exists:deposits,id',
            'is_active' => 'sometimes|boolean',
            'meta' => 'nullable|array',
            'rotate_api_key' => 'sometimes|boolean',
        ]);

        if (! empty($validated['rotate_api_key'])) {
            $validated['api_key'] = Str::random(64);
        }

        $device->update($validated);

        return response()->json($device->fresh()->load('deposit'));
    }

    public function indexUserTemplates(Request $request, User $user): JsonResponse
    {
        $this->ensureCanManageUsers($request);

        $templates = $user->biometricTemplates()
            ->with('device')
            ->orderByDesc('id')
            ->get();

        return response()->json($templates);
    }

    public function storeUserTemplate(Request $request, User $user): JsonResponse
    {
        $this->ensureCanManageUsers($request);

        $validated = $request->validate([
            'biometric_device_id' => 'required|exists:biometric_devices,id',
            'fingerprint_uid' => 'required|string|max:255',
            'finger_index' => 'nullable|integer|min:0|max:10',
            'label' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $template = BiometricTemplate::create([
            ...$validated,
            'user_id' => $user->id,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($template->load('device', 'user'), 201);
    }

    public function destroyTemplate(Request $request, BiometricTemplate $template): JsonResponse
    {
        $this->ensureCanManageUsers($request);

        $template->delete();

        return response()->json(['message' => 'Biometric template removed successfully']);
    }

    public function showUserAccess(Request $request, User $user): JsonResponse
    {
        $this->ensureCanManageUsers($request);

        $depositIds = $user->accessibleDeposits()->pluck('deposits.id');

        return response()->json([
            'user_id' => $user->id,
            'deposit_ids' => $depositIds,
        ]);
    }

    public function syncUserAccess(Request $request, User $user): JsonResponse
    {
        $this->ensureCanManageUsers($request);

        $validated = $request->validate([
            'deposit_ids' => 'required|array',
            'deposit_ids.*' => 'integer|exists:deposits,id',
        ]);

        $user->accessibleDeposits()->sync($validated['deposit_ids']);

        return response()->json([
            'user_id' => $user->id,
            'deposit_ids' => $user->accessibleDeposits()->pluck('deposits.id'),
        ]);
    }

    public function storeEvent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'device_code' => 'required|string|max:255',
            'event_type' => 'required|string|max:100',
            'fingerprint_uid' => 'nullable|string|max:255',
            'fingerprint_image_base64' => 'nullable|string',
            'fingerprint_image_mime' => 'nullable|in:image/png,image/jpeg,image/webp',
            'matched_user_id' => 'nullable|integer|exists:users,id',
            'deposit_id' => 'nullable|integer|exists:deposits,id',
            'match_score' => 'nullable|integer|min:0|max:100',
            'occurred_at' => 'nullable|date',
            'payload' => 'nullable|array',
        ]);

        $device = BiometricDevice::where('code', $validated['device_code'])
            ->where('is_active', true)
            ->first();

        if (! $device) {
            throw new HttpResponseException(response()->json(['message' => 'Unknown device'], 403));
        }

        $providedKey = (string) $request->header('X-Device-Key', '');
        if ($providedKey === '' || ! hash_equals($device->api_key, $providedKey)) {
            throw new HttpResponseException(response()->json(['message' => 'Invalid device key'], 403));
        }

        $userId = $validated['matched_user_id'] ?? null;
        if (! $userId && ! empty($validated['fingerprint_uid'])) {
            $templateUserId = BiometricTemplate::query()
                ->where('biometric_device_id', $device->id)
                ->where('fingerprint_uid', $validated['fingerprint_uid'])
                ->where('is_active', true)
                ->value('user_id');

            if ($templateUserId) {
                $userId = (int) $templateUserId;
            }
        }
        $depositId = $validated['deposit_id'] ?? $device->deposit_id;

        $hasDepositAccess = true;
        if ($userId && $depositId) {
            $hasDepositAccess = User::whereKey($userId)
                ->whereHas('accessibleDeposits', fn ($q) => $q->where('deposits.id', $depositId))
                ->exists();
        }

        $imagePath = null;
        if (! empty($validated['fingerprint_image_base64'])) {
            $decodedImage = base64_decode($validated['fingerprint_image_base64'], true);
            if ($decodedImage === false) {
                throw new HttpResponseException(
                    response()->json(['message' => 'Invalid fingerprint image payload'], 422)
                );
            }

            $mime = $validated['fingerprint_image_mime'] ?? 'image/png';
            $extension = match ($mime) {
                'image/jpeg' => 'jpg',
                'image/webp' => 'webp',
                default => 'png',
            };

            $imagePath = 'biometric-scans/' . now()->format('Y/m/d') . '/' . Str::uuid() . '.' . $extension;
            Storage::disk('public')->put($imagePath, $decodedImage);
        }

        $event = BiometricEvent::create([
            'biometric_device_id' => $device->id,
            'user_id' => $userId,
            'deposit_id' => $depositId,
            'event_type' => $validated['event_type'],
            'fingerprint_uid' => $validated['fingerprint_uid'] ?? null,
            'fingerprint_image_path' => $imagePath,
            'access_granted' => $hasDepositAccess && $userId !== null,
            'match_score' => $validated['match_score'] ?? null,
            'payload' => $validated['payload'] ?? null,
            'occurred_at' => $validated['occurred_at'] ?? now(),
        ]);

        $device->update(['last_seen_at' => now()]);

        return response()->json([
            'event_id' => $event->id,
            'access_granted' => $event->access_granted,
            'fingerprint_image_url' => $imagePath ? asset('storage/' . $imagePath) : null,
        ], 201);
    }

    public function listEvents(Request $request): JsonResponse
    {
        $this->ensureCanManageUsers($request);

        $query = BiometricEvent::query()->with(['device', 'user', 'deposit'])->latest('occurred_at');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        if ($request->filled('device_id')) {
            $query->where('biometric_device_id', $request->integer('device_id'));
        }

        if ($request->filled('deposit_id')) {
            $query->where('deposit_id', $request->integer('deposit_id'));
        }

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);

        $events = $query->paginate($perPage);
        $events->getCollection()->transform(function (BiometricEvent $event) {
            $event->fingerprint_image_url = $event->fingerprint_image_path
                ? asset('storage/' . $event->fingerprint_image_path)
                : null;

            return $event;
        });

        return response()->json($events);
    }

    public function indexDeposits(Request $request): JsonResponse
    {
        $this->ensureCanManageUsers($request);

        return response()->json(Deposit::query()->select('id', 'name', 'code')->orderBy('name')->get());
    }

    private function ensureCanManageUsers(Request $request): void
    {
        if (! $request->user() || ! $request->user()->can('edit users')) {
            throw new HttpResponseException(response()->json(['message' => 'Unauthorized'], 403));
        }
    }
}
