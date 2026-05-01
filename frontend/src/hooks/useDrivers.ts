import { useState, useEffect } from 'react';
import axiosInstance from '../api/axios';

interface Driver {
  id: string;
  name: string | null;
  email: string;
  isActive: boolean;
}

interface UsersApiResponse {
  data: Driver[];
}

export function useDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axiosInstance
      .get<UsersApiResponse>('/api/users?role=Driver')
      .then((res) => {
        if (!cancelled) setDrivers(res.data.data);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load drivers');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { drivers, loading, error };
}
