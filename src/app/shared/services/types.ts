// shared/services/types.ts

// The Custom Size model
export interface CustomSize {
  chest: number; // in inches
  waist: number; // in inches
  hips: number; // in inches
}

// The Order Item model
export interface OrderItem {
  orderItemId: string;
  itemName: string;
  category: string;
  price: number;
  customSize: CustomSize;
}

// The Order model
export interface Order {
  orderId: string;
  orderDate: string; // ISO_8601_date_string
  totalAmount: number;
  items: OrderItem[];
}

// The Customer model (as returned by the API)
export interface Customer {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'churned' | 'prospect';
  revenue: number;
  createdAt: string; // ISO_8601_date_string
  orderCount: number;
  lastOrderDate: string | null; // ISO_8601_date_string or null
}