import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_STATUS } from '../../utils/constants';
import api from '../../utils/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../auth/useAuth';

export default function EmployeeTaskView() {
    const { user } = useAuth();
    const { data, loading, error, refetch } = useFetch('tasks', '/tasks');
    const queryClient = useQueryClient();
    const [updatingStatus, setUpdatingStatus] = useState(null);

    const updateStatusMutation = useMutation({
        mutationFn: async ({ taskId, status }) => {
            await api.put(`/tasks/${taskId}`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task status updated successfully');
        },
        onError: (error) => {
            toast.error('Failed to update task status', {
                description: error.response?.data?.message || 'An error occurred',
            });
        },
        onSettled: (data, error, variables) => {
            setUpdatingStatus(null);
        },
    });

    const handleStatusChange = async (taskId, newStatus) => {
        setUpdatingStatus(taskId);
        updateStatusMutation.mutate({ taskId, status: newStatus });
    };

    const getStatusBadge = (status) => {
        const color = TASK_STATUS_COLORS[status] || 'gray';
        const label = TASK_STATUS_LABELS[status] || status;
        
        const colorClasses = {
            yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            blue: 'bg-blue-100 text-blue-800 border-blue-300',
            green: 'bg-green-100 text-green-800 border-green-300',
            red: 'bg-red-100 text-red-800 border-red-300',
            gray: 'bg-gray-100 text-gray-800 border-gray-300',
        };

        return (
            <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${colorClasses[color]}`}>
                {label}
            </span>
        );
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return '';
        if (imagePath.startsWith('http')) {
            return imagePath;
        }
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        if (imagePath.startsWith('/storage/') || imagePath.startsWith('storage/')) {
            const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
            return `${apiUrl}${cleanPath}`;
        }
        return `${apiUrl}/storage/${imagePath}`;
    };

    if (error) {
        const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
        const isPermissionError = error?.response?.status === 403;
        
        return (
            <div className={`p-4 rounded ${isPermissionError ? 'bg-yellow-50 text-yellow-800' : 'bg-red-50 text-red-800'}`}>
                <p className="font-semibold">
                    {isPermissionError ? 'Permission Denied' : 'Error'}
                </p>
                <p>{errorMessage}</p>
            </div>
        );
    }

    const tasks = data?.data || [];
    const pendingTasks = tasks.filter(t => t.status === TASK_STATUS.PENDING);
    const inProgressTasks = tasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS);
    const completedTasks = tasks.filter(t => t.status === TASK_STATUS.COMPLETED);
    
    const isOverdue = (dueDate) => {
        if (!dueDate) return false;
        const due = new Date(dueDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return due < today;
    };
    
    const overdueTasks = tasks.filter(t => {
        return isOverdue(t.due_date) && t.status !== TASK_STATUS.COMPLETED;
    });

    const TaskCard = ({ task }) => {
        const taskIsOverdue = isOverdue(task.due_date) && task.status !== TASK_STATUS.COMPLETED;
        
        return (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-2">
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 break-words">{task.title}</h3>
                    {task.description && (
                        <p className="text-sm sm:text-base text-gray-600 mb-3 line-clamp-2 break-words">{task.description}</p>
                    )}
                </div>
                <div className="flex-shrink-0">
                    {getStatusBadge(task.status)}
                </div>
            </div>

            <div className="space-y-2 mb-4">
                {task.assigned_by && (
                    <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Assigned by: {task.assigned_by.name}
                    </div>
                )}
                {task.order && (
                    <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Order: <Link to="/orders" className="text-blue-600 hover:underline ml-1">{task.order.order_number}</Link>
                    </div>
                )}
                {task.due_date && (
                    <div className={`flex items-center text-sm ${taskIsOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="break-words">Due: {formatDate(task.due_date)}</span>
                        {taskIsOverdue && <span className="ml-1">(Overdue)</span>}
                    </div>
                )}
                {task.created_at && (
                    <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Created: {formatDate(task.created_at)}
                    </div>
                )}
            </div>

            {task.images && task.images.length > 0 && (
                <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Images:</p>
                    <div className="grid grid-cols-3 gap-2">
                        {task.images.slice(0, 3).map((imagePath, index) => {
                            const imageUrl = getImageUrl(imagePath);
                            return (
                                <div key={index} className="relative aspect-square">
                                    <img
                                        src={imageUrl}
                                        alt={`Task image ${index + 1}`}
                                        className="w-full h-full object-cover rounded border"
                                        onError={(e) => {
                                            console.error('Image failed to load:', imageUrl, 'Path:', imagePath);
                                            e.target.style.display = 'none';
                                            const fallback = e.target.nextElementSibling;
                                            if (fallback) {
                                                fallback.classList.remove('hidden');
                                            }
                                        }}
                                        onLoad={() => {
                                            console.log('Image loaded successfully:', imageUrl);
                                        }}
                                    />
                                    <div className="hidden w-full h-full bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-500">
                                        Image {index + 1}
                                    </div>
                                </div>
                            );
                        })}
                        {task.images.length > 3 && (
                            <div className="w-full aspect-square bg-gray-100 rounded border flex items-center justify-center text-xs sm:text-sm text-gray-600">
                                +{task.images.length - 3}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-4 border-t gap-3">
                <Link
                    to={`/tasks/${task.id}/edit`}
                    className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-center"
                >
                    View Details
                </Link>
                <div className="flex flex-col sm:flex-row gap-2">
                    {task.status === TASK_STATUS.PENDING && (
                        <button
                            onClick={() => handleStatusChange(task.id, TASK_STATUS.IN_PROGRESS)}
                            disabled={updatingStatus === task.id}
                            className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
                        >
                            {updatingStatus === task.id ? 'Updating...' : 'Start Task'}
                        </button>
                    )}
                    {task.status === TASK_STATUS.IN_PROGRESS && (
                        <button
                            onClick={() => handleStatusChange(task.id, TASK_STATUS.COMPLETED)}
                            disabled={updatingStatus === task.id}
                            className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
                        >
                            {updatingStatus === task.id ? 'Updating...' : 'Complete'}
                        </button>
                    )}
                    {(task.status === TASK_STATUS.IN_PROGRESS || task.status === TASK_STATUS.PENDING) && (
                        <button
                            onClick={() => handleStatusChange(task.id, task.status === TASK_STATUS.IN_PROGRESS ? TASK_STATUS.PENDING : task.status)}
                            disabled={updatingStatus === task.id}
                            className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
                        >
                            {updatingStatus === task.id ? 'Updating...' : task.status === TASK_STATUS.IN_PROGRESS ? 'Pause' : 'Reset'}
                        </button>
                    )}
                </div>
            </div>
        </div>
        );
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading tasks...</p>
            </div>
        );
    }

    return (
        <div className="px-2 sm:px-0">
            <div className="mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Tasks</h1>
                <p className="text-sm sm:text-base text-gray-600">Welcome back, {user?.name || 'Employee'}</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm text-yellow-600 font-medium truncate">Pending</p>
                            <p className="text-xl sm:text-2xl font-bold text-yellow-900">{pendingTasks.length}</p>
                        </div>
                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                            <svg className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm text-blue-600 font-medium truncate">In Progress</p>
                            <p className="text-xl sm:text-2xl font-bold text-blue-900">{inProgressTasks.length}</p>
                        </div>
                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                            <svg className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm text-green-600 font-medium truncate">Completed</p>
                            <p className="text-xl sm:text-2xl font-bold text-green-900">{completedTasks.length}</p>
                        </div>
                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                            <svg className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm text-red-600 font-medium truncate">Overdue</p>
                            <p className="text-xl sm:text-2xl font-bold text-red-900">{overdueTasks.length}</p>
                        </div>
                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                            <svg className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {overdueTasks.length > 0 && (
                <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-red-600">Overdue Tasks</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {overdueTasks.map((task) => (
                            <TaskCard key={task.id} task={task} />
                        ))}
                    </div>
                </div>
            )}

            {pendingTasks.length > 0 && (
                <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Pending Tasks</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {pendingTasks.map((task) => (
                            <TaskCard key={task.id} task={task} />
                        ))}
                    </div>
                </div>
            )}

            {inProgressTasks.length > 0 && (
                <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">In Progress</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {inProgressTasks.map((task) => (
                            <TaskCard key={task.id} task={task} />
                        ))}
                    </div>
                </div>
            )}

            {completedTasks.length > 0 && (
                <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Completed Tasks</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {completedTasks.map((task) => (
                            <TaskCard key={task.id} task={task} />
                        ))}
                    </div>
                </div>
            )}

            {tasks.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-600 text-lg">No tasks assigned to you yet</p>
                    <p className="text-gray-500 text-sm mt-2">Check back later for new tasks</p>
                </div>
            )}
        </div>
    );
}

