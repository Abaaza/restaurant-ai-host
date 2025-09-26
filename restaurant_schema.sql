-- Restaurant AI Host Database Schema
-- For Supabase PostgreSQL

-- Drop existing tables if they exist
DROP TABLE IF EXISTS reservation_logs CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS waitlist CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS restaurant_settings CASCADE;
DROP TABLE IF EXISTS call_logs CASCADE;

-- Restaurant settings and configuration
CREATE TABLE restaurant_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tables in the restaurant
CREATE TABLE tables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_number VARCHAR(20) UNIQUE NOT NULL,
    capacity INTEGER NOT NULL,
    location VARCHAR(50), -- e.g., 'main', 'patio', 'private', 'bar'
    status VARCHAR(50) DEFAULT 'available', -- available, occupied, reserved, cleaning
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guest information
CREATE TABLE guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255),
    preferences JSONB, -- dietary restrictions, favorite dishes, etc.
    visit_count INTEGER DEFAULT 0,
    vip_status BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reservations
CREATE TABLE reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guest_id UUID REFERENCES guests(id),
    guest_name VARCHAR(200) NOT NULL, -- For walk-ins or quick bookings
    guest_phone VARCHAR(20),
    guest_email VARCHAR(255),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    party_size INTEGER NOT NULL,
    table_id UUID REFERENCES tables(id),
    status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, arrived, seated, completed, cancelled, no-show
    special_requests TEXT,
    dietary_restrictions TEXT,
    occasion VARCHAR(100), -- birthday, anniversary, business, date, etc.
    confirmation_sent BOOLEAN DEFAULT false,
    reminder_sent BOOLEAN DEFAULT false,
    source VARCHAR(50) DEFAULT 'ai-host', -- ai-host, phone, walk-in, online
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waitlist for busy times
CREATE TABLE waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guest_name VARCHAR(200) NOT NULL,
    guest_phone VARCHAR(20) NOT NULL,
    party_size INTEGER NOT NULL,
    preferred_time TIMESTAMPTZ,
    time_range_start TIME,
    time_range_end TIME,
    status VARCHAR(50) DEFAULT 'waiting', -- waiting, contacted, seated, expired
    notes TEXT,
    estimated_wait_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items (for answering questions)
CREATE TABLE menu_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- appetizer, main, dessert, beverage, etc.
    price DECIMAL(10, 2),
    dietary_info JSONB, -- vegetarian, vegan, gluten-free, etc.
    allergens TEXT[],
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    preparation_time_minutes INTEGER,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call logs for AI interactions
CREATE TABLE call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id VARCHAR(255), -- ElevenLabs call ID
    call_type VARCHAR(50), -- inbound, outbound
    phone_number VARCHAR(20),
    duration_seconds INTEGER,
    outcome VARCHAR(100),
    transcript TEXT,
    agent_notes TEXT,
    reservation_id UUID REFERENCES reservations(id),
    guest_id UUID REFERENCES guests(id),
    cost_cents INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reservation activity logs
CREATE TABLE reservation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reservation_id UUID REFERENCES reservations(id),
    action VARCHAR(100), -- created, modified, cancelled, completed, etc.
    details JSONB,
    performed_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_guest ON reservations(guest_id);
CREATE INDEX idx_tables_status ON tables(status);
CREATE INDEX idx_waitlist_status ON waitlist(status);
CREATE INDEX idx_guests_phone ON guests(phone);
CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_call_logs_reservation ON call_logs(reservation_id);

-- Insert default restaurant settings
INSERT INTO restaurant_settings (setting_key, setting_value) VALUES
('restaurant_info', '{
    "name": "The Golden Fork",
    "address": "123 Main Street, Downtown, NY 10001",
    "phone": "+1 (555) 123-4567",
    "email": "info@goldenfork.com",
    "website": "https://goldenfork.com"
}'::jsonb),
('business_hours', '{
    "monday": {"open": "11:00", "close": "22:00"},
    "tuesday": {"open": "11:00", "close": "22:00"},
    "wednesday": {"open": "11:00", "close": "22:00"},
    "thursday": {"open": "11:00", "close": "22:00"},
    "friday": {"open": "11:00", "close": "23:00"},
    "saturday": {"open": "11:00", "close": "23:00"},
    "sunday": {"open": "11:00", "close": "21:00"}
}'::jsonb),
('reservation_settings', '{
    "min_party_size": 1,
    "max_party_size": 12,
    "default_duration_minutes": 90,
    "advance_booking_days": 30,
    "cancellation_hours": 2,
    "time_slot_interval_minutes": 15
}'::jsonb),
('ai_agent_settings', '{
    "greeting": "Thank you for calling The Golden Fork. How may I assist you today?",
    "languages": ["English", "Spanish"],
    "voice_id": "restaurant_host_voice",
    "personality": "professional, warm, helpful"
}'::jsonb);

-- Insert sample tables
INSERT INTO tables (table_number, capacity, location, status) VALUES
('T1', 2, 'main', 'available'),
('T2', 2, 'main', 'available'),
('T3', 4, 'main', 'available'),
('T4', 4, 'main', 'available'),
('T5', 4, 'main', 'available'),
('T6', 6, 'main', 'available'),
('T7', 6, 'main', 'available'),
('T8', 8, 'main', 'available'),
('B1', 4, 'bar', 'available'),
('B2', 4, 'bar', 'available'),
('P1', 4, 'patio', 'available'),
('P2', 4, 'patio', 'available'),
('P3', 6, 'patio', 'available'),
('VIP1', 12, 'private', 'available');

-- Insert sample menu items
INSERT INTO menu_items (name, description, category, price, dietary_info, is_available) VALUES
('Caesar Salad', 'Fresh romaine lettuce with parmesan and croutons', 'appetizer', 12.00, '{"vegetarian": true}'::jsonb, true),
('Tomato Soup', 'Creamy tomato soup with basil', 'appetizer', 9.00, '{"vegetarian": true, "gluten_free": true}'::jsonb, true),
('Grilled Salmon', 'Atlantic salmon with seasonal vegetables', 'main', 28.00, '{"gluten_free": true}'::jsonb, true),
('Ribeye Steak', '12oz ribeye with mashed potatoes', 'main', 42.00, '{"gluten_free": true}'::jsonb, true),
('Chicken Parmesan', 'Breaded chicken with marinara and mozzarella', 'main', 24.00, '{}', true),
('Vegetable Pasta', 'Fresh pasta with seasonal vegetables', 'main', 18.00, '{"vegetarian": true}'::jsonb, true),
('Chocolate Lava Cake', 'Warm chocolate cake with vanilla ice cream', 'dessert', 10.00, '{"vegetarian": true}'::jsonb, true),
('Tiramisu', 'Classic Italian dessert', 'dessert', 9.00, '{"vegetarian": true}'::jsonb, true);

-- Create functions for common operations
CREATE OR REPLACE FUNCTION check_table_availability(
    p_date DATE,
    p_time TIME,
    p_party_size INTEGER
) RETURNS TABLE (
    table_id UUID,
    table_number VARCHAR,
    capacity INTEGER,
    location VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.table_number, t.capacity, t.location
    FROM tables t
    WHERE t.is_active = true
      AND t.capacity >= p_party_size
      AND NOT EXISTS (
          SELECT 1
          FROM reservations r
          WHERE r.table_id = t.id
            AND r.reservation_date = p_date
            AND r.status NOT IN ('cancelled', 'no-show')
            AND (
                (r.reservation_time <= p_time AND
                 r.reservation_time + INTERVAL '90 minutes' > p_time)
                OR
                (p_time <= r.reservation_time AND
                 p_time + INTERVAL '90 minutes' > r.reservation_time)
            )
      )
    ORDER BY t.capacity ASC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Create view for today's reservations
CREATE OR REPLACE VIEW today_reservations AS
SELECT
    r.*,
    t.table_number,
    t.location,
    g.vip_status,
    g.preferences
FROM reservations r
LEFT JOIN tables t ON r.table_id = t.id
LEFT JOIN guests g ON r.guest_id = g.id
WHERE r.reservation_date = CURRENT_DATE
  AND r.status NOT IN ('cancelled', 'no-show')
ORDER BY r.reservation_time;