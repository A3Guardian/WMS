export const ORDER_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

export const ORDER_STATUS_LABELS = {
    [ORDER_STATUS.PENDING]: 'Pending',
    [ORDER_STATUS.PROCESSING]: 'Processing',
    [ORDER_STATUS.COMPLETED]: 'Completed',
    [ORDER_STATUS.CANCELLED]: 'Cancelled',
};

export const ORDER_STATUS_COLORS = {
    [ORDER_STATUS.PENDING]: 'yellow',
    [ORDER_STATUS.PROCESSING]: 'blue',
    [ORDER_STATUS.COMPLETED]: 'green',
    [ORDER_STATUS.CANCELLED]: 'red',
};

export const TASK_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

export const TASK_STATUS_LABELS = {
    [TASK_STATUS.PENDING]: 'Pending',
    [TASK_STATUS.IN_PROGRESS]: 'In Progress',
    [TASK_STATUS.COMPLETED]: 'Completed',
    [TASK_STATUS.CANCELLED]: 'Cancelled',
};

export const TASK_STATUS_COLORS = {
    [TASK_STATUS.PENDING]: 'yellow',
    [TASK_STATUS.IN_PROGRESS]: 'blue',
    [TASK_STATUS.COMPLETED]: 'green',
    [TASK_STATUS.CANCELLED]: 'red',
};

export const API_ENDPOINTS = {
    LOGIN: '/login',
    LOGOUT: '/logout',
    USER: '/user',
    PRODUCTS: '/products',
    INVENTORY: '/inventory',
    ORDERS: '/orders',
    SUPPLIERS: '/suppliers',
    TASKS: '/tasks',
};

export const DEFAULT_PAGE_SIZE = 15;

