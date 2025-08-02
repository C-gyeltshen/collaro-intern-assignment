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