import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PageHeader({ title, actions = null, showBack = true }) {
    const navigate = useNavigate();

    return (
        <div className="flex justify-between items-center mb-6 gap-4">
            <div className="flex items-center ml-2 gap-3 min-w-0">
                {showBack && (
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-3 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <h1 className="text-3xl font-bold truncate">{title}</h1>
            </div>
            {actions}
        </div>
    );
}
