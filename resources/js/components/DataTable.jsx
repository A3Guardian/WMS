import React from "react";
import SearchableSelect from "./SearchableSelect";
import Pagination from "./Pagination";

const PER_PAGE_OPTIONS = [10, 20, 50, 100].map((n) => ({
    value: n,
    label: String(n),
}));
const TOOLBAR_CLASSES = "px-4 sm:px-6 py-3 sm:py-4 bg-gray-100 border-b border-gray-200";
const FOOTER_CLASSES = "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200";

export default function DataTable({
    columns,
    data,
    loading,
    perPage,
    onPerPageChange,
    pagination,
    searchValue = "",
    onSearchChange,
    searchPlaceholder,
    totalRecordName = "",
}) {
    const effectivePerPage = perPage ?? pagination?.perPage;
    const effectiveOnPerPageChange =
        onPerPageChange ?? pagination?.onPerPageChange;
    const showPerPageSelector =
        effectivePerPage != null &&
        typeof effectiveOnPerPageChange === "function";
    const showSearch =
        searchPlaceholder != null ||
        (onSearchChange != null && searchValue !== undefined);
    const showToolbar = showPerPageSelector || showSearch;

    const handlePerPageChange = (newPerPage) => {
        effectiveOnPerPageChange(newPerPage);
    };

    const renderToolbar = () => {
        if (!showToolbar) return null;
        return (
            <div
                className={`${TOOLBAR_CLASSES} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4`}
            >
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {showPerPageSelector && (
                        <>
                            <label
                                htmlFor="perPage"
                                className="text-sm font-medium text-gray-700 shrink-0"
                            >
                                Items per page:
                            </label>
                            <SearchableSelect
                                id="perPage"
                                value={effectivePerPage}
                                onChange={(v) => handlePerPageChange(Number(v))}
                                options={PER_PAGE_OPTIONS}
                                placeholder="Items per page"
                                className="min-w-[100px] sm:w-auto"
                            />
                        </>
                    )}
                </div>
                {showSearch && (
                    <div className="w-full sm:w-auto sm:min-w-[200px]">
                        <input
                            type="text"
                            placeholder={searchPlaceholder || "Search..."}
                            value={searchValue}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        />
                    </div>
                )}
            </div>
        );
    };

    const showFooter =
        pagination &&
        (pagination.currentPage != null || pagination.total != null);
    const total = pagination?.total ?? (data?.length ?? 0);
    const currentPage = pagination?.currentPage ?? 1;
    const lastPage = pagination?.lastPage ?? 1;
    const effectivePerPageForFooter =
        effectivePerPage ?? pagination?.perPage ?? 10;
    const from =
        total === 0 ? 0 : (currentPage - 1) * effectivePerPageForFooter + 1;
    const to = Math.min(currentPage * effectivePerPageForFooter, total);
    const recordLabel = totalRecordName ? ` ${totalRecordName}` : "";

    const renderFooter = () => {
        if (!showFooter) return null;
        return (
            <div className={FOOTER_CLASSES}>
                <div className="text-sm text-gray-700 text-center sm:text-left">
                    Showing {from} to {to} of {total}
                    {recordLabel}
                </div>
                {(lastPage ?? 1) > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        lastPage={lastPage}
                        onPageChange={pagination?.onPageChange ?? (() => {})}
                    />
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div>
                {renderToolbar()}
                <div className="text-center py-8 text-gray-600">Loading...</div>
                {showFooter && renderFooter()}
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div>
                {renderToolbar()}
                <div className="px-6 py-8 text-center text-gray-500">
                    No data available
                </div>
                {showFooter && renderFooter()}
            </div>
        );
    }

    const getNestedValue = (obj, path) => {
        return path.split(".").reduce((current, prop) => current?.[prop], obj);
    };

    const normalizedColumns = columns.map((column, index) => {
        const key = column.key || column.accessor || `col-${index}`;
        const label = column.label || column.header || "";
        const render = column.render || column.cell;
        const align = column.align || "left";
        return {
            key,
            label,
            render,
            align,
            accessor: column.accessor || key,
        };
    });

    const thClass = (align) =>
        `px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${
            align === "right"
                ? "text-right"
                : align === "center"
                  ? "text-center"
                  : "text-left"
        }`;
    const tdClass = (align) =>
        `px-6 py-4 whitespace-nowrap ${
            align === "right"
                ? "text-right"
                : align === "center"
                  ? "text-center"
                  : "text-left"
        }`;

    return (
        <div>
            {renderToolbar()}
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-200">
                        <tr>
                            {normalizedColumns.map((column) => (
                                <th
                                    key={column.key}
                                    className={thClass(column.align)}
                                >
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((row, index) => (
                            <tr
                                key={row.id || row._id || index}
                                className="hover:bg-gray-50"
                            >
                                {normalizedColumns.map((column) => {
                                    const accessor =
                                        column.accessor || column.key;
                                    let value;

                                    if (typeof accessor === "function") {
                                        value = accessor(row);
                                    } else if (typeof accessor === "string") {
                                        value = accessor.includes(".")
                                            ? getNestedValue(row, accessor)
                                            : row[accessor];
                                    } else {
                                        value = row[accessor];
                                    }

                                    return (
                                        <td
                                            key={column.key}
                                            className={tdClass(column.align)}
                                        >
                                            {column.render
                                                ? column.render(value, row)
                                                : (value ?? "-")}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {renderFooter()}
        </div>
    );
}
