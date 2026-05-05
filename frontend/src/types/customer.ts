export interface Customer {
  id: string;
  name: string;
  phone: string;
  companyName?: string | null;
  type: 'PRIVATE' | 'BUSINESS';
  email?: string | null;
}

export interface CustomerSearchResult {
  id: string;
  name: string;
  phone: string;
  companyName?: string | null;
  type: 'PRIVATE' | 'BUSINESS';
  email?: string | null;
}
