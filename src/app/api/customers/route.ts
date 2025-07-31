// app/api/customer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../utils/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient(); // Initialize Supabase client for server-side

  // 1. Parse Query Parameters
  const { searchParams } = new URL(request.url);

  // Pagination
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  // Sorting
  const sortBy = searchParams.get('sortBy') || 'created_at'; // Default sort by creation date
  const order = searchParams.get('order') || 'desc'; // Default sort order

  // Filtering / Search
  const searchQuery = searchParams.get('search'); // Search term for name or email

  try {
    // 2. Build the Supabase Query
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
        customer_statuses(name)
        `,
        { count: 'exact' } // Request exact count for pagination metadata
      );

    // Apply Filtering / Search
    if (searchQuery) {
      // Supabase supports chaining filters
      query = query.or(
        `name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
      );
    }

    // Apply Sorting
    query = query.order(sortBy, { ascending: order === 'asc' });

    // Apply Pagination
    query = query.range(startIndex, endIndex);

    // 3. Execute the Query
    const { data: customers, error, count } = await query;

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4. Format the Response
    // Map status_id to status_name
    const formattedCustomers = customers.map((customer: any) => ({
      ...customer,
      status: customer.customer_statuses.name, // Extract the status name
      customer_statuses: undefined, // Remove the nested object if not needed in final response
    }));

    return NextResponse.json(
      {
        data: formattedCustomers,
        pagination: {
          total_items: count,
          total_pages: Math.ceil(count / limit),
          current_page: page,
          items_per_page: limit,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}