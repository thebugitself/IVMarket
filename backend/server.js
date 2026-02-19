const express    = require('express');
const mysql      = require('mysql2/promise');
const jwt        = require('jsonwebtoken');
const multer     = require('multer');
const cors       = require('cors');
const md5        = require('md5');
const cookieParser = require('cookie-parser');
const axios      = require('axios');
const { exec }   = require('child_process');
const fs         = require('fs');
const path       = require('path');

const app  = express();
const PORT = 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
  try {
    const logLine = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} – ${req.ip}\n`;
    fs.appendFileSync(path.join(__dirname, 'logs', 'app.log'), logLine);
  } catch (_) { }
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || 'secret123'; 

let db;

async function connectDB() {
  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    try {
      db = mysql.createPool({
        host:     process.env.DB_HOST     || 'localhost',
        user:     process.env.DB_USER     || 'root',
        password: process.env.DB_PASSWORD || 'rootpassword',
        database: process.env.DB_NAME     || 'marketplace',
        waitForConnections: true,
        connectionLimit: 10,
      });
      await db.query('SELECT 1');
      console.log('[✓] Database connected');
      return;
    } catch (err) {
      console.log(`[…] Waiting for database (${i + 1}/${maxRetries}): ${err.message}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  console.error('[✗] Could not connect to database. Exiting.');
  process.exit(1);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({ storage });

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '24h' }
  );
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
      const secret = header.alg === 'none' ? '' : JWT_SECRET;
      req.user = jwt.verify(token, secret, { algorithms: ['HS256', 'none'] });
      req.authMethod = 'jwt';
      return next();
    } catch (_) { }
  }

  const rememberMe = req.cookies?.remember_me;
  if (rememberMe) {
    try {
      req.user = JSON.parse(Buffer.from(rememberMe, 'base64').toString());
      req.authMethod = 'cookie';
      return next();
    } catch (_) { }
  }

  return res.status(401).json({ error: 'Authentication required' });
}

function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const token = authHeader.split(' ')[1];
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
      const secret = header.alg === 'none' ? '' : JWT_SECRET;
      req.user = jwt.verify(token, secret, { algorithms: ['HS256', 'none'] });
    } catch (_) { }
  }
  next();
}

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashed = md5(password);

    const q = `INSERT INTO users (username, email, password) VALUES ('${username}', '${email}', '${hashed}')`;
    await db.query(q);

    const [rows] = await db.query(`SELECT id FROM users WHERE username = '${username}'`);
    if (rows.length) {
      await db.query(`INSERT INTO wallets (user_id, balance) VALUES (${rows[0].id}, 1000.00)`);
    }

    await db.query(`INSERT INTO logs (action, details, ip_address) VALUES ('user_register', 'New user registered: ${username}', '${req.ip}')`);

    res.json({ success: true, message: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password, remember } = req.body;
    const hashed = md5(password);

    const q = `SELECT * FROM users WHERE username = '${username}' AND password = '${hashed}'`;
    console.log('[LOGIN QUERY]', q);

    const [rows] = await db.query(q);

    if (rows.length > 0) {
      const user  = rows[0];
      const token = generateToken(user);

      res.cookie('session_token', token, {
        httpOnly: false,  
        secure: false,    
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });

      if (remember) {
        const cookiePayload = Buffer.from(JSON.stringify({
          id: user.id, username: user.username, role: user.role
        })).toString('base64');

        res.cookie('remember_me', cookiePayload, {
          httpOnly: false,  
          secure: false,    
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });
      }

      await db.query(`INSERT INTO logs (action, details, ip_address) VALUES ('user_login', 'Login: ${user.username}', '${req.ip}')`);

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          avatar: user.avatar,
        },
      });
    }

    res.status(401).json({ error: 'Invalid credentials' });
  } catch (err) {
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

app.get('/api/user/:id', async (req, res) => {
  try {
    const q = `SELECT id, username, email, role, full_name, address, phone, avatar, bio, created_at FROM users WHERE id = ${req.params.id}`;
    const [rows] = await db.query(q);
    if (rows.length) return res.json(rows[0]);
    res.status(404).json({ error: 'User not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/user/update', verifyToken, async (req, res) => {
  try {
    const userId = req.body.id || req.user.id;

    const allowed = ['username', 'email', 'full_name', 'address', 'phone', 'bio', 'avatar', 'role'];
    const sets = [];
    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        sets.push(`${f} = '${req.body[f]}'`); 
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });

    await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ${userId}`);
    const [updated] = await db.query(`SELECT id, username, email, role, full_name, address, phone, avatar, bio FROM users WHERE id = ${userId}`);

    res.json({ success: true, user: updated[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const response = {
    success: true,
    filename: req.file.filename,
    path: `/uploads/${req.file.filename}`,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  };

  res.json(response);
});

app.get('/api/products', async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT p.*, u.username AS seller FROM products p LEFT JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const q = `SELECT p.*, u.username AS seller FROM products p LEFT JOIN users u ON p.user_id = u.id WHERE p.id = ${req.params.id}`;
    const [rows] = await db.query(q);
    if (rows.length) return res.json(rows[0]);
    res.status(404).json({ error: 'Product not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', verifyToken, async (req, res) => {
  try {
    const { name, description, price, image, category, stock } = req.body;
    const q = `INSERT INTO products (user_id, name, description, price, image, category, stock)
               VALUES (${req.user.id}, '${name}', '${description}', ${price}, '${image || '/uploads/default-product.png'}', '${category}', ${stock || 10})`;
    const [result] = await db.query(q);
    res.json({ success: true, productId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const term = req.query.q || '';
    const q = `SELECT p.*, u.username AS seller FROM products p LEFT JOIN users u ON p.user_id = u.id WHERE p.name LIKE '%${term}%'`;
    const [rows] = await db.query(q);

    res.json({ query: term, results: rows, count: rows.length });
  } catch (err) {
    res.json({ query: req.query.q, results: [], count: 0, error: err.message });
  }
});

app.post('/api/reviews', verifyToken, async (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;
    const q = `INSERT INTO reviews (user_id, product_id, rating, comment)
               VALUES (${req.user.id}, ${product_id}, ${rating}, '${comment}')`;
    await db.query(q);
    res.json({ success: true, message: 'Review added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reviews/:productId', async (req, res) => {
  try {
    const q = `SELECT r.*, u.username, u.avatar
               FROM reviews r LEFT JOIN users u ON r.user_id = u.id
               WHERE r.product_id = ${req.params.productId}
               ORDER BY r.created_at DESC`;
    const [rows] = await db.query(q);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Discount Code ──────────────────────────────────────────
// VULN: Race condition — check-then-insert without transaction lock.
//       Multiple parallel requests can all pass the "already used" check
//       before any INSERT happens, allowing the discount to stack.

// Check existing discount usages for a user + product
app.get('/api/discount/check/:productId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;
    const [usages] = await db.query(
      `SELECT * FROM discount_usages WHERE user_id = ${userId} AND product_id = ${productId}`
    );
    if (usages.length > 0) {
      const totalPercent = usages.reduce((sum, u) => sum + parseFloat(u.discount_percent), 0);
      return res.json({
        applied: true,
        code: usages[0].discount_code,
        discount_percent: Math.min(totalPercent, 100),
        times_applied: usages.length,
      });
    }
    res.json({ applied: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/discount/apply', verifyToken, async (req, res) => {
  try {
    const { code, product_id } = req.body;
    const userId = req.user.id;

    // Only "IDN20" is valid — 20% off
    const validCodes = { 'IDN20': 20 };
    if (!validCodes[code]) {
      return res.status(400).json({ error: 'Invalid discount code' });
    }

    const discountPercent = validCodes[code];

    // Step 1: Check if user already used this code for this product (SELECT)
    const [existing] = await db.query(
      `SELECT * FROM discount_usages WHERE user_id = ${userId} AND discount_code = '${code}' AND product_id = ${product_id}`
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Discount code already applied to this product' });
    }

    // VULNERABLE: Artificial delay between CHECK and INSERT
    // This window allows race condition exploitation
    await new Promise(r => setTimeout(r, 500));

    // Step 2: Record usage (too late if multiple requests passed Step 1)
    await db.query(
      `INSERT INTO discount_usages (user_id, discount_code, product_id, discount_percent) VALUES (${userId}, '${code}', ${product_id}, ${discountPercent})`
    );

    // Count how many times discount was applied (for stacking detection)
    const [usages] = await db.query(
      `SELECT COUNT(*) as count FROM discount_usages WHERE user_id = ${userId} AND discount_code = '${code}' AND product_id = ${product_id}`
    );

    await db.query(
      `INSERT INTO logs (action, details, ip_address) VALUES ('discount_applied', 'User ${userId} applied ${code} (${discountPercent}%) on product ${product_id} – total applied: ${usages[0].count}x', '${req.ip}')`
    );

    res.json({
      success: true,
      code,
      discount_percent: discountPercent,
      times_applied: usages[0].count,
      message: `Discount ${code} applied! ${discountPercent}% off`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset discount usages (for re-testing)
app.delete('/api/discount/reset', verifyToken, async (req, res) => {
  try {
    const { product_id } = req.body;
    await db.query(`DELETE FROM discount_usages WHERE user_id = ${req.user.id} AND product_id = ${product_id}`);
    res.json({ success: true, message: 'Discount usage reset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/order', verifyToken, async (req, res) => {
  try {
    const { product_id, quantity, total_price, shipping_address, discount_code } = req.body;

    // Check wallet balance before placing order
    const [wallet] = await db.query(`SELECT balance FROM wallets WHERE user_id = ${req.user.id}`);
    if (!wallet.length) return res.status(400).json({ error: 'Wallet not found' });
    const balance = parseFloat(wallet[0].balance);
    if (balance < parseFloat(total_price)) {
      return res.status(400).json({ error: 'Insufficient wallet balance', balance });
    }

    const q = `INSERT INTO orders (user_id, product_id, quantity, total_price, status, shipping_address)
               VALUES (${req.user.id}, ${product_id}, ${quantity}, ${total_price}, 'pending', '${shipping_address}')`;
    const [result] = await db.query(q);

    await db.query(`UPDATE wallets SET balance = GREATEST(balance - ${total_price}, 0) WHERE user_id = ${req.user.id}`);

    // Clean up discount usages for this product after order
    if (discount_code) {
      await db.query(`INSERT INTO logs (action, details, ip_address) VALUES ('discount_used', 'Order #${result.insertId} used discount ${discount_code}', '${req.ip}')`);
    }

    await db.query(`INSERT INTO logs (action, details, ip_address) VALUES ('order_created', 'Order #${result.insertId} by user ${req.user.id} – $${total_price}', '${req.ip}')`);

    res.json({ success: true, orderId: result.insertId, charged: total_price });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', verifyToken, async (req, res) => {
  try {
    const q = `SELECT o.*, p.name AS product_name, p.image AS product_image
               FROM orders o LEFT JOIN products p ON o.product_id = p.id
               WHERE o.user_id = ${req.user.id}
               ORDER BY o.created_at DESC`;
    const [rows] = await db.query(q);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/wallet/:userId', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM wallets WHERE user_id = ${req.params.userId}`);
    if (rows.length) return res.json(rows[0]);
    res.status(404).json({ error: 'Wallet not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wallet/deposit', verifyToken, async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount. Must be a positive number.' });
    await db.query(`UPDATE wallets SET balance = COALESCE(balance, 0) + ${amount} WHERE user_id = ${req.user.id}`);
    const [w] = await db.query(`SELECT * FROM wallets WHERE user_id = ${req.user.id}`);
    res.json({ success: true, balance: parseFloat(w[0].balance) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wallet/withdraw', verifyToken, async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount. Must be a positive number.' });
    const userId = req.user.id;

    const [rows] = await db.query(`SELECT balance FROM wallets WHERE user_id = ${userId}`);
    const balance = parseFloat(rows[0].balance);

    if (balance >= amount) {
      await new Promise(r => setTimeout(r, 100));
      await db.query(`UPDATE wallets SET balance = balance - ${amount} WHERE user_id = ${userId}`);

      const [updated] = await db.query(`SELECT balance FROM wallets WHERE user_id = ${userId}`);
      const newBalance = parseFloat(updated[0].balance);

      await db.query(`INSERT INTO logs (action, details, ip_address) VALUES ('wallet_withdraw', 'User ${userId} withdrew $${amount}', '${req.ip}')`);

      const response = { success: true, previous: balance, withdrawn: amount, new_balance: newBalance };

      return res.json(response);
    }

    res.status(400).json({ error: 'Insufficient funds', balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', verifyToken, async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT id, username, email, role, full_name, phone, created_at FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/secret', verifyToken, (req, res) => {
  res.json({
    message: 'Welcome to the secret admin area.',
    admin_note: 'This endpoint should not be publicly accessible.',
    user: req.user,
    method: req.authMethod === 'cookie' ? 'Authenticated via cookie' : 'Authenticated via JWT',
    internal_config: {
      db_host: process.env.DB_HOST,
      db_user: process.env.DB_USER,
      db_password: process.env.DB_PASSWORD,
      jwt_secret: process.env.JWT_SECRET,
    },
  });
});

app.get('/api/internal/metadata', (_req, res) => {
  res.json({
    service: 'internal-metadata',
    instance_id: 'i-0abcdef1234567890',
    internal_ip: '10.0.0.5',
    credentials: {
      access_key: 'AKIAIOSFODNN7EXAMPLE',
      secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    },
    message: 'You reached the internal metadata service via SSRF!',
  });
});

app.post('/api/password-reset', async (req, res) => {
  try {
    const { username, new_password } = req.body;
    if (!username || !new_password) return res.status(400).json({ error: 'Username and new_password required' });

    const hashed = md5(new_password); 
    const [result] = await db.query(`UPDATE users SET password = '${hashed}' WHERE username = '${username}'`);

    if (result.affectedRows > 0) {
      await db.query(`INSERT INTO logs (action, details, ip_address) VALUES ('password_reset', 'Password reset for: ${username} – new hash: ${hashed}', '${req.ip}')`);
      res.json({ success: true, message: `Password for ${username} has been reset` });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/config', (_req, res) => {
  res.json({
    app_name: 'IVM - ID-Networkers',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    debug: true,
    database: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'rootpassword',
      name: process.env.DB_NAME || 'marketplace',
    },
    jwt: {
      secret: JWT_SECRET,
      algorithm: 'HS256',
      accepts_none: true,
    },
    cors: {
      origin: '*',
      credentials: true,
    },
    features: {
      debug_endpoint: '/api/debug',
      password_reset: '/api/password-reset',
      file_upload: '/api/upload',
    },
    server: {
      node_version: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      pid: process.pid,
    },
  });
});

app.get('/api/users/export', async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users');
    res.json({
      export_date: new Date().toISOString(),
      total_users: rows.length,
      users: rows, 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feedback', (req, res) => {
  try {
    const { name, message } = req.body;
    const template = `Thank you ${name}, your feedback has been received: "${message}"`;
    const rendered = eval('`' + template + '`');
    res.json({ success: true, response: rendered });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/api/backup/:table', async (req, res) => {
  try {
    const table = req.params.table;
    const [rows] = await db.query(`SELECT * FROM ${table}`);
    res.json({ table, row_count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', verifyToken, async (req, res) => {
  try {
    await db.query(`DELETE FROM users WHERE id = ${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/logs', async (req, res) => {
  try {
    const logFile = req.query.f || 'app.log';
    const logsDir = path.join(__dirname, 'logs');

    const filePath = path.resolve(logsDir, logFile);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return res.json({ filename: logFile, content });
    } catch (_) {
      try {
        const content = fs.readFileSync(logFile, 'utf-8');
        return res.json({ filename: logFile, content });
      } catch (_) {
        const [rows] = await db.query('SELECT * FROM logs ORDER BY created_at DESC LIMIT 100');
        return res.json({ filename: 'database_logs', entries: rows });
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/ping', verifyToken, async (req, res) => {
  const { host } = req.body;

  const cmd = `ping -c 4 ${host}`;
  exec(cmd, { timeout: 15000 }, (error, stdout, stderr) => {
    res.json({
      command: cmd,
      output: stdout || stderr || (error ? error.message : 'No output'),
      exitCode: error ? error.code : 0,
    });
  });
});

app.post('/api/export-pdf', verifyToken, async (req, res) => {
  try {
    const { url } = req.body;

    const http  = require('http');
    const https = require('https');
    const httpAgent  = new http.Agent({ family: 4 });
    const httpsAgent = new https.Agent({ family: 4 });
    const response = await axios.get(url, {
      timeout: 15000,
      httpAgent,
      httpsAgent,
    });

    res.json({
      success: true,
      source_url: url,
      content_type: response.headers['content-type'],
      data: response.data,
      status: response.status,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch URL', details: err.message, url: req.body.url });
  }
});

app.post('/api/debug', (req, res) => {
  try {
    const { code } = req.body;
    const result = eval(code); // VULN: arbitrary JS execution
    res.json({ success: true, input: code, output: String(result) });
  } catch (err) {
    res.json({ success: false, input: req.body.code, error: err.message });
  }
});

// ── Open Redirect + Reflected XSS ──────────────────────────
// VULN: No URL validation — redirects to any URL including javascript: URIs
//       HTML response reflects the 'url' parameter without sanitisation → XSS
app.get('/api/redirect', (req, res) => {
  const url = req.query.url || '/';

  // If client accepts HTML, render a redirect page that reflects the URL (XSS)
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.type('html').send(`
      <!DOCTYPE html>
      <html>
      <head><title>Redirecting...</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>🔄 Redirecting...</h2>
        <p>You are being redirected to:</p>
        <p><a href="${url}">${url}</a></p>
        <p style="color:#999;font-size:0.8em">If you are not redirected automatically, click the link above.</p>
        <script>setTimeout(function(){ window.location = "${url}"; }, 2000);</script>
      </body>
      </html>
    `);
  }

  // API/JSON clients get a 302 redirect
  res.redirect(url);
});

app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected',
      uptime: process.uptime(),
      env: process.env.NODE_ENV,
      node: process.version,
      platform: process.platform,
      jwt_secret: JWT_SECRET,   
      db_password: process.env.DB_PASSWORD, 
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.get('/api/robots.txt', (_req, res) => {
  res.type('text/plain').send([
    'User-agent: *',
    'Disallow: /api/debug',
    'Disallow: /api/config',
    'Disallow: /api/backup/',
    'Disallow: /api/admin/secret',
    'Disallow: /api/users/export',
    'Disallow: /api/internal/metadata',
    'Disallow: /api/password-reset',
    'Disallow: /api/redirect',
  ].join('\n'));
});

connectDB().then(() => {
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  const logFile = path.join(logsDir, 'app.log');
  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, [
      `[${new Date().toISOString()}] Application started`,
      `[${new Date().toISOString()}] Database connected`,
      `[${new Date().toISOString()}] Listening on port ${PORT}`,
      `[${new Date().toISOString()}] WARNING: Debug endpoint active – /api/debug`,
      '',
    ].join('\n'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('════════════════════════════════════════════');
    console.log('  ⚠  IVM - ID-Networkers Vulnerable Marketplace');
    console.log(`  ⚠  Listening on http://0.0.0.0:${PORT}`);
    console.log('  ⚠  FOR SECURITY TRAINING ONLY');
    console.log('════════════════════════════════════════════');
    console.log('');
  });
});
