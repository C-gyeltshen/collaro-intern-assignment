import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../utils/supabase/server';

interface Customer {
  id: string;
  name: string;
  email: string;
  revenue: number;
  order_count: number;
  last_order_date: string;
  customer_statuses: { name: string } | null;
}

interface FormattedCustomer {
  id: string;
  name: string;
  email: string;
  revenue: number;
  order_count: number;
  last_order_date: string;
  status: string | null;
}

interface PaginationMeta {
  total_items: number;
  total_pages: number;
  current_page: number;
  items_per_page: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

interface ApiResponse {
  data: FormattedCustomer[];
  pagination: PaginationMeta;
  applied_filters?: {
    search?: string;
    sort_by: string;
    order: string;
  };
}

const ALLOWED_SORT_FIELDS = [
  'created_at',
  'name', 
  'email', 
  'revenue', 
  'order_count', 
  'last_order_date'
] as const;

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;
const DEFAULT_SORT = 'created_at';
const DEFAULT_ORDER = 'desc';

function validateAndSanitizeParams(searchParams: URLSearchParams) {
  // Validate page (minimum 1)
  const page = Math.max(DEFAULT_PAGE, parseInt(searchParams.get('page') || String(DEFAULT_PAGE), 10));
  
  // Validate limit (between 1 and MAX_LIMIT)
  const limit = Math.min(
    MAX_LIMIT, 
    Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10))
  );
  
  // Validate sort field
  const sortByParam = searchParams.get('sortBy');
  const sortBy = ALLOWED_SORT_FIELDS.includes(sortByParam as any) 
    ? sortByParam 
    : DEFAULT_SORT;
  
  // Validate order
  const orderParam = searchParams.get('order');
  const order = orderParam === 'asc' ? 'asc' : DEFAULT_ORDER;
  
  // Sanitize search query (trim and limit length)
  const searchQuery = searchParams.get('search')?.trim();
  const sanitizedSearch = searchQuery && searchQuery.length <= 100 ? searchQuery : undefined;
  
  return {
    page,
    limit,
    sortBy,
    order: order as 'asc' | 'desc',
    searchQuery: sanitizedSearch,
    startIndex: (page - 1) * limit,
    endIndex: (page - 1) * limit + limit - 1
  };
}

function createErrorResponse(message: string, status: number = 500) {
  console.error(`API Error: ${message}`);
  return NextResponse.json(
    { 
      error: message,
      timestamp: new Date().toISOString()
    }, 
    { status }
  );
}

export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = await createClient();
    
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const {
      page,
      limit,
      sortBy,
      order,
      searchQuery,
      startIndex,
      endIndex
    } = validateAndSanitizeParams(searchParams);

    let query = supabase
      .from('customers')
      .select(
        `
        id,
        name,
        email,
        revenue,
        order_count,
        last_order_date,
        customer_statuses!inner(name)
        `,
        { count: 'exact' }
      );

    // Apply search filter with better performance
    if (searchQuery) {
      // Use text search for better performance on large datasets
      query = query.or(
        `name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
      );
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: order === 'asc' });

    // Apply pagination
    query = query.range(startIndex, endIndex);

    const { data: customers, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return createErrorResponse(`Database query failed: ${error.message}`, 500);
    }

    if (!customers) {
      return createErrorResponse('No data returned from database', 500);
    }

    const formattedCustomers: FormattedCustomer[] = customers.map((customer: Customer) => {
      const { customer_statuses, ...customerData } = customer;
      return {
        ...customerData,
        status: customer_statuses?.name || null,
      };
    });

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit);
    
    const paginationMeta: PaginationMeta = {
      total_items: totalItems,
      total_pages: totalPages,
      current_page: page,
      items_per_page: limit,
      has_next_page: page < totalPages,
      has_prev_page: page > 1,
    };


    const response: ApiResponse = {
      data: formattedCustomers,
      pagination: paginationMeta,
    };

    // Add applied filters info for debugging/frontend use
    if (searchQuery || sortBy !== DEFAULT_SORT || order !== DEFAULT_ORDER) {
      response.applied_filters = {
        ...(searchQuery && { search: searchQuery }),
        sort_by: sortBy,
        order: order,
      };
    }

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    });

  } catch (error) {
    console.error('Unexpected API error:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // Validate required fields
    const { name, email } = body;
    if (!name || !email) {
      return createErrorResponse('Name and email are required', 400);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return createErrorResponse('Invalid email format', 400);
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([{
        name: name.trim(),
        email: email.trim().toLowerCase(),
        revenue: body.revenue || 0,
        order_count: body.order_count || 0,
        last_order_date: body.last_order_date || null,
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { 
        return createErrorResponse('Customer with this email already exists', 409);
      }
      return createErrorResponse(`Failed to create customer: ${error.message}`, 500);
    }

    return NextResponse.json({ data }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating customer:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}