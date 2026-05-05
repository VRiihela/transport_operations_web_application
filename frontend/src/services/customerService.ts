import axiosInstance from '../api/axios';
import { CustomerSearchResult } from '../types/customer';

export const customerService = {
  searchByPhone: async (phone: string): Promise<CustomerSearchResult[]> => {
    try {
      const sanitizedPhone = phone.replace(/\D/g, '');

      if (sanitizedPhone.length < 3) {
        return [];
      }

      const response = await axiosInstance.get<{ data: CustomerSearchResult[] }>('/api/customers', {
        params: { phone: sanitizedPhone },
      });

      return response.data.data ?? [];
    } catch (error) {
      console.error('Customer search error:', error);
      throw new Error('Failed to search customers');
    }
  },
};
