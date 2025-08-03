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

export const updateOrderItemCustomSize = async ({
  orderId,
  itemId,
  customSize,
}: {
  orderId: string;
  itemId: string;
  customSize: { chest: number; waist: number; hips: number };
}) => {
  try {
    console.log('Service - updateOrderItemCustomSize called with:', {
      orderId,
      itemId,
      customSize,
    });

    // Make HTTP PATCH request to update the custom size
    const response = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customSize: {
          chest: customSize.chest,
          waist: customSize.waist,
          hips: customSize.hips,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log('Service - HTTP response result:', result);

    return {
      success: true,
      data: {
        orderId,
        itemId,
        customSize: result.customSize || customSize,
      },
    };
  } catch (error) {
    console.error('Service - Error updating custom size:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update custom size',
      data: null,
    };
  }
};


