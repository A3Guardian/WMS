import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Users, Briefcase } from "lucide-react";
import api from "../../utils/api";
import PageHeader from "../../components/PageHeader";

export default function DepartmentView() {
    const { id } = useParams();
    const departmentId = id;
    const { t } = useTranslation();

    const {
        data: department,
        isLoading: loadingDepartment,
        error: departmentError,
    } = useQuery({
        queryKey: ["department", departmentId],
        queryFn: async () => {
            const res = await api.get(`/departments/${departmentId}`);
            return res.data;
        },
        enabled: !!departmentId,
    });

    const {
        data: employeesData,
        isLoading: loadingEmployees,
        error: employeesError,
    } = useQuery({
        queryKey: ["employees", "by-department", departmentId],
        queryFn: async () => {
            const params = new URLSearchParams({
                department_id: departmentId,
                per_page: "100",
            });
            const res = await api.get(`/employees?${params.toString()}`);
            return res.data;
        },
        enabled: !!departmentId,
    });

    if (departmentError) {
        return (
            <div className="p-4 bg-red-50 text-red-800 rounded">
                {t("departments.errors.loadOneFailed")}: {departmentError.message}
            </div>
        );
    }

    const employees = employeesData?.data ?? employeesData ?? [];

    return (
        <div>
            <PageHeader title={department?.name || t("departments.view.title")} />

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                {loadingDepartment ? (
                    <div className="text-gray-500">{t("common.loading")}</div>
                ) : (
                    <div className="flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                            <Briefcase className="w-5 h-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                {department?.name}
                            </h2>
                            {department?.description && (
                                <p className="mt-1 text-sm text-gray-600">
                                    {department.description}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white shadow-md rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        {t("departments.view.teamMembers")}
                    </h3>
                    <span className="text-xs text-gray-500">
                        {t("departments.view.employeesCount", {
                            count: employees.length,
                        })}
                    </span>
                </div>

                {employeesError ? (
                    <div className="p-3 bg-red-50 text-red-700 rounded text-sm">
                        {t("departments.view.loadEmployeesFailed")}
                    </div>
                ) : loadingEmployees ? (
                    <div className="text-gray-500 text-sm">
                        {t("common.loading")}
                    </div>
                ) : employees.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        {t("departments.view.emptyEmployees")}
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {employees.map((emp) => (
                            <Link
                                key={emp.id}
                                to={`/employees/${emp.id}`}
                                className="block border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-shadow transition-colors"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-sm font-semibold">
                                        {emp.user?.name
                                            ?.split(" ")
                                            .map((n) => n[0])
                                            .join("") || emp.employee_code?.[0] || "E"}
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {emp.user?.name || emp.employee_code}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {emp.position ||
                                                t("departments.view.noPosition")}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                    {emp.user?.email || emp.employee_code}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

