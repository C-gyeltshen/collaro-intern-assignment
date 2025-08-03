export interface UpdateCustomSizeRequest {
  orderId: string;
  itemId: string;
  customSize: {
    chest: number;
    waist: number;
    hips: number;
  };
}

export interface UpdateCustomSizeResponse {
  success: boolean;
  data?: {
    orderId: string;
    itemId: string;
    customSize: {
      chest: number;
      waist: number;
      hips: number;
    };
    updatedAt: string;
  };
  error?: string;
}


export const fetchCustomerOrders = async (customerId: string): Promise<OrdersResponse> => {
  try {
    const response = await fetch(`/api/customers/${customerId}/orders`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    throw error;
  }
};


export const fetchOrdersByCustomerId = async (customerId: string): Promise<OrderType[]> => {
  const response = await fetch(`/api/customers/${customerId}/orders`);
  if (!response.ok) {
    throw new Error('Failed to fetch orders');
  }
  const data = await response.json();
  return data.data;
};


export const updateCustomerStatus = async (
  id: string,
  newStatus: 'active' | 'churned' | 'prospect'
) => {
  const response = await fetch(`/api/customers/${id}/orders`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update customer status: ${response.status}`);
  }

  return response.json();
};

export const updateOrderItemCustomSize = async (
  request: UpdateCustomSizeRequest
): Promise<UpdateCustomSizeResponse> => {
  try {
    console.log('=== SERVICE FUNCTION CALLED ===');
    console.log('Service - Making request with:', request);
    
    const url = `/api/orders/${request.orderId}/items/${request.itemId}`;
    console.log('Service - Making request to URL:', url);
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customSize: request.customSize,
        updatedAt: new Date().toISOString(),
      }),
    });

    console.log('Service - Response status:', response.status);
    console.log('Service - Response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Service - Error response:', errorData);
      throw new Error(errorData.error || `Failed to update custom size: ${response.status}`);
    }

    const result = await response.json();
    console.log('Service - Success response:', result);
    
    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error('=== SERVICE ERROR ===', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update custom size',
    };
  }
};



