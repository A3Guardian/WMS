import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
    User,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    CalendarDays,
    Clock,
    CheckCircle2,
    XCircle,
    DollarSign,
    ClipboardList,
} from "lucide-react";
import api from "../../utils/api";
import PageHeader from "../../components/PageHeader";
import { formatDate } from "../../utils/formatters";

export default function EmployeeView() {
    const { id } = useParams();
    const employeeId = id;
    const { t } = useTranslation();

    const {
        data: employee,
        isLoading: loadingEmployee,
        error: employeeError,
    } = useQuery({
        queryKey: ["employee", employeeId],
        queryFn: async () => {
            const res = await api.get(`/employees/${employeeId}`);
            return res.data;
        },
        enabled: !!employeeId,
    });

    const { data: tasksData } = useQuery({
        queryKey: ["tasks", "by-employee", employeeId],
        queryFn: async () => {
            const params = new URLSearchParams({
                assigned_to: employee?.user_id,
                per_page: "50",
            });
            const res = await api.get(`/tasks?${params.toString()}`);
            return res.data;
        },
        enabled: !!employee?.user_id,
    });

    const { data: attendanceData } = useQuery({
        queryKey: ["attendance", "by-employee", employeeId],
        queryFn: async () => {
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                .toISOString()
                .split("T")[0];
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                .toISOString()
                .split("T")[0];

            const params = new URLSearchParams({
                employee_id: employeeId,
                date_from: monthStart,
                date_to: monthEnd,
                per_page: "100",
            });
            const res = await api.get(`/attendance?${params.toString()}`);
            return res.data;
        },
        enabled: !!employeeId,
    });

    const { data: salaryData } = useQuery({
        queryKey: ["salaries", "by-employee", employeeId],
        queryFn: async () => {
            const params = new URLSearchParams({
                employee_id: employeeId,
                per_page: "24",
            });
            const res = await api.get(`/salaries?${params.toString()}`);
            return res.data;
        },
        enabled: !!employeeId,
    });

    if (employeeError) {
        return (
            <div className="p-4 bg-red-50 text-red-800 rounded">
                {t("employees.errors.loadOneFailed")}: {employeeError.message}
            </div>
        );
    }

    const tasks = tasksData?.data ?? tasksData ?? [];
    const completedTasks = tasks.filter((t) => t.status === "completed");
    const openTasks = tasks.filter(
        (t) => t.status === "pending" || t.status === "in_progress",
    );

    const attendance = attendanceData?.data ?? attendanceData ?? [];
    const totalDaysThisMonth = attendance.filter(
        (a) => a.status === "present" || a.status === "late" || a.status === "half_day",
    ).length;

    const salaryRecords = salaryData?.data ?? salaryData ?? [];
    const latestSalary = salaryRecords[0];

    return (
        <div>
            <PageHeader
                title={
                    employee?.user?.name ||
                    employee?.employee_code ||
                    t("employees.view.title")
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 bg-white shadow-md rounded-lg p-6">
                    {loadingEmployee ? (
                        <div className="text-gray-500">{t("common.loading")}</div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                    <User className="w-6 h-6" />
                                </span>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {employee?.user?.name ||
                                            t("employees.view.profileTitle")}
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        {t("employees.view.code")}:{" "}
                                        {employee?.employee_code || t("common.dash")} ·{" "}
                                        {employee?.department?.name ||
                                            t("employees.view.noDepartment")}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Mail className="w-4 h-4 text-emerald-500 mt-1" />
                                        <div>
                                            <div className="text-xs font-medium text-gray-500">
                                                {t("employees.view.fields.email")}
                                            </div>
                                            <div className="text-sm text-gray-900">
                                                {employee?.user?.email || t("common.dash")}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Phone className="w-4 h-4 text-orange-500 mt-1" />
                                        <div>
                                            <div className="text-xs font-medium text-gray-500">
                                                {t("employees.view.fields.phone")}
                                            </div>
                                            <div className="text-sm text-gray-900">
                                                {employee?.phone || t("common.dash")}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 text-blue-500 mt-1" />
                                        <div>
                                            <div className="text-xs font-medium text-gray-500">
                                                {t("employees.view.fields.address")}
                                            </div>
                                            <div className="text-sm text-gray-900 whitespace-pre-line">
                                                {employee?.address || t("common.dash")}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Briefcase className="w-4 h-4 text-indigo-500 mt-1" />
                                        <div>
                                            <div className="text-xs font-medium text-gray-500">
                                                {t("employees.view.fields.positionDepartment")}
                                            </div>
                                            <div className="text-sm text-gray-900">
                                                {employee?.position || t("common.dash")}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                {employee?.department?.name ||
                                                    t("common.dash")}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <CalendarDays className="w-4 h-4 text-amber-500 mt-1" />
                                        <div>
                                            <div className="text-xs font-medium text-gray-500">
                                                {t("employees.view.fields.hireDate")}
                                            </div>
                                            <div className="text-sm text-gray-900">
                                                {employee?.hire_date
                                                    ? formatDate(employee.hire_date)
                                                    : t("common.dash")}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <ClipboardList className="w-4 h-4 text-purple-500 mt-1" />
                                        <div>
                                            <div className="text-xs font-medium text-gray-500">
                                                {t("employees.view.fields.employmentTypeStatus")}
                                            </div>
                                            <div className="text-sm text-gray-900">
                                                {employee?.employment_type ||
                                                    t("common.dash")}
                                            </div>
                                            <div className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
                                                {t(`employees.status.${employee?.status || "inactive"}`, {
                                                    defaultValue:
                                                        employee?.status || "inactive",
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-gray-900">
                                        {t("employees.view.emergency.title")}
                                    </h3>
                                    <div className="flex items-start gap-3">
                                        <User className="w-4 h-4 text-red-500 mt-1" />
                                        <div>
                                            <div className="text-xs font-medium text-gray-500">
                                                {t("employees.view.emergency.name")}
                                            </div>
                                            <div className="text-sm text-gray-900">
                                                {employee?.emergency_contact_name ||
                                                    t("common.dash")}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Phone className="w-4 h-4 text-red-500 mt-1" />
                                        <div>
                                            <div className="text-xs font-medium text-gray-500">
                                                {t("employees.view.emergency.phone")}
                                            </div>
                                            <div className="text-sm text-gray-900">
                                                {employee?.emergency_contact_phone ||
                                                    t("common.dash")}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-gray-900">
                                        {t("employees.view.linkedUser.title")}
                                    </h3>
                                    {employee?.user ? (
                                        <div className="flex items-start gap-3">
                                            <User className="w-4 h-4 text-green-500 mt-1" />
                                            <div>
                                                <div className="text-xs font-medium text-gray-500">
                                                    {t("employees.view.linkedUser.account")}
                                                </div>
                                                <div className="text-sm text-gray-900">
                                                    {employee.user.name}
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {employee.user.email}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">
                                            {t("employees.view.linkedUser.none")}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="bg-white shadow-md rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                            {t("employees.view.taskOverview.title")}
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-gray-600">
                                    <ClipboardList className="w-4 h-4 text-blue-500" />
                                    {t("employees.view.taskOverview.total")}
                                </span>
                                <span className="font-semibold text-gray-900">
                                    {tasks.length}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-gray-600">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    {t("employees.view.taskOverview.completed")}
                                </span>
                                <span className="font-semibold text-green-700">
                                    {completedTasks.length}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-gray-600">
                                    <Clock className="w-4 h-4 text-amber-500" />
                                    {t("employees.view.taskOverview.open")}
                                </span>
                                <span className="font-semibold text-amber-700">
                                    {openTasks.length}
                                </span>
                            </div>
                        </div>
                        <div className="mt-3">
                            <Link
                                to="/tasks"
                                className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                                {t("employees.view.taskOverview.viewAll")} →
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white shadow-md rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                            {t("employees.view.attendance.title")}
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-gray-600">
                                    <CalendarDays className="w-4 h-4 text-indigo-500" />
                                    {t("employees.view.attendance.presentDays")}
                                </span>
                                <span className="font-semibold text-gray-900">
                                    {totalDaysThisMonth}
                                </span>
                            </div>
                        </div>
                        <div className="mt-3">
                            <Link
                                to="/attendance"
                                className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                                {t("employees.view.attendance.view")} →
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white shadow-md rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                            {t("employees.view.salary.title")}
                        </h3>
                        {latestSalary ? (
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-gray-600">
                                        <DollarSign className="w-4 h-4 text-emerald-500" />
                                        {t("employees.view.salary.currentAmount")}
                                    </span>
                                    <span className="font-semibold text-emerald-700">
                                        {latestSalary.amount}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-gray-600">
                                        <CalendarDays className="w-4 h-4 text-gray-500" />
                                        {t("employees.view.salary.effectiveFrom")}
                                    </span>
                                    <span className="text-gray-900">
                                        {latestSalary.effective_date
                                            ? formatDate(latestSalary.effective_date)
                                            : t("common.dash")}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">
                                {t("employees.view.salary.empty")}
                            </p>
                        )}
                        <div className="mt-3">
                            <Link
                                to="/salaries"
                                className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                                {t("employees.view.salary.viewHistory")} →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    {t("employees.view.recentTasks.title")}
                </h3>
                {tasks.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        {t("employees.view.recentTasks.empty")}
                    </p>
                ) : (
                    <ul className="divide-y divide-gray-100 text-sm">
                        {tasks.slice(0, 8).map((task) => (
                            <li key={task.id} className="py-2 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {task.title}
                                    </p>
                                    {task.due_date && (
                                        <p className="text-xs text-gray-500">
                                            {t("employees.view.recentTasks.due")}:{" "}
                                            {formatDate(task.due_date)}
                                        </p>
                                    )}
                                </div>
                                <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                        task.status === "completed"
                                            ? "bg-green-50 text-green-700"
                                            : task.status === "in_progress"
                                              ? "bg-blue-50 text-blue-700"
                                              : "bg-amber-50 text-amber-700"
                                    }`}
                                >
                                    {t(`tasks.status.${task.status}`, {
                                        defaultValue: task.status,
                                    })}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

