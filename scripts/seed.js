require('dotenv').config({ path: './.env.local' }); // Load environment variables from .env

const { createClient } = require('@supabase/supabase-js');
const { faker } = require('@faker-js/faker');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Error: Supabase URL or Anon Key are not set in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const NUM_CUSTOMERS = 100; 
const MAX_ORDERS_PER_CUSTOMER = 5; 
const MAX_ITEMS_PER_ORDER = 3;


// Generates a random future or past date within a range
const getRandomDate = (startOffsetDays = -365, endOffsetDays = 0) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + startOffsetDays); 

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + endOffsetDays); 

    return faker.date.between({ from: startDate, to: endDate });
};

async function getLookupTableIds(tableName) {
    const { data, error } = await supabase.from(tableName).select('id, name');
    if (error) {
        console.error(`Error fetching IDs from ${tableName}:`, error);
        return null;
    }
    return data.reduce((acc, item) => {
        acc[item.name] = item.id;
        return acc;
    }, {});
}

async function generateAndInsertCustomSize() {
    const customSize = {
        chest: faker.number.float({ min: 30, max: 60, precision: 0.5 }), 
        waist: faker.number.float({ min: 25, max: 50, precision: 0.5 }),
        hips: faker.number.float({ min: 30, max: 60, precision: 0.5 }),
    };
    const { data, error } = await supabase.from('custom_sizes').insert(customSize).select().single();
    if (error) {
        console.error('Error inserting custom size:', error);
        throw error;
    }
    return data;
}

// --- Main Seeding Function ---
async function seedDatabase() {
    console.log('Starting database seeding...');

    // 0. Fetch Lookup Table IDs
    const customerStatusIds = await getLookupTableIds('customer_statuses');
    const itemCategoryIds = await getLookupTableIds('order_item_categories');

    if (!customerStatusIds || !itemCategoryIds) {
        console.error('Failed to fetch required lookup table IDs. Exiting.');
        return;
    }

    const statuses = Object.values(customerStatusIds);
    const categories = Object.values(itemCategoryIds);

    // 1. Generate Customers
    console.log(`Generating ${NUM_CUSTOMERS} customers...`);
    const customersToInsert = [];
    for (let i = 0; i < NUM_CUSTOMERS; i++) {
        const statusName = faker.helpers.arrayElement(['prospect', 'active', 'churned']);
        customersToInsert.push({
            name: faker.person.fullName(),
            email: faker.internet.email(),
            status_id: customerStatusIds[statusName],
            created_at: getRandomDate(-730, -30), // Customers created between 2 years ago and 1 month ago
            modified_at: new Date(),
        });
    }
    const { data: insertedCustomers, error: customersError } = await supabase.from('customers').insert(customersToInsert).select();
    if (customersError) {
        console.error('Error inserting customers:', customersError);
        return;
    }
    console.log(`Inserted ${insertedCustomers.length} customers.`);

    // 2. Generate Orders and Order Items for each customer
    for (const customer of insertedCustomers) {
        const numOrders = faker.number.int({ min: 0, max: MAX_ORDERS_PER_CUSTOMER }); // Some customers might have 0 orders
        let customerTotalRevenue = 0;
        let customerOrderCount = 0;
        let customerLastOrderDate = null;

        const ordersToInsert = [];
        const orderItemsToInsert = []; 
        const customSizesToInsert = []; 

        for (let i = 0; i < numOrders; i++) {
            const orderDate = getRandomDate(-365, 0); // Orders from past year
            const orderTotalAmount = 0; // Will be summed from order items later

            const newOrder = {
                customer_id: customer.id,
                order_date: orderDate.toISOString(),
                total_amount: orderTotalAmount, // Placeholder, will update later
                created_at: orderDate.toISOString(),
                modified_at: orderDate.toISOString(),
            };
            ordersToInsert.push(newOrder);

            const { data: insertedOrder, error: orderError } = await supabase.from('orders').insert(newOrder).select().single();
            if (orderError) {
                console.error('Error inserting order:', orderError);
                continue; // Skip to next order if this one fails
            }
            customerOrderCount++;
            if (!customerLastOrderDate || new Date(orderDate) > new Date(customerLastOrderDate)) {
                customerLastOrderDate = orderDate;
            }

            const numItems = faker.number.int({ min: 1, max: MAX_ITEMS_PER_ORDER });
            let currentOrderItemsTotal = 0;

            for (let j = 0; j < numItems; j++) {
                const customSize = await generateAndInsertCustomSize(); // Insert custom size first
                currentOrderItemsTotal += customSize.price || 0; 

                const itemPrice = faker.number.int({ min: 100, max: 1000 }); // Price for this specific item
                currentOrderItemsTotal += itemPrice; // Add item's price to current order's total

                orderItemsToInsert.push({
                    order_id: insertedOrder.id,
                    item_name: faker.commerce.productName(),
                    category_id: faker.helpers.arrayElement(categories),
                    price: itemPrice, // This item's price
                    custom_size_id: customSize.id,
                    created_at: insertedOrder.created_at, // Use order's creation date for consistency
                    modified_at: insertedOrder.modified_at,
                });
            }

            // Update the order's total_amount after all its items are generated
            const { error: updateOrderError } = await supabase
                .from('orders')
                .update({ total_amount: currentOrderItemsTotal })
                .eq('id', insertedOrder.id);
            if (updateOrderError) {
                console.error(`Error updating total_amount for order ${insertedOrder.id}:`, updateOrderError);
            }
            customerTotalRevenue += currentOrderItemsTotal; // Add to customer's total revenue

            // Batch insert all order items for this order
            const { error: orderItemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
            if (orderItemsError) {
                console.error('Error inserting order items:', orderItemsError);
            }
            orderItemsToInsert.length = 0; // Clear for next order
        }

        // Update customer's calculated fields after all their orders are processed
        const { error: customerUpdateError } = await supabase
            .from('customers')
            .update({
                revenue: customerTotalRevenue,
                order_count: customerOrderCount,
                last_order_date: customerLastOrderDate ? customerLastOrderDate.toISOString() : null,
            })
            .eq('id', customer.id);
        if (customerUpdateError) {
            console.error(`Error updating customer ${customer.id} summary fields:`, customerUpdateError);
        }

        console.log(`Processed orders for customer ${customer.id} (${customer.name}).`);
    }

    console.log('Database seeding complete!');
}

// --- Run the Seeding Script ---
seedDatabase().catch(console.error);