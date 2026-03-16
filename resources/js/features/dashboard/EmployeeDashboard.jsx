import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../utils/api";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import { formatDate } from "../../utils/formatters";
import { TASK_STATUS } from "../../utils/constants";

export default function EmployeeDashboard() {
    const { user } = useAuth();
    const { hasPermission } = usePermissions();

    const { data: tasksData } = useQuery({
        queryKey: ["tasks", "dashboard"],
        queryFn: async () => {
            const res = await api.get("/tasks?per_page=50");
            return res.data;
        },
        enabled: !!user,
    });

    const employeeId = user?.employee_id;
    const canViewLeaves = hasPermission("view leaves");

    const { data: leavesData } = useQuery({
        queryKey: ["leaves", "dashboard", employeeId],
        queryFn: async () => {
            const res = await api.get(
                `/leaves?employee_id=${employeeId}&per_page=10`,
            );
            return res.data;
        },
        enabled: !!user && !!employeeId && canViewLeaves,
    });

    const tasks = tasksData?.data ?? tasksData ?? [];
    const leaves = leavesData?.data ?? leavesData ?? [];

    const pendingTasks = tasks.filter((t) => t.status === TASK_STATUS.PENDING);
    const inProgressTasks = tasks.filter(
        (t) => t.status === TASK_STATUS.IN_PROGRESS,
    );
    const completedTasks = tasks.filter(
        (t) => t.status === TASK_STATUS.COMPLETED,
    );
    const recentCompleted = [...completedTasks]
        .sort(
            (a, b) =>
                new Date(b.completed_at || b.updated_at) -
                new Date(a.completed_at || a.updated_at),
        )
        .slice(0, 5);

    const upcomingLeaves = leaves
        .filter(
            (l) =>
                l.status === "approved" && new Date(l.start_date) >= new Date(),
        )
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
        .slice(0, 5);
    const pendingLeaves = leaves.filter((l) => l.status === "pending");

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Bun venit, {user?.name || "Angajat"}!
                </h1>
                <p className="mt-1 text-gray-600">
                    Iată activitatea ta și rezumatul recent.
                </p>
            </div>

            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    Sarcinile mele
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Link
                        to="/tasks"
                        className="block bg-amber-50 border border-amber-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                    >
                        <p className="text-sm font-medium text-amber-700">
                            În așteptare
                        </p>
                        <p className="mt-1 text-2xl font-bold text-amber-900">
                            {pendingTasks.length}
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                            Vezi task-urile →
                        </p>
                    </Link>
                    <Link
                        to="/tasks"
                        className="block bg-blue-50 border border-blue-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                    >
                        <p className="text-sm font-medium text-blue-700">
                            În desfășurare
                        </p>
                        <p className="mt-1 text-2xl font-bold text-blue-900">
                            {inProgressTasks.length}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                            Vezi task-urile →
                        </p>
                    </Link>
                    <Link
                        to="/tasks"
                        className="block bg-green-50 border border-green-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                    >
                        <p className="text-sm font-medium text-green-700">
                            Finalizate
                        </p>
                        <p className="mt-1 text-2xl font-bold text-green-900">
                            {completedTasks.length}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                            Vezi task-urile →
                        </p>
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Task-uri finalizate recent
                    </h2>
                    <Link
                        to="/tasks"
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                        Toate task-urile →
                    </Link>
                </div>
                {recentCompleted.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                        Nu ai finalizat încă niciun task.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {recentCompleted.map((task) => (
                            <li
                                key={task.id}
                                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                            >
                                <span className="font-medium text-gray-900">
                                    {task.title}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {task.completed_at
                                        ? formatDate(task.completed_at)
                                        : formatDate(task.updated_at)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {canViewLeaves && employeeId && (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Zile libere / Concedii
                        </h2>
                        <Link
                            to="/leaves"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                            Toate concediile →
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                            <p className="text-sm font-medium text-violet-700">
                                În așteptare
                            </p>
                            <p className="text-xl font-bold text-violet-900">
                                {pendingLeaves.length}
                            </p>
                            <p className="text-xs text-violet-600">
                                Cereri de concediu
                            </p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                            <p className="text-sm font-medium text-slate-700">
                                Programate
                            </p>
                            <p className="text-xl font-bold text-slate-900">
                                {upcomingLeaves.length}
                            </p>
                            <p className="text-xs text-slate-600">
                                Concedii aprobate
                            </p>
                        </div>
                    </div>
                    {upcomingLeaves.length > 0 && (
                        <>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                                Următoarele concedii
                            </p>
                            <ul className="space-y-2">
                                {upcomingLeaves.map((leave) => (
                                    <li
                                        key={leave.id}
                                        className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm"
                                    >
                                        <span className="text-gray-900">
                                            {leave.leave_type?.name ??
                                                "Concediu"}{" "}
                                            – {formatDate(leave.start_date)}{" "}
                                            până {formatDate(leave.end_date)}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {leave.days} zile
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                    {upcomingLeaves.length === 0 &&
                        pendingLeaves.length === 0 && (
                            <p className="text-gray-500 text-sm">
                                Nu ai concedii programate sau în așteptare.
                            </p>
                        )}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    Acces rapid
                </h2>
                <div className="flex flex-wrap gap-3">
                    <Link
                        to="/tasks"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                        Sarcinile mele
                    </Link>
                    {canViewLeaves && (
                        <Link
                            to="/leaves"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm font-medium"
                        >
                            Concediile mele
                        </Link>
                    )}
                    <Link
                        to="/profile"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm font-medium"
                    >
                        Profil
                    </Link>
                </div>
            </div>
        </div>
    );
}
