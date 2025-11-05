/**
 * Format currency
 */
export const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
};

/**
 * Format date in Romanian timezone
 */
export const formatDate = (date, options = {}) => {
    if (!date) return '-';
    
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'Europe/Bucharest',
    };
    
    return new Date(date).toLocaleDateString('ro-RO', { ...defaultOptions, ...options });
};

/**
 * Format date and time in Romanian timezone
 */
export const formatDateTime = (date) => {
    if (!date) return '-';
    
    return new Date(date).toLocaleString('ro-RO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Bucharest',
    });
};

/**
 * Truncate text
 */
export const truncate = (text, length = 50) => {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
};

