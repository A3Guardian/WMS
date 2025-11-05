import React, { useState, useEffect, useRef } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../utils/api';
import { useQuery } from '@tanstack/react-query';

export default function SearchableSelect({
    value,
    onChange,
    fetchOptions,
    searchParam = 'search',
    placeholder = 'Select...',
    displayValue,
    emptyMessage = 'No results found.',
    className,
    disabled = false,
    cacheKey,
}) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLabel, setSelectedLabel] = useState('');
    const debounceTimeoutRef = useRef(null);
    const selectIdRef = useRef(React.useId());
    const uniqueCacheKey = cacheKey || selectIdRef.current;

    const getLabel = (option) => {
        if (typeof option === 'string') return option;
        if (displayValue) return displayValue(option);
        return option.label || option.name || option.email || `${option.id}`;
    };

    const getValue = (option) => {
        if (typeof option === 'string') return option;
        return option.value || option.id;
    };

    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        if (!open) {
            return;
        }

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, searchQuery ? 300 : 0);

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [searchQuery, open]);

    const queryKey = React.useMemo(() => ['searchable-select', uniqueCacheKey, debouncedSearch], [uniqueCacheKey, debouncedSearch]);

    const { data, isLoading, error } = useQuery({
        queryKey,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (debouncedSearch) {
                params.append(searchParam, debouncedSearch);
            }
            params.append('per_page', '20');
            const result = await fetchOptions(params.toString());
            if (!result) {
                return { data: [] };
            }
            return result;
        },
        enabled: open,
        staleTime: 60000,
        gcTime: 300000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    const { data: selectedData } = useQuery({
        queryKey: ['searchable-select-selected', uniqueCacheKey, value],
        queryFn: async () => {
            if (!value) return null;
            const params = new URLSearchParams();
            params.append('per_page', '100');
            const result = await fetchOptions(params.toString());
            const options = result?.data || [];
            return options.find(opt => {
                const optValue = getValue(opt);
                return optValue === value;
            });
        },
        enabled: !!value && !open,
        staleTime: 5000,
    });

    const options = React.useMemo(() => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (data?.data && Array.isArray(data.data)) return data.data;
        return [];
    }, [data]);

    const selectedOption = React.useMemo(() => {
        return options.find(opt => {
            const optValue = getValue(opt);
            return optValue === value;
        }) || selectedData;
    }, [options, selectedData, value]);

    useEffect(() => {
        if (selectedOption) {
            setSelectedLabel(getLabel(selectedOption));
        } else if (value) {
            setSelectedLabel('Loading...');
        } else {
            setSelectedLabel('');
        }
    }, [selectedOption, value, displayValue]);

    useEffect(() => {
        if (!open) {
            setSearchQuery('');
            setDebouncedSearch('');
        }
    }, [open]);

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
                        className
                    )}
                >
                    <span className={cn("flex-1 truncate text-left", !value && "text-gray-500")}>
                        {value ? (selectedLabel || (selectedOption ? getLabel(selectedOption) : 'Loading...')) : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 max-w-[90vw] sm:max-w-none" align="start">
                <Command shouldFilter={false} className="pointer-events-auto">
                    <CommandInput
                        placeholder="Search..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList className="pointer-events-auto">
                        {isLoading ? (
                            <div className="py-6 text-center text-sm text-gray-500">Loading...</div>
                        ) : error ? (
                            <div className="py-6 text-center text-sm text-red-500">Error loading options</div>
                        ) : (
                            <>
                                {options.length === 0 ? (
                                    <CommandEmpty>{emptyMessage}</CommandEmpty>
                                ) : (
                                    <CommandGroup className="pointer-events-auto">
                                        {options.map((option) => {
                                            if (!option) return null;
                                            const optionValue = getValue(option);
                                            const isSelected = value === optionValue;
                                            const optionLabel = getLabel(option);
                                            
                                            const handleSelect = () => {
                                                onChange(optionValue);
                                                setOpen(false);
                                                setSearchQuery('');
                                            };
                                            
                                            return (
                                                <CommandItem
                                                    key={optionValue}
                                                    value={String(optionValue)}
                                                    onSelect={(selectedValue) => {
                                                        if (String(selectedValue) === String(optionValue)) {
                                                            handleSelect();
                                                        }
                                                    }}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleSelect();
                                                    }}
                                                    onMouseDown={(e) => {
                                                        if (e.button === 0) {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleSelect();
                                                        }
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.cursor = 'pointer';
                                                    }}
                                                    className="!cursor-pointer pointer-events-auto"
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4 shrink-0 pointer-events-none",
                                                            isSelected ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <span className="flex-1 pointer-events-none">{optionLabel}</span>
                                                </CommandItem>
                                            );
                                        })}
                                    </CommandGroup>
                                )}
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

