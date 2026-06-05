<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\BiometricDevice;
use App\Models\BiometricEvent;
use App\Models\BiometricTemplate;
use App\Models\Deposit;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
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
            'purpose' => 'sometimes|in:access,attendance',
            'service_url' => 'nullable|url|max:500',
            'deposit_id' => 'nullable|exists:deposits,id',
            'is_active' => 'sometimes|boolean',
            'meta' => 'nullable|array',
        ]);

        $device = BiometricDevice::create([
            ...$validated,
            'purpose' => $validated['purpose'] ?? 'access',
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
            'purpose' => 'sometimes|in:access,attendance',
            'service_url' => 'nullable|url|max:500',
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

    public function enrollUserFromDevice(Request $request, User $user): JsonResponse
    {
        $this->ensureCanManageUsers($request);

        $validated = $request->validate([
            'biometric_device_id' => 'required|exists:biometric_devices,id',
            'finger_index' => 'nullable|integer|min:0|max:10',
            'label' => 'nullable|string|max:255',
            'include_image' => 'sometimes|boolean',
        ]);

        $device = $this->resolveActiveDevice((int) $validated['biometric_device_id']);
        $serviceUrl = rtrim((string) $device->service_url, '/');
        $response = Http::timeout(30)->post($serviceUrl . '/enroll', [
            'include_image' => $validated['include_image'] ?? true,
        ]);

        if ($response->failed()) {
            throw new HttpResponseException(response()->json([
                'message' => 'Device enrollment failed',
                'details' => $response->json('detail') ?? $response->body(),
            ], 422));
        }

        $devicePayload = $response->json();
        $this->logDeviceServiceResponse('enroll', $device, $devicePayload);

        return response()->json(
            $this->persistEnrollResult($user, $device, $devicePayload, $validated),
            201
        );
    }

    public function startEnrollSession(Request $request, User $user): JsonResponse
    {
        $this->ensureCanManageUsers($request);

        $validated = $request->validate([
            'biometric_device_id' => 'required|exists:biometric_devices,id',
            'include_image' => 'sometimes|boolean',
        ]);

        $device = $this->resolveActiveDevice((int) $validated['biometric_device_id']);
        $serviceUrl = rtrim((string) $device->service_url, '/');
        $response = Http::timeout(15)->post($serviceUrl . '/enroll/session', [
            'include_image' => $validated['include_image'] ?? true,
        ]);

        if ($response->failed()) {
            throw new HttpResponseException(response()->json([
                'message' => 'Failed to start enrollment session',
                'details' => $response->json('detail') ?? $response->body(),
            ], 422));
        }

        $payload = $response->json();

        return response()->json([
            'session_id' => $payload['session_id'] ?? null,
            'status' => $payload['status'] ?? 'ready',
            'message' => $payload['message'] ?? 'Scan first fingerprint.',
            'log' => 'Initializare senzor... Senzor gata. Scanati amprenta (prima data)...',
        ], 201);
    }

    public function enrollFirstScan(Request $request, User $user, string $session): JsonResponse
    {
        $this->ensureCanManageUsers($request);

        $validated = $request->validate([
            'biometric_device_id' => 'required|exists:biometric_devices,id',
        ]);

        $device = $this->resolveActiveDevice((int) $validated['biometric_device_id']);
        $serviceUrl = rtrim((string) $device->service_url, '/');
        $response = Http::timeout(30)->post($serviceUrl . '/enroll/session/' . $session . '/first-scan');

        if ($response->failed()) {
            throw new HttpResponseException(response()->json([
                'message' => 'First scan failed',
                'details' => $response->json('detail') ?? $response->body(),
            ], $response->status() === 408 ? 408 : 422));
        }

        $payload = $response->json();
        $this->logDeviceServiceResponse('enroll_first_scan', $device, $payload, [
            'session_id' => $session,
            'user_id' => $user->id,
        ]);

        if (($payload['status'] ?? null) === 'already_exists') {
            return response()->json([
                'status' => 'already_exists',
                'position' => $payload['position'] ?? null,
                'accuracy_score' => $payload['accuracy_score'] ?? null,
                'message' => 'Fingerprint already exists on device.',
                'log' => 'Amprenta exista deja in senzor.',
            ], 409);
        }

        return response()->json([
            'status' => 'first_scan_done',
            'message' => 'First scan completed. Scan the same finger again.',
            'log' => 'Prima scanare OK. Rescanati aceeasi amprenta...',
        ]);
    }

    public function enrollSecondScan(Request $request, User $user, string $session): JsonResponse
    {
        $this->ensureCanManageUsers($request);

        $validated = $request->validate([
            'biometric_device_id' => 'required|exists:biometric_devices,id',
            'finger_index' => 'nullable|integer|min:0|max:10',
            'label' => 'nullable|string|max:255',
        ]);

        $device = $this->resolveActiveDevice((int) $validated['biometric_device_id']);
        $serviceUrl = rtrim((string) $device->service_url, '/');
        $response = Http::timeout(30)->post($serviceUrl . '/enroll/session/' . $session . '/second-scan');

        if ($response->failed()) {
            throw new HttpResponseException(response()->json([
                'message' => 'Second scan failed',
                'details' => $response->json('detail') ?? $response->body(),
            ], $response->status() === 408 ? 408 : 422));
        }

        $payload = $response->json();
        $this->logDeviceServiceResponse('enroll_second_scan', $device, $payload, [
            'session_id' => $session,
            'user_id' => $user->id,
        ]);

        $result = $this->persistEnrollResult($user, $device, $payload, $validated);
        $result['log'] = 'Amprenta inrolata cu succes — UID ' . ($result['fingerprint_uid'] ?? '-');

        return response()->json($result, 201);
    }

    public function cancelEnrollSession(Request $request, User $user, string $session): JsonResponse
    {
        $this->ensureCanManageUsers($request);

        $validated = $request->validate([
            'biometric_device_id' => 'required|exists:biometric_devices,id',
        ]);

        $device = $this->resolveActiveDevice((int) $validated['biometric_device_id']);
        $serviceUrl = rtrim((string) $device->service_url, '/');
        Http::timeout(10)->delete($serviceUrl . '/enroll/session/' . $session);

        return response()->json(['status' => 'cancelled']);
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

        $device = BiometricDevice::query()->find($validated['biometric_device_id']);
        if ($device) {
            $this->syncTemplateToSharedSensorDevices(
                $user,
                $device,
                (string) $validated['fingerprint_uid'],
                $validated,
            );
        }

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
        Log::info('Biometric sensor raw request received', [
            'ip' => $request->ip(),
            'device_code' => $request->input('device_code'),
            'event_type' => $request->input('event_type'),
            'payload' => $this->sanitizePayloadForLog($request->all()),
        ]);

        $validated = $request->validate([
            'device_code' => 'required|string|max:255',
            'event_type' => 'required|string|max:100',
            'fingerprint_uid' => 'nullable|string|max:255',
            'fingerprint_image_base64' => 'nullable|string',
            'fingerprint_image_mime' => 'nullable|in:image/png,image/jpeg,image/webp',
            'matched_user_id' => 'nullable|integer|exists:users,id',
            'deposit_id' => 'nullable|integer|exists:deposits,id',
            'match_score' => 'nullable|integer|min:0|max:65535',
            'occurred_at' => 'nullable|date',
            'payload' => 'nullable|array',
        ]);

        Log::info('Biometric sensor payload validated', [
            'payload' => $this->sanitizePayloadForLog($validated),
        ]);

        $device = BiometricDevice::where('code', $validated['device_code'])
            ->where('is_active', true)
            ->first();

        if (! $device) {
            Log::warning('Biometric sensor event rejected: unknown device', [
                'device_code' => $validated['device_code'],
            ]);
            throw new HttpResponseException(response()->json(['message' => 'Unknown device'], 403));
        }

        $providedKey = (string) $request->header('X-Device-Key', '');
        if ($providedKey === '' || ! hash_equals($device->api_key, $providedKey)) {
            Log::warning('Biometric sensor event rejected: invalid device key', [
                'device_id' => $device->id,
                'device_code' => $device->code,
            ]);
            throw new HttpResponseException(response()->json(['message' => 'Invalid device key'], 403));
        }

        $userId = $validated['matched_user_id'] ?? null;
        if (! $userId && ! empty($validated['fingerprint_uid'])) {
            $userId = $this->resolveUserIdFromFingerprint(
                $device,
                (string) $validated['fingerprint_uid'],
            );
        }
        $depositId = $validated['deposit_id'] ?? $device->deposit_id;

        $hasDepositAccess = true;
        if ($userId && $depositId) {
            $hasDepositAccess = User::whereKey($userId)
                ->whereHas('accessibleDeposits', fn ($q) => $q->where('deposits.id', $depositId))
                ->exists();
        }

        $imagePath = $this->storeFingerprintImage(
            $validated['fingerprint_image_base64'] ?? null,
            $validated['fingerprint_image_mime'] ?? null
        );

        $occurredAt = isset($validated['occurred_at'])
            ? Carbon::parse($validated['occurred_at'])
            : now();

        $accessGranted = $hasDepositAccess && $userId !== null;

        Log::info('Biometric sensor event resolved', [
            'device_id' => $device->id,
            'device_code' => $device->code,
            'device_name' => $device->name,
            'event_type' => $validated['event_type'],
            'fingerprint_uid' => $validated['fingerprint_uid'] ?? null,
            'match_score' => $validated['match_score'] ?? null,
            'deposit_id' => $depositId,
            'resolved_user_id' => $userId,
            'has_deposit_access' => $hasDepositAccess,
            'access_granted' => $accessGranted,
            'has_image' => ! empty($validated['fingerprint_image_base64']),
        ]);

        $event = BiometricEvent::create([
            'biometric_device_id' => $device->id,
            'user_id' => $userId,
            'deposit_id' => $depositId,
            'event_type' => $validated['event_type'],
            'fingerprint_uid' => $validated['fingerprint_uid'] ?? null,
            'fingerprint_image_path' => $imagePath,
            'access_granted' => $accessGranted,
            'match_score' => $validated['match_score'] ?? null,
            'payload' => $validated['payload'] ?? null,
            'occurred_at' => $occurredAt,
        ]);

        if ($device->purpose === 'attendance' && $userId) {
            $this->syncAttendanceFromBiometricEvent($userId, $validated['event_type'], $occurredAt);
        }

        $device->update(['last_seen_at' => now()]);

        Log::info('Biometric sensor event stored', [
            'event_id' => $event->id,
            'device_code' => $device->code,
            'event_type' => $event->event_type,
            'user_id' => $event->user_id,
            'access_granted' => $event->access_granted,
        ]);

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

    private function resolveActiveDevice(int $deviceId): BiometricDevice
    {
        $device = BiometricDevice::query()
            ->whereKey($deviceId)
            ->where('is_active', true)
            ->first();

        if (! $device) {
            throw new HttpResponseException(response()->json(['message' => 'Device is inactive or missing'], 422));
        }

        if (blank($device->service_url)) {
            throw new HttpResponseException(response()->json([
                'message' => 'Device service URL is not configured. Edit the device and set service URL first.',
            ], 422));
        }

        return $device;
    }

    private function persistEnrollResult(User $user, BiometricDevice $device, array $payload, array $validated): array
    {
        $position = $payload['position'] ?? null;
        if ($position === null) {
            throw new HttpResponseException(response()->json([
                'message' => 'Device did not return a fingerprint position',
            ], 422));
        }

        $fingerprintUid = (string) $position;

        $template = BiometricTemplate::updateOrCreate(
            [
                'user_id' => $user->id,
                'biometric_device_id' => $device->id,
                'fingerprint_uid' => $fingerprintUid,
            ],
            [
                'finger_index' => $validated['finger_index'] ?? null,
                'label' => $validated['label'] ?? null,
                'is_active' => true,
            ]
        );

        $this->syncTemplateToSharedSensorDevices($user, $device, $fingerprintUid, $validated);

        $imagePath = $this->storeFingerprintImage(
            $payload['fingerprint_image_base64'] ?? null,
            $payload['fingerprint_image_mime'] ?? null
        );

        BiometricEvent::create([
            'biometric_device_id' => $device->id,
            'user_id' => $user->id,
            'deposit_id' => $device->deposit_id,
            'event_type' => 'enroll',
            'fingerprint_uid' => $fingerprintUid,
            'fingerprint_image_path' => $imagePath,
            'access_granted' => true,
            'match_score' => $payload['accuracy_score'] ?? null,
            'payload' => $payload,
            'occurred_at' => now(),
        ]);

        return [
            'template' => $template->load('device', 'user'),
            'fingerprint_uid' => $fingerprintUid,
            'fingerprint_image_url' => $imagePath ? asset('storage/' . $imagePath) : null,
            'status' => 'enrolled',
        ];
    }

    private function sanitizePayloadForLog(array $payload): array
    {
        if (! empty($payload['fingerprint_image_base64'])) {
            $payload['fingerprint_image_base64'] = '[omitted base64: '
                . strlen((string) $payload['fingerprint_image_base64'])
                . ' chars]';
        }

        return $payload;
    }

    private function logDeviceServiceResponse(
        string $action,
        BiometricDevice $device,
        array $payload,
        array $context = [],
    ): void {
        Log::info('Biometric device service response', array_merge([
            'action' => $action,
            'device_id' => $device->id,
            'device_code' => $device->code,
            'service_url' => $device->service_url,
            'payload' => $this->sanitizePayloadForLog($payload),
        ], $context));
    }

    private function normalizeServiceUrl(?string $serviceUrl): ?string
    {
        if (blank($serviceUrl)) {
            return null;
        }

        return rtrim((string) $serviceUrl, '/');
    }

    private function peerDevicesForSharedSensor(BiometricDevice $device)
    {
        $normalizedUrl = $this->normalizeServiceUrl($device->service_url);
        if ($normalizedUrl === null) {
            return collect();
        }

        return BiometricDevice::query()
            ->where('is_active', true)
            ->where('id', '!=', $device->id)
            ->whereNotNull('service_url')
            ->get()
            ->filter(
                fn (BiometricDevice $peer) => $this->normalizeServiceUrl($peer->service_url) === $normalizedUrl
            )
            ->values();
    }

    private function resolveUserIdFromFingerprint(BiometricDevice $device, string $fingerprintUid): ?int
    {
        $userId = BiometricTemplate::query()
            ->where('biometric_device_id', $device->id)
            ->where('fingerprint_uid', $fingerprintUid)
            ->where('is_active', true)
            ->value('user_id');

        if ($userId) {
            return (int) $userId;
        }

        $peerDeviceIds = $this->peerDevicesForSharedSensor($device)->pluck('id');
        if ($peerDeviceIds->isEmpty()) {
            return null;
        }

        $matchedUserIds = BiometricTemplate::query()
            ->whereIn('biometric_device_id', $peerDeviceIds)
            ->where('fingerprint_uid', $fingerprintUid)
            ->where('is_active', true)
            ->pluck('user_id')
            ->unique()
            ->values();

        if ($matchedUserIds->count() === 1) {
            return (int) $matchedUserIds->first();
        }

        return null;
    }

    private function syncTemplateToSharedSensorDevices(
        User $user,
        BiometricDevice $device,
        string $fingerprintUid,
        array $validated,
    ): void {
        foreach ($this->peerDevicesForSharedSensor($device) as $peerDevice) {
            BiometricTemplate::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'biometric_device_id' => $peerDevice->id,
                    'fingerprint_uid' => $fingerprintUid,
                ],
                [
                    'finger_index' => $validated['finger_index'] ?? null,
                    'label' => $validated['label'] ?? null,
                    'is_active' => true,
                ]
            );
        }
    }

    private function ensureCanManageUsers(Request $request): void
    {
        if (! $request->user() || ! $request->user()->can('edit users')) {
            throw new HttpResponseException(response()->json(['message' => 'Unauthorized'], 403));
        }
    }

    private function storeFingerprintImage(?string $base64Image, ?string $mime): ?string
    {
        if (blank($base64Image)) {
            return null;
        }

        $decodedImage = base64_decode($base64Image, true);
        if ($decodedImage === false) {
            throw new HttpResponseException(
                response()->json(['message' => 'Invalid fingerprint image payload'], 422)
            );
        }

        $resolvedMime = $mime ?? 'image/png';
        $extension = match ($resolvedMime) {
            'image/jpeg' => 'jpg',
            'image/webp' => 'webp',
            default => 'png',
        };

        $imagePath = 'biometric-scans/' . now()->format('Y/m/d') . '/' . Str::uuid() . '.' . $extension;
        Storage::disk('public')->put($imagePath, $decodedImage);

        return $imagePath;
    }

    private function syncAttendanceFromBiometricEvent(int $userId, string $eventType, Carbon $occurredAt): void
    {
        $user = User::query()->with('employee')->find($userId);
        if (! $user || ! $user->employee) {
            return;
        }

        $attendance = Attendance::query()->firstOrCreate(
            [
                'employee_id' => $user->employee->id,
                'date' => $occurredAt->toDateString(),
            ],
            [
                'status' => 'present',
            ]
        );

        $normalizedType = strtolower($eventType);
        $isExplicitClockIn = in_array($normalizedType, ['check_in', 'clock_in', 'entry'], true);
        $isExplicitClockOut = in_array($normalizedType, ['check_out', 'clock_out', 'exit'], true);

        if ($isExplicitClockIn || (! $isExplicitClockOut && ! $attendance->clock_in)) {
            $attendance->clock_in = $occurredAt;
        } elseif ($attendance->clock_in && ! $attendance->clock_out) {
            $attendance->clock_out = $occurredAt;
        } elseif ($isExplicitClockOut) {
            $attendance->clock_out = $occurredAt;
        }

        if ($attendance->clock_in && $attendance->clock_out && $attendance->clock_out->greaterThan($attendance->clock_in)) {
            $minutes = $attendance->clock_in->diffInMinutes($attendance->clock_out);
            $hours = round($minutes / 60, 2);
            $attendance->total_hours = $hours;
            $attendance->overtime_hours = max(0, round($hours - 8, 2));
        }

        $attendance->status = 'present';
        $attendance->save();
    }
}
