// Order statuses
export const ORDER_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

// Order status labels
export const ORDER_STATUS_LABELS = {
    [ORDER_STATUS.PENDING]: 'Pending',
    [ORDER_STATUS.PROCESSING]: 'Processing',
    [ORDER_STATUS.COMPLETED]: 'Completed',
    [ORDER_STATUS.CANCELLED]: 'Cancelled',
};

// Order status colors
export const ORDER_STATUS_COLORS = {
    [ORDER_STATUS.PENDING]: 'yellow',
    [ORDER_STATUS.PROCESSING]: 'blue',
    [ORDER_STATUS.COMPLETED]: 'green',
    [ORDER_STATUS.CANCELLED]: 'red',
};

// API endpoints
export const API_ENDPOINTS = {
    LOGIN: '/login',
    LOGOUT: '/logout',
    USER: '/user',
    PRODUCTS: '/products',
    INVENTORY: '/inventory',
    ORDERS: '/orders',
    SUPPLIERS: '/suppliers',
};

// Pagination
export const DEFAULT_PAGE_SIZE = 15;

