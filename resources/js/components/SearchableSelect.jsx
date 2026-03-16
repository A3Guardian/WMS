import React, { useState, useEffect, useRef } from "react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../lib/utils";
import { useQuery } from "@tanstack/react-query";

/**
 * Unified select component.
 * - With search: pass fetchOptions (for users, suppliers, employees, deposits, products, etc.)
 * - Without search: pass options array (for items per page, status, etc.)
 * Options format for simple mode: [{ value, label }] or [{ id, name }] — use displayValue to customize label.
 */
export default function SearchableSelect({
    value,
    onChange,
    fetchOptions,
    options: optionsProp,
    searchParam = "search",
    placeholder = "Select...",
    displayValue,
    emptyMessage = "No results found.",
    className,
    disabled = false,
    cacheKey,
}) {
    const isRemote = typeof fetchOptions === "function";
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLabel, setSelectedLabel] = useState("");
    const debounceTimeoutRef = useRef(null);
    const selectIdRef = useRef(React.useId());
    const uniqueCacheKey = cacheKey || selectIdRef.current;

    const getLabel = (option) => {
        if (option == null) return "";
        if (typeof option === "string") return option;
        if (displayValue) return displayValue(option);
        return (
            option.label ??
            option.name ??
            option.email ??
            `${option.id ?? option.value}`
        );
    };

    const getValue = (option) => {
        if (option == null) return "";
        if (typeof option === "string") return option;
        return option.value ?? option.id;
    };

    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        if (!open || !isRemote) return;
        if (debounceTimeoutRef.current)
            clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = setTimeout(
            () => setDebouncedSearch(searchQuery),
            searchQuery ? 300 : 0,
        );
        return () => {
            if (debounceTimeoutRef.current)
                clearTimeout(debounceTimeoutRef.current);
        };
    }, [searchQuery, open, isRemote]);

    const queryKey = React.useMemo(
        () => ["searchable-select", uniqueCacheKey, debouncedSearch],
        [uniqueCacheKey, debouncedSearch],
    );

    const { data, isLoading, error } = useQuery({
        queryKey,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (debouncedSearch) params.append(searchParam, debouncedSearch);
            params.append("per_page", "20");
            const result = await fetchOptions(params.toString());
            if (!result) return { data: [] };
            return result;
        },
        enabled: isRemote && open,
        staleTime: 60000,
        gcTime: 300000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    const { data: selectedData } = useQuery({
        queryKey:
            cacheKey != null && cacheKey !== ""
                ? ["searchable-select-selected", uniqueCacheKey]
                : ["searchable-select-selected", uniqueCacheKey, value],
        queryFn: async () => {
            if (!cacheKey && !value) return null;
            const params = new URLSearchParams();
            params.append("per_page", "100");
            const result = await fetchOptions(params.toString());
            if (cacheKey != null && cacheKey !== "") {
                return result;
            }
            const list = result?.data ?? result ?? [];
            return Array.isArray(list)
                ? list.find((opt) => getValue(opt) === value) ?? null
                : null;
        },
        enabled:
            isRemote &&
            !open &&
            (cacheKey != null && cacheKey !== "" ? true : !!value),
        staleTime: 60000,
        gcTime: 300000,
    });

    const options = React.useMemo(() => {
        if (!isRemote) {
            const list = Array.isArray(optionsProp) ? optionsProp : [];
            return list.map((opt) =>
                typeof opt === "string" ? { value: opt, label: opt } : opt,
            );
        }
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (data?.data && Array.isArray(data.data)) return data.data;
        return [];
    }, [isRemote, optionsProp, data]);

    const selectedOption = React.useMemo(() => {
        const found = options.find((opt) => getValue(opt) == value);
        if (found) return found;
        if (!isRemote) return null;
        if (cacheKey != null && cacheKey !== "" && selectedData) {
            const list = selectedData?.data ?? selectedData;
            if (Array.isArray(list))
                return list.find((opt) => getValue(opt) == value) ?? null;
            return null;
        }
        return selectedData ?? null;
    }, [options, selectedData, value, isRemote, cacheKey]);

    useEffect(() => {
        if (selectedOption) {
            setSelectedLabel(getLabel(selectedOption));
        } else {
            setSelectedLabel("");
        }
    }, [selectedOption]);

    const handleSelect = (option) => {
        const optionValue = getValue(option);
        onChange(optionValue, option);
        setOpen(false);
        setSearchQuery("");
    };

    const triggerLabel = value
        ? selectedLabel ||
          (selectedOption
              ? getLabel(selectedOption)
              : isRemote
                ? "Loading..."
                : "")
        : "";

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        "w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm",
                        "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        "min-h-[38px]",
                        className,
                    )}
                >
                    <span
                        className={cn(
                            "flex-1 truncate text-left",
                            !value && "text-gray-500",
                        )}
                    >
                        {triggerLabel || placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0 max-w-[90vw] sm:max-w-none"
                align="start"
            >
                <Command shouldFilter={false} className="pointer-events-auto">
                    {isRemote && (
                        <CommandInput
                            placeholder="Search..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                        />
                    )}
                    <CommandList className="pointer-events-auto">
                        {isRemote && isLoading ? (
                            <div className="py-6 text-center text-sm text-gray-500">
                                Loading...
                            </div>
                        ) : isRemote && error ? (
                            <div className="py-6 text-center text-sm text-red-500">
                                Error loading options
                            </div>
                        ) : options.length === 0 ? (
                            <CommandEmpty>{emptyMessage}</CommandEmpty>
                        ) : (
                            <CommandGroup className="pointer-events-auto">
                                {options.map((option, index) => {
                                    if (option == null) return null;
                                    const optionValue = getValue(option);
                                    const isSelected = value == optionValue;
                                    const optionLabel = getLabel(option);
                                    const itemValue =
                                        optionValue === ""
                                            ? "__value_empty__"
                                            : String(optionValue);
                                    return (
                                        <CommandItem
                                            key={
                                                optionValue === ""
                                                    ? `empty-${index}`
                                                    : optionValue
                                            }
                                            value={itemValue}
                                            onSelect={() =>
                                                handleSelect(option)
                                            }
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleSelect(option);
                                            }}
                                            onMouseDown={(e) => {
                                                if (e.button === 0) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleSelect(option);
                                                }
                                            }}
                                            className="!cursor-pointer pointer-events-auto"
                                            style={{ cursor: "pointer" }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4 shrink-0 pointer-events-none",
                                                    isSelected
                                                        ? "opacity-100"
                                                        : "opacity-0",
                                                )}
                                            />
                                            <span className="flex-1 pointer-events-none">
                                                {optionLabel}
                                            </span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
