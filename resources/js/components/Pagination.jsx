import React from 'react';

export default function Pagination({ currentPage, lastPage, onPageChange }) {
    if (!lastPage || lastPage <= 1) {
        return null;
    }

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(lastPage, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 sm:gap-4">
            <div className="text-sm text-gray-700 order-2 sm:order-none text-center sm:text-left">
                Page {currentPage} of {lastPage}
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:space-x-2 sm:gap-0">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-w-[4rem]"
                >
                    Previous
                </button>

                <span className="hidden sm:flex items-center gap-1">
                    {startPage > 1 && (
                        <>
                            <button
                                onClick={() => onPageChange(1)}
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 min-w-[2.5rem]"
                            >
                                1
                            </button>
                            {startPage > 2 && (
                                <span className="px-2 py-2 text-gray-500 text-sm">...</span>
                            )}
                        </>
                    )}

                    {pages.map((page) => (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`px-3 py-2 border rounded-md text-sm font-medium min-w-[2.5rem] ${
                                currentPage === page
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {page}
                        </button>
                    ))}

                    {endPage < lastPage && (
                        <>
                            {endPage < lastPage - 1 && (
                                <span className="px-2 py-2 text-gray-500 text-sm">...</span>
                            )}
                            <button
                                onClick={() => onPageChange(lastPage)}
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 min-w-[2.5rem]"
                            >
                                {lastPage}
                            </button>
                        </>
                    )}
                </span>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === lastPage}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-w-[4rem]"
                >
                    Next
                </button>
            </div>
        </div>
    );
}

