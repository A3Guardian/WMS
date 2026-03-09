import React from "react";

export default function DataTable({ columns, data, loading }) {
    if (loading) {
        return <div className="text-center py-8 text-gray-600">Loading...</div>;
    }

    if (!data || data.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No data available
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
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white shadow-md rounded-lg">
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
                                const accessor = column.accessor || column.key;
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
    );
}
