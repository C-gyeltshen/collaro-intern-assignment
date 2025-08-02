import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../../utils/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // `params` is a Promise
) {
    // FIX: Await the params object before accessing its properties
    const { id } = await params;
    
    const supabase = await createClient();

    try {
        // FIX: Correct the column names in the select statement to snake_case
        // We can use aliases to return the data with camelCase for the frontend
        const { data: orders, error } = await supabase
            .from('orders')
            .select(
                `
                orderId: order_id,
                orderDate: order_date,
                totalAmount: total_amount,
                items: order_items (
                    orderItemId: order_item_id,
                    itemName: item_name,
                    category,
                    price,
                    customSize: custom_sizes (
                        chest,
                        waist,
                        hips
                    )
                )
                `
            )
            .eq('customer_id', id);

        if (error) {
            console.error('Supabase error fetching orders:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
        if (!orders) {
            return NextResponse.json({ data: [] }, { status: 200 });
        }

        return NextResponse.json({ data: orders }, { status: 200 });
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}