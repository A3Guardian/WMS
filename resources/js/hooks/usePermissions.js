import { useAuth } from '../features/auth/AuthContext';

export function usePermissions() {
    const { user } = useAuth();

    const hasPermission = (permission) => {
        if (!user) return false;
        return user.permissions?.includes(permission) || false;
    };

    const hasAnyPermission = (permissions) => {
        if (!user) return false;
        return permissions.some(permission => user.permissions?.includes(permission));
    };

    const hasAllPermissions = (permissions) => {
        if (!user) return false;
        return permissions.every(permission => user.permissions?.includes(permission));
    };

    const hasRole = (role) => {
        if (!user) return false;
        return user.roles?.includes(role) || false;
    };

    const isAdmin = () => {
        return hasRole('Admin');
    };

    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        isAdmin,
        permissions: user?.permissions || [],
        roles: user?.roles || [],
    };
}

