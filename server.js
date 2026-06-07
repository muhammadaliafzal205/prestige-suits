const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

require('dotenv').config();
// ══════════════════════════════════════════════════════════════
// MONGODB CONNECTION
// ══════════════════════════════════════════════════════════════
mongoose.connect(process.env.MONGO_URI)
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'prestige_suits_secret_2024';

const app = express();


// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../frontend/public/uploads')));

// ══════════════════════════════════════════════════════════════
// MONGOOSE SCHEMAS & MODELS
// ══════════════════════════════════════════════════════════════
const suitSchema = new mongoose.Schema({
  name:   { type: String, required: true },
  price:  { type: Number, required: true },
  color:  { type: String, default: '' },
  style:  { type: String, default: '' },
  fabric: { type: String, default: '' },
  sizes:  { type: String, default: 'S,M,L,XL' },
  stock:  { type: Number, default: 0 },
  desc:   { type: String, default: '' },
  image:  { type: String, default: null },
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  invoiceId: { type: String, unique: true }, // e.g. INV-1001
  customer: {
    name:    String,
    phone:   String,
    email:   String,
    address: String,
  },
  items:    { type: Array, default: [] },
  date:     String,
  subtotal: Number,
  tax:      Number,
  total:    Number,
  status:   { type: String, default: 'Pending' },
}, { timestamps: true });

const Suit  = mongoose.model('Suit',  suitSchema);
const Order = mongoose.model('Order', orderSchema);

// ── Seed default suits if collection is empty ─────────────────
async function seedSuits() {
  const count = await Suit.countDocuments();
  if (count === 0) {
    await Suit.insertMany([
      {
        name: 'Classic Charcoal Slim Fit', price: 22500,
        color: 'Charcoal Grey', style: 'Slim Fit', fabric: 'Italian Wool',
        sizes: 'S,M,L,XL,XXL', stock: 8,
        desc: 'A timeless charcoal grey suit with a modern slim silhouette.',
      },
      {
        name: 'Navy Double Breasted', price: 28000,
        color: 'Navy Blue', style: 'Double Breasted', fabric: 'Premium Cashmere',
        sizes: 'M,L,XL', stock: 5,
        desc: 'Commanding navy double breasted with gold buttons.',
      },
    ]);
    console.log('🌱 Default suits seeded');
  }
}
mongoose.connection.once('open', seedSuits);

// ── Admin user (hardcoded, no DB needed) ─────────────────────
const admin = {
  username:     'admin',
  passwordHash: bcrypt.hashSync('admin123', 10),
  name:         'Store Manager',
};

// ── Multer setup ──────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../frontend/public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `suit-${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

// ── Auth middleware ───────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ══════════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════════
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== admin.username || !bcrypt.compareSync(password, admin.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username, name: admin.name }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, name: admin.name });
});

app.get('/api/auth/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, name: req.admin.name });
});

// ══════════════════════════════════════════════════════════════
// SUITS ROUTES
// ══════════════════════════════════════════════════════════════

// GET all suits (public)
app.get('/api/suits', async (req, res) => {
  try {
    const suits = await Suit.find().sort({ createdAt: -1 });
    res.json(suits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create suit (admin)
app.post('/api/suits', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, price, color, style, fabric, sizes, stock, desc } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price required' });

    const suit = await Suit.create({
      name,
      price:  parseFloat(price),
      color:  color  || '',
      style:  style  || '',
      fabric: fabric || '',
      sizes:  sizes  || 'S,M,L,XL',
      stock:  parseInt(stock) || 0,
      desc:   desc   || '',
      image:  req.file ? `/uploads/${req.file.filename}` : null,
    });
    res.status(201).json(suit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update suit (admin)
app.put('/api/suits/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, price, color, style, fabric, sizes, stock, desc } = req.body;

    const updates = {};
    if (name   !== undefined) updates.name   = name;
    if (price  !== undefined) updates.price  = parseFloat(price);
    if (color  !== undefined) updates.color  = color;
    if (style  !== undefined) updates.style  = style;
    if (fabric !== undefined) updates.fabric = fabric;
    if (sizes  !== undefined) updates.sizes  = sizes;
    if (stock  !== undefined) updates.stock  = parseInt(stock);
    if (desc   !== undefined) updates.desc   = desc;
    if (req.file)             updates.image  = `/uploads/${req.file.filename}`;

    const suit = await Suit.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!suit) return res.status(404).json({ error: 'Not found' });
    res.json(suit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE suit (admin)
app.delete('/api/suits/:id', authMiddleware, async (req, res) => {
  try {
    const suit = await Suit.findByIdAndDelete(req.params.id);
    if (!suit) return res.status(404).json({ error: 'Not found' });

    // Delete image file if exists
    if (suit.image) {
      const filePath = path.join(__dirname, '../frontend/public', suit.image);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// ORDERS ROUTES
// ══════════════════════════════════════════════════════════════

// GET all orders (admin)
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create order (public)
app.post('/api/orders', async (req, res) => {
  try {
    const { customer, items, date } = req.body;
    if (!customer?.name || !items?.length || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const subtotal = items.reduce((a, x) => a + x.price * (x.qty || 1), 0);
    const tax      = Math.round(subtotal * 0.05);
    const total    = subtotal + tax;

    // Auto-generate invoice number from order count
    const orderCount = await Order.countDocuments();
    const invoiceId  = `INV-${1001 + orderCount}`;

    const order = await Order.create({
      invoiceId,
      customer,
      items,
      date,
      subtotal,
      tax,
      total,
      status: 'Pending',
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update order status (admin)
app.put('/api/orders/:id/status', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════════════════
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const [totalSuits, totalOrders, revenueResult, pending] = await Promise.all([
      Suit.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.countDocuments({ status: 'Pending' }),
    ]);

    res.json({
      totalSuits,
      totalOrders,
      revenue: revenueResult[0]?.total || 0,
      pending,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅  Prestige Suits API running on http://localhost:${PORT}`));