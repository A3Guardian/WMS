import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

export const useFetch = (queryKey, url, options = {}) => {
    const query = useQuery({
        queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
        queryFn: async () => {
            const response = await api.get(url, options);
            return response.data;
        },
        enabled: !!url,
        retry: (failureCount, error) => {
            if (error?.response?.status === 403 || error?.response?.status === 401) {
                return false;
            }
            return failureCount < 1;
        },
    });

    return {
        data: query.data,
        loading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
};
