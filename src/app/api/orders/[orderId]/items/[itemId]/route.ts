import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../../../utils/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    // Await params first (Next.js 15 requirement)
    const { orderId, itemId } = await params;
    
    // Create Supabase client inside the request handler
    const supabase = await createClient();
    
    const body = await request.json();
    const { customSize, updatedAt } = body;

    console.log('API Route - Received params:', { orderId, itemId });
    console.log('API Route - Received body:', { customSize, updatedAt });

    // Validate required fields
    if (!customSize || typeof customSize.chest !== 'number' || 
        typeof customSize.waist !== 'number' || typeof customSize.hips !== 'number') {
      return NextResponse.json(
        { error: 'Invalid custom size data. Chest, waist, and hips must be numbers.' },
        { status: 400 }
      );
    }

    // Validate that measurements are positive
    if (customSize.chest <= 0 || customSize.waist <= 0 || customSize.hips <= 0) {
      return NextResponse.json(
        { error: 'Measurements must be positive numbers.' },
        { status: 400 }
      );
    }

    // First, verify that the order item exists and get current custom_size_id
    const { data: orderItem, error: orderItemError } = await supabase
      .from('order_items')
      .select('id, custom_size_id, order_id')
      .eq('id', itemId)
      .eq('order_id', orderId)
      .single();

    if (orderItemError || !orderItem) {
      console.error('Order item not found:', { orderId, itemId, error: orderItemError });
      return NextResponse.json(
        { error: 'Order item not found.' },
        { status: 404 }
      );
    }

    // Check if a custom size with these exact measurements already exists
    const { data: existingCustomSize, error: existingError } = await supabase
      .from('custom_sizes')
      .select('id')
      .eq('chest', customSize.chest)
      .eq('waist', customSize.waist)
      .eq('hips', customSize.hips)
      .single();

    let customSizeId: string;

    if (existingCustomSize && !existingError) {
      // Use existing custom size
      customSizeId = existingCustomSize.id;
      console.log('Using existing custom size:', customSizeId);
    } else {
      // Create new custom size record
      const { data: newCustomSize, error: createError } = await supabase
        .from('custom_sizes')
        .insert({
          chest: customSize.chest,
          waist: customSize.waist,
          hips: customSize.hips,
          modified_at: updatedAt || new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError || !newCustomSize) {
        console.error('Error creating custom size:', createError);
        return NextResponse.json(
          { error: 'Failed to create custom size record.' },
          { status: 500 }
        );
      }

      customSizeId = newCustomSize.id;
      console.log('Created new custom size:', customSizeId);
    }

    // Update the order item with the new custom_size_id
    const { data: updatedOrderItem, error: updateError } = await supabase
      .from('order_items')
      .update({
        custom_size_id: customSizeId,
        modified_at: updatedAt || new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('order_id', orderId)
      .select(`
        id,
        order_id,
        item_name,
        price,
        custom_sizes (
          chest,
          waist,
          hips
        )
      `)
      .single();

    if (updateError || !updatedOrderItem) {
      console.error('Error updating order item:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order item.' },
        { status: 500 }
      );
    }

    // Clean up old custom size if it's not used by other order items
    if (orderItem.custom_size_id && orderItem.custom_size_id !== customSizeId) {
      const { data: otherItems } = await supabase
        .from('order_items')
        .select('id')
        .eq('custom_size_id', orderItem.custom_size_id)
        .limit(1);

      // If no other items use the old custom size, delete it
      if (!otherItems || otherItems.length === 0) {
        await supabase
          .from('custom_sizes')
          .delete()
          .eq('id', orderItem.custom_size_id);
        console.log('Cleaned up old custom size:', orderItem.custom_size_id);
      }
    }

    const responseData = {
      success: true,
      data: {
        orderId: updatedOrderItem.order_id,
        itemId: updatedOrderItem.id,
        itemName: updatedOrderItem.item_name,
        price: updatedOrderItem.price,
        customSize: {
          chest: updatedOrderItem.custom_sizes.chest,
          waist: updatedOrderItem.custom_sizes.waist,
          hips: updatedOrderItem.custom_sizes.hips,
        },
        updatedAt: updatedAt || new Date().toISOString(),
      },
    };

    console.log('API Route - Success response:', responseData);
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error in custom size update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}