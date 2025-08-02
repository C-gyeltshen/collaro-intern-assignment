import { Customer } from './types'; // Import the Customer type

interface CustomerResponse {
  data: Customer[];
  pagination: {
    total_items: number;
    total_pages: number;
    current_page: number;
    items_per_page: number;
  };
}

interface FetchCustomersParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

export const fetchCustomers = async (params: FetchCustomersParams = {}): Promise<CustomerResponse> => {
  const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc', search } = params;

  // Build the query string from the parameters
  const queryString = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    order,
  });

  if (search) {
    queryString.append('search', search);
  }

  try {
    const response = await fetch(`/api/customers?${queryString.toString()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
};