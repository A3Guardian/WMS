import { useAuth } from '../features/auth/useAuth';

export function usePermissions() {
    const { user } = useAuth();

    const hasPermission = (permission) => {
        if (!user || !permission) return false;
        if (!Array.isArray(user.permissions)) return false;
        return user.permissions.includes(permission);
    };

    const hasAnyPermission = (permissions) => {
        if (!user || !permissions || !Array.isArray(permissions)) return false;
        if (!Array.isArray(user.permissions)) return false;
        return permissions.some(permission => user.permissions.includes(permission));
    };

    const hasAllPermissions = (permissions) => {
        if (!user || !permissions || !Array.isArray(permissions)) return false;
        if (!Array.isArray(user.permissions)) return false;
        if (permissions.length === 0) return true;
        return permissions.every(permission => user.permissions.includes(permission));
    };

    const hasRole = (role) => {
        if (!user || !role) return false;
        if (!Array.isArray(user.roles)) return false;
        return user.roles.includes(role);
    };

    const hasAnyRole = (roles) => {
        if (!user || !roles || !Array.isArray(roles)) return false;
        if (!Array.isArray(user.roles)) return false;
        return roles.some(role => user.roles.includes(role));
    };

    const isAdmin = () => {
        return hasRole('Admin') || hasRole('admin');
    };

    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        hasAnyRole,
        isAdmin,
        permissions: Array.isArray(user?.permissions) ? user.permissions : [],
        roles: Array.isArray(user?.roles) ? user.roles : [],
    };
}

