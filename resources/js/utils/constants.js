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

export const LEAVE_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
};

export const LEAVE_STATUS_LABELS = {
    [LEAVE_STATUS.PENDING]: 'Pending',
    [LEAVE_STATUS.APPROVED]: 'Approved',
    [LEAVE_STATUS.REJECTED]: 'Rejected',
    [LEAVE_STATUS.CANCELLED]: 'Cancelled',
};

export const LEAVE_STATUS_COLORS = {
    [LEAVE_STATUS.PENDING]: 'yellow',
    [LEAVE_STATUS.APPROVED]: 'green',
    [LEAVE_STATUS.REJECTED]: 'red',
    [LEAVE_STATUS.CANCELLED]: 'gray',
};

export const ATTENDANCE_STATUS = {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late',
    HALF_DAY: 'half_day',
    ON_LEAVE: 'on_leave',
};

export const ATTENDANCE_STATUS_LABELS = {
    [ATTENDANCE_STATUS.PRESENT]: 'Present',
    [ATTENDANCE_STATUS.ABSENT]: 'Absent',
    [ATTENDANCE_STATUS.LATE]: 'Late',
    [ATTENDANCE_STATUS.HALF_DAY]: 'Half Day',
    [ATTENDANCE_STATUS.ON_LEAVE]: 'On Leave',
};

export const PAYROLL_STATUS = {
    DRAFT: 'draft',
    PROCESSED: 'processed',
    PAID: 'paid',
    CANCELLED: 'cancelled',
};

export const PAYROLL_STATUS_LABELS = {
    [PAYROLL_STATUS.DRAFT]: 'Draft',
    [PAYROLL_STATUS.PROCESSED]: 'Processed',
    [PAYROLL_STATUS.PAID]: 'Paid',
    [PAYROLL_STATUS.CANCELLED]: 'Cancelled',
};

export const PAYROLL_STATUS_COLORS = {
    [PAYROLL_STATUS.DRAFT]: 'blue',
    [PAYROLL_STATUS.PROCESSED]: 'green',
    [PAYROLL_STATUS.PAID]: 'green',
    [PAYROLL_STATUS.CANCELLED]: 'red',
};

export const SALARY_TYPE = {
    BASE: 'base',
    BONUS: 'bonus',
    DEDUCTION: 'deduction',
    ADJUSTMENT: 'adjustment',
};

export const SALARY_TYPE_LABELS = {
    [SALARY_TYPE.BASE]: 'Base Salary',
    [SALARY_TYPE.BONUS]: 'Bonus',
    [SALARY_TYPE.DEDUCTION]: 'Deduction',
    [SALARY_TYPE.ADJUSTMENT]: 'Adjustment',
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
    EMPLOYEES: '/employees',
    SALARIES: '/salaries',
    LEAVE_TYPES: '/leave-types',
    LEAVES: '/leaves',
    ATTENDANCE: '/attendance',
    PAYROLL_RECORDS: '/payroll-records',
};

export const DEFAULT_PAGE_SIZE = 15;

