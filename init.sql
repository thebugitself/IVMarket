-- ============================================================
-- IVM - ID-NETWORKERS VULNERABLE MARKETPLACE
-- DATABASE SCHEMA FOR SECURITY TRAINING / PENETRATION TESTING
-- ============================================================

CREATE DATABASE IF NOT EXISTS marketplace;
USE marketplace;

-- ============================================================
-- TABLE DEFINITIONS
-- ============================================================

-- Users: No unique constraints on username/email, weak password storage
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    password VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    full_name VARCHAR(100),
    address TEXT,
    phone VARCHAR(20),
    avatar VARCHAR(255) DEFAULT '/uploads/default-avatar.png',
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Products
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(200),
    description TEXT,
    price DECIMAL(10,2),
    image VARCHAR(255) DEFAULT '/uploads/default-product.png',
    category VARCHAR(50),
    stock INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Orders: total_price stored from client request (price tampering)
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    product_id INT,
    quantity INT DEFAULT 1,
    total_price DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending',
    shipping_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Wallets: One per user, no transaction log
CREATE TABLE wallets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    balance DECIMAL(10,2) DEFAULT 1000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Reviews: Stores raw HTML (Stored XSS)
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    product_id INT,
    rating INT,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- System Logs
CREATE TABLE logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Discount Code Usages (race condition vulnerable — no unique constraint, check-then-insert gap)
CREATE TABLE discount_usages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    discount_code VARCHAR(50),
    product_id INT,
    discount_percent DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Messages (for future expansion)
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_user_id INT,
    to_user_id INT,
    subject VARCHAR(200),
    body TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Users
-- admin    / admin123    → MD5 = 0192023a7bbd73250516f069df18b500
-- john_doe / password123 → MD5 = 482c811da5d5b4bc6d497ffa98491e38
-- jane_smith / password123
-- bob_wilson / password123
INSERT INTO users (username, email, password, role, full_name, address, phone, bio) VALUES
('admin',      'admin@marketplace.lab', '0192023a7bbd73250516f069df18b500', 'admin', 'System Administrator', '123 Admin Street, Server Room',       '555-0000', 'Platform administrator with full system access.'),
('john_doe',   'john@example.com',      '482c811da5d5b4bc6d497ffa98491e38', 'user',  'John Doe',             '456 Oak Avenue, Springfield',          '555-0001', 'Regular marketplace user who loves gadgets.'),
('jane_smith', 'jane@example.com',      '482c811da5d5b4bc6d497ffa98491e38', 'user',  'Jane Smith',           '789 Pine Road, Shelbyville',           '555-0002', 'Tech enthusiast and seller.'),
('bob_wilson', 'bob@example.com',       '482c811da5d5b4bc6d497ffa98491e38', 'user',  'Bob Wilson',           '321 Elm Street, Capital City',         '555-0003', 'Vintage electronics collector.');

-- Wallets
INSERT INTO wallets (user_id, balance) VALUES
(1, 99999.00),
(2, 1500.00),
(3, 2500.00),
(4, 800.00);

-- Products
INSERT INTO products (user_id, name, description, price, category, stock, image) VALUES
(1,  'Laptop Gaming',          'High-performance gaming laptop with 16GB RAM and 512GB SSD. Perfect for gaming and development.',   1299.99, 'Electronics',  15, '/uploads/laptop-gaming.jpg'),
(2,  'Wireless Headphone',     'Noise-cancelling wireless headphones with 30-hour battery life.',                                   199.99,  'Electronics',  50, '/uploads/wireless-headphone.jpg'),
(3,  'Vintage Camera',         'Classic film camera from the 1970s. Fully functional and in great condition.',                      349.99,  'Collectibles',  3, '/uploads/vintage-camera.jpg'),
(3,  'Smart Watch',            'Latest generation smartwatch with health monitoring and GPS tracking.',                             499.99,  'Electronics',  25, '/uploads/smart-watch.jpg'),
(2,  'Mechanical Keyboard',    'RGB mechanical keyboard with Cherry MX Blue switches. Clicky perfection.',                          149.99,  'Electronics',  40, '/uploads/mechanical-keyboard.jpg');

-- Reviews (includes a stored XSS payload in review #6)
INSERT INTO reviews (user_id, product_id, rating, comment) VALUES
(2, 1, 5, 'Excellent laptop! Fast and reliable. Highly recommended for developers.'),
(3, 1, 4, 'Great performance but a bit heavy for travel. Solid build quality.'),
(4, 2, 5, 'Best headphones I have ever owned. The noise cancellation is incredible.'),
(2, 3, 4, 'Beautiful camera. Takes gorgeous photos on real film.'),
(4, 5, 5, 'The mechanical keyboard is a dream to type on. Click clack all day!'),
(2, 4, 5, 'Amazing smartwatch, love the health features!');

-- Orders
INSERT INTO orders (user_id, product_id, quantity, total_price, status, shipping_address) VALUES
(2, 1, 1, 1299.99, 'delivered', '456 Oak Avenue, Springfield'),
(3, 2, 2,  399.98, 'shipped',   '789 Pine Road, Shelbyville'),
(4, 5, 1,  149.99, 'pending',   '321 Elm Street, Capital City');

-- System Logs
INSERT INTO logs (action, details, ip_address) VALUES
('system_start',    'Marketplace application initialized successfully.',    '127.0.0.1'),
('user_login',      'Admin user logged in from console.',                  '127.0.0.1'),
('product_created', 'New product added: Laptop Gaming',                    '192.168.1.10'),
('system_info',     'Running on Node.js with Express – debug mode ON.',   '127.0.0.1');
