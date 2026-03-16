import React from "react";
import * as Dialog from "@radix-ui/react-dialog";

export default function ConfirmDialog({
    open,
    onOpenChange,
    title = "Are you sure?",
    description = "",
    confirmLabel = "Yes",
    cancelLabel = "No",
    onConfirm,
}) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-sm z-50">
                    <Dialog.Title className="text-lg font-semibold mb-2">
                        {title}
                    </Dialog.Title>
                    {description && (
                        <Dialog.Description className="text-sm text-gray-600 mb-4">
                            {description}
                        </Dialog.Description>
                    )}
                    <div className="flex justify-end gap-3 mt-4">
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                            >
                                {cancelLabel}
                            </button>
                        </Dialog.Close>
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                onClick={onConfirm}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                {confirmLabel}
                            </button>
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

