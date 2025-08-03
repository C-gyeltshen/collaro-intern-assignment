import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../../utils/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: orders, error } = await supabase
            .from('orders')
            .select(
                `
                id,
                orderId: id,
                orderDate: order_date,
                totalAmount: total_amount,
                order_items (
                    id,
                    orderItemId: id,
                    itemName: item_name,
                    price,
                    order_item_categories (
                        name
                    ),
                    custom_sizes (
                        id,
                        chest,
                        waist,
                        hips
                    )
                )
                `
            )
            .eq('customer_id', id)
            .order('order_date', { ascending: false });

        if (error) {
            console.error('Supabase error fetching orders:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
        if (!orders) {
            return NextResponse.json({ data: [] }, { status: 200 });
        }

        // Transform the data to match your frontend expectations
        const transformedOrders = orders.map(order => ({
            id: order.id,
            orderId: order.id,
            orderDate: order.orderDate,
            totalAmount: order.totalAmount,
            items: order.order_items?.map(item => ({
                id: item.id,
                orderItemId: item.id,
                itemName: item.itemName,
                category: item.order_item_categories?.name || '',
                price: item.price,
                customSize: {
                    id: item.custom_sizes?.id || '',
                    chest: item.custom_sizes?.chest || 0,
                    waist: item.custom_sizes?.waist || 0,
                    hips: item.custom_sizes?.hips || 0
                }
            })) || []
        }));

        return NextResponse.json({ data: transformedOrders }, { status: 200 });
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}



// Define allowed status values
const ALLOWED_STATUSES = ['active', 'churned', 'prospect'] as const;
type CustomerStatus = typeof ALLOWED_STATUSES[number];

// Use an interface for the request body
interface UpdateCustomerRequest {
  status: CustomerStatus;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Validate customer ID
    if (!id) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    let body: UpdateCustomerRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { status } = body;

    // Validate status
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { 
          error: 'Invalid status. Must be one of: active, churned, prospect',
          allowedValues: ALLOWED_STATUSES 
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Get the new status_id from the customer_statuses lookup table
    const { data: statusData, error: statusError } = await supabase
      .from('customer_statuses')
      .select('id')
      .eq('name', status)
      .single();

    if (statusError) {
      console.error('Error fetching new status ID:', statusError);
      return NextResponse.json(
        { error: 'Failed to find status ID' },
        { status: 500 }
      );
    }
    const newStatusId = statusData.id;

    // 2. Check if customer exists and get their current status_id
    const { data: existingCustomer, error: fetchError } = await supabase
      .from('customers')
      // NOTE: We select status_id and then join to get the status name
      .select(`
        id,
        status_id,
        customer_statuses(name)
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching customer:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch customer' },
        { status: 500 }
      );
    }
    const oldStatusId = existingCustomer.status_id;

    // Check if the status is actually changing
    if (oldStatusId === newStatusId) {
      return NextResponse.json({
        success: true,
        message: `Customer status is already ${status}`,
        data: existingCustomer,
      });
    }

    // 3. Update customer's status_id in Supabase
    // We let the database trigger handle the 'modified_at' timestamp
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({ status_id: newStatusId })
      .eq('id', id)
      .select(`
        id,
        name,
        email,
        revenue,
        order_count,
        last_order_date,
        created_at,
        modified_at,
        customer_statuses(name)
      `)
      .single();

    if (updateError) {
      console.error('Error updating customer:', updateError);
      return NextResponse.json(
        { error: 'Failed to update customer status' },
        { status: 500 }
      );
    }

    // 4. Log the status change
    console.log(`Customer ${id} status updated from ${existingCustomer.customer_statuses.name} to ${status}`);

    // This is a great idea, but the table 'customer_status_history' needs to exist in your database
    /*
    await supabase
      .from('customer_status_history')
      .insert({
        customer_id: id,
        previous_status: existingCustomer.customer_statuses.name,
        new_status: status,
        changed_at: new Date().toISOString(),
      })
      .catch((error) => {
        console.warn('Failed to log status change:', error);
      });
    */
    
    // Return a clean response
    return NextResponse.json({
      success: true,
      message: `Customer status updated to ${status}`,
      data: {
        ...updatedCustomer,
        status: updatedCustomer.customer_statuses.name,
      }
    });

  } catch (error) {
    console.error('Unexpected error in PATCH /api/customers/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}