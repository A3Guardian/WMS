<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Storage;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('view tasks')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $query = Task::with(['assignedBy', 'assignedTo', 'order']);

        if ($request->user()->hasRole('Employee')) {
            $query->where('assigned_to', $request->user()->id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        if ($request->has('order_id')) {
            $query->where('order_id', $request->order_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', '%' . $search . '%')
                  ->orWhere('description', 'like', '%' . $search . '%');
            });
        }

        $perPage = $request->per_page ?? 15;
        $perPage = min(max((int)$perPage, 1), 100);

        return response()->json($query->orderBy('created_at', 'desc')->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('create tasks')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        $validated = $request->validate([
            'assigned_to' => 'required|exists:users,id',
            'order_id' => 'nullable|exists:orders,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:pending,in_progress,completed,cancelled',
            'images' => 'nullable|array',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'due_date' => 'nullable|date',
        ]);

        $imagePaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('tasks', 'public');
                $imagePaths[] = $path;
            }
        }

        $task = Task::create([
            'assigned_by' => $request->user()->id,
            'assigned_to' => $validated['assigned_to'],
            'order_id' => $validated['order_id'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'pending',
            'images' => !empty($imagePaths) ? $imagePaths : null,
            'due_date' => isset($validated['due_date']) ? $validated['due_date'] : null,
        ]);

        ActivityLogService::logCreated($task, [
            'title' => $task->title,
            'assigned_to' => $task->assigned_to,
            'order_id' => $task->order_id,
            'status' => $task->status,
        ]);

        return response()->json($task->load(['assignedBy', 'assignedTo', 'order']), 201);
    }

    public function show(Request $request, Task $task): JsonResponse
    {
        if (!$request->user()->can('view tasks')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        if ($request->user()->hasRole('Employee') && $task->assigned_to !== $request->user()->id) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        return response()->json($task->load(['assignedBy', 'assignedTo', 'order']));
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        if ($request->user()->hasRole('Employee') && $task->assigned_to !== $request->user()->id) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        if ($request->user()->hasRole('Employee')) {
            $validated = $request->validate([
                'status' => 'sometimes|in:pending,in_progress,completed,cancelled',
                'description' => 'sometimes|nullable|string',
            ]);

            if (isset($validated['status']) && $validated['status'] === 'completed') {
                $task->completed_at = now();
            }

            if (isset($validated['status']) && $validated['status'] !== 'completed' && $task->completed_at) {
                $task->completed_at = null;
            }
        } else {
            if (!$request->user()->can('edit tasks')) {
                throw new HttpResponseException(
                    response()->json(['message' => 'Unauthorized'], 403)
                );
            }

            $validated = $request->validate([
                'assigned_to' => 'sometimes|exists:users,id',
                'order_id' => 'sometimes|nullable|exists:orders,id',
                'title' => 'sometimes|string|max:255',
                'description' => 'sometimes|nullable|string',
                'status' => 'sometimes|in:pending,in_progress,completed,cancelled',
                'images' => 'sometimes|nullable|array',
                'images.*' => 'image|mimes:jpeg,png,jpg,gif,svg|max:2048',
                'due_date' => 'sometimes|nullable|date',
            ]);

            if (isset($validated['status']) && $validated['status'] === 'completed' && !$task->completed_at) {
                $task->completed_at = now();
            }

            if (isset($validated['status']) && $validated['status'] !== 'completed' && $task->completed_at) {
                $task->completed_at = null;
            }
        }

        $oldValues = $task->only(array_keys($validated));

        if ($request->hasFile('images')) {
            if ($task->images) {
                foreach ($task->images as $oldImage) {
                    if (Storage::disk('public')->exists($oldImage)) {
                        Storage::disk('public')->delete($oldImage);
                    }
                }
            }

            $imagePaths = [];
            foreach ($request->file('images') as $image) {
                $path = $image->store('tasks', 'public');
                $imagePaths[] = $path;
            }
            $validated['images'] = $imagePaths;
        }

        $task->update($validated);

        $newValues = $task->only(array_keys($validated));

        ActivityLogService::logUpdated($task, $oldValues, $newValues);

        return response()->json($task->load(['assignedBy', 'assignedTo', 'order']));
    }

    public function destroy(Request $request, Task $task): JsonResponse
    {
        if (!$request->user()->can('delete tasks')) {
            throw new HttpResponseException(
                response()->json(['message' => 'Unauthorized'], 403)
            );
        }

        if ($task->images) {
            foreach ($task->images as $image) {
                if (Storage::disk('public')->exists($image)) {
                    Storage::disk('public')->delete($image);
                }
            }
        }

        ActivityLogService::logDeleted($task);
        $task->delete();

        return response()->json(['message' => 'Task deleted successfully']);
    }
}

