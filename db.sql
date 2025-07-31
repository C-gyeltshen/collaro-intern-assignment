
-- 1. 'customer_statuses' Table (Lookup Table)
CREATE TABLE customer_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, 
    description TEXT, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed with initial customer statuses
INSERT INTO customer_statuses (name) VALUES
('active'),
('churned'),
('prospect')
ON CONFLICT (name) DO NOTHING; 

-- 2. 'order_item_categories' Table (Lookup Table)
CREATE TABLE order_item_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed with initial order item categories
INSERT INTO order_item_categories (name) VALUES
('Jackets'),
('Trousers'),
('Dresses')
ON CONFLICT (name) DO NOTHING; -- Prevents errors if run multiple times


-- 3. 'customers' Table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    status_id UUID NOT NULL REFERENCES customer_statuses(id) ON DELETE RESTRICT, 
    revenue NUMERIC(10, 2) NOT NULL DEFAULT 0.00, 
    order_count INTEGER NOT NULL DEFAULT 0, 
    last_order_date TIMESTAMPTZ,
    created_at TIMESTamPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for customers table for performance
CREATE INDEX idx_customers_email ON customers (email);
CREATE INDEX idx_customers_status_id ON customers (status_id);


-- 4. 'custom_sizes' Table
CREATE TABLE custom_sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chest NUMERIC(5, 2) NOT NULL, 
    waist NUMERIC(5, 2) NOT NULL,
    hips NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups on measurements
CREATE INDEX idx_custom_sizes_measurements ON custom_sizes (chest, waist, hips);


-- 5. 'orders' Table
-- Stores main order details. Each order belongs to a customer.
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE, 
    order_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for orders table
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_orders_order_date_desc ON orders (order_date DESC);


-- 6. 'order_items' Table
-- Stores individual items within an order. Each item links to its parent order,
-- a specific product category, and a specific custom size.
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE, -- If an order is deleted, all its items are deleted
    item_name TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES order_item_categories(id) ON DELETE RESTRICT, -- Foreign Key to order_item_categories table
    price NUMERIC(10, 2) NOT NULL, -- Price of the individual item
    custom_size_id UUID NOT NULL REFERENCES custom_sizes(id) ON DELETE RESTRICT, -- Foreign Key to custom_sizes table
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for order_items table
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_category_id ON order_items (category_id);
CREATE INDEX idx_order_items_custom_size_id ON order_items (custom_size_id);


-- Optional: PostgreSQL function and triggers to automatically update 'modified_at' timestamp
-- This makes sure the 'modified_at' column automatically reflects the last time a row was updated.
-- Uncomment and run these after all tables are created if you want this functionality.
/*
CREATE OR REPLACE FUNCTION update_modified_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_modified_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE PROCEDURE update_modified_at_column();

CREATE TRIGGER update_customer_statuses_modified_at
BEFORE UPDATE ON customer_statuses
FOR EACH ROW
EXECUTE PROCEDURE update_modified_at_column();

CREATE TRIGGER update_order_item_categories_modified_at
BEFORE UPDATE ON order_item_categories
FOR EACH ROW
EXECUTE PROCEDURE update_modified_at_column();

CREATE TRIGGER update_orders_modified_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE PROCEDURE update_modified_at_column();

CREATE TRIGGER update_custom_sizes_modified_at
BEFORE UPDATE ON custom_sizes
FOR EACH ROW
EXECUTE PROCEDURE update_modified_at_column();

CREATE TRIGGER update_order_items_modified_at
BEFORE UPDATE ON order_items
FOR EACH ROW
EXECUTE PROCEDURE update_modified_at_column();
*/