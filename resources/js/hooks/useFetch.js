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
    });

    return {
        data: query.data,
        loading: query.isLoading,
        error: query.error?.response?.data?.message || query.error?.message || null,
        refetch: query.refetch,
    };
};
