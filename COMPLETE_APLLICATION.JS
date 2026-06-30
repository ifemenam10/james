/**

- DANDY PREMIUM SHORTLETS - COMPLETE APPLICATION
- 
- This is a full-stack application with frontend + backend combined.
- 
- SETUP INSTRUCTIONS:
- 1. Install Node.js from nodejs.org
- 1. Create a folder: mkdir dandy-booking
- 1. cd dandy-booking
- 1. Copy THIS ENTIRE FILE as server.js
- 1. Create package.json with the dependencies listed below
- 1. Run: npm install
- 1. Run: node server.js
- 1. Open: http://localhost:3000
- 
- PACKAGE.JSON:
- {
- “name”: “dandy-booking”,
- “version”: “1.0.0”,
- “main”: “server.js”,
- “scripts”: {
- ```
  "start": "node server.js"
  ```
- },
- “dependencies”: {
- ```
  "express": "^4.18.2",
  ```
- ```
  "cors": "^2.8.5",
  ```
- ```
  "bcryptjs": "^2.4.3",
  ```
- ```
  "jsonwebtoken": "^9.0.0",
  ```
- ```
  "sqlite3": "^5.1.6"
  ```
- }
- }
  */

const express = require(‘express’);
const cors = require(‘cors’);
const bcrypt = require(‘bcryptjs’);
const jwt = require(‘jsonwebtoken’);
const sqlite3 = require(‘sqlite3’).verbose();
const path = require(‘path’);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = ‘dandy_secret_key_2026_change_in_production’;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ════════════════════════════════════════════════════════════════════
// DATABASE SETUP
// ════════════════════════════════════════════════════════════════════

const db = new sqlite3.Database(’:memory:’);

db.serialize(() => {
db.run(`CREATE TABLE IF NOT EXISTS users ( id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, firstName TEXT, lastName TEXT, phone TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP )`);

db.run(`CREATE TABLE IF NOT EXISTS bookings ( id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, propertyId INTEGER NOT NULL, propertyTitle TEXT, checkInDate DATE NOT NULL, checkOutDate DATE NOT NULL, nights INTEGER, pricePerNight TEXT, totalPrice TEXT, status TEXT DEFAULT 'pending', createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(userId) REFERENCES users(id) )`);

console.log(‘✅ Database initialized’);
});

// ════════════════════════════════════════════════════════════════════
// AUTHENTICATION ROUTES
// ════════════════════════════════════════════════════════════════════

// Sign Up
app.post(’/api/auth/signup’, async (req, res) => {
const { email, password, firstName, lastName } = req.body;

if (!email || !password || password.length < 6) {
return res.status(400).json({ error: ‘Email and password (min 6 chars) required’ });
}

try {
const hashedPassword = await bcrypt.hash(password, 10);

```
db.run(
  `INSERT INTO users (email, password, firstName, lastName) VALUES (?, ?, ?, ?)`,
  [email, hashedPassword, firstName || '', lastName || ''],
  function (err) {
    if (err) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const token = jwt.sign({ userId: this.lastID, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: { id: this.lastID, email, firstName, lastName }
    });
  }
);
```

} catch (err) {
res.status(500).json({ error: ’Server error: ’ + err.message });
}
});

// Login
app.post(’/api/auth/login’, (req, res) => {
const { email, password } = req.body;

if (!email || !password) {
return res.status(400).json({ error: ‘Email and password required’ });
}

db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
if (err || !user) {
return res.status(401).json({ error: ‘Invalid email or password’ });
}

```
try {
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    success: true,
    message: 'Login successful!',
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone
    }
  });
} catch (err) {
  res.status(500).json({ error: 'Server error: ' + err.message });
}
```

});
});

// ════════════════════════════════════════════════════════════════════
// MIDDLEWARE - VERIFY JWT TOKEN
// ════════════════════════════════════════════════════════════════════

const verifyToken = (req, res, next) => {
const token = req.headers.authorization?.split(’ ’)[1];

if (!token) {
return res.status(401).json({ error: ‘No token provided’ });
}

try {
const decoded = jwt.verify(token, JWT_SECRET);
req.userId = decoded.userId;
next();
} catch (err) {
res.status(401).json({ error: ‘Invalid token’ });
}
};

// ════════════════════════════════════════════════════════════════════
// USER ROUTES
// ════════════════════════════════════════════════════════════════════

app.get(’/api/user/profile’, verifyToken, (req, res) => {
db.get(`SELECT id, email, firstName, lastName, phone, createdAt FROM users WHERE id = ?`, [req.userId], (err, user) => {
if (err || !user) {
return res.status(404).json({ error: ‘User not found’ });
}
res.json({ user });
});
});

app.put(’/api/user/profile’, verifyToken, (req, res) => {
const { firstName, lastName, phone } = req.body;

db.run(
`UPDATE users SET firstName = ?, lastName = ?, phone = ? WHERE id = ?`,
[firstName, lastName, phone, req.userId],
function (err) {
if (err) return res.status(500).json({ error: ‘Failed to update profile’ });
res.json({ success: true, message: ‘Profile updated’ });
}
);
});

// ════════════════════════════════════════════════════════════════════
// BOOKING ROUTES
// ════════════════════════════════════════════════════════════════════

app.post(’/api/bookings’, verifyToken, (req, res) => {
const { propertyId, propertyTitle, checkInDate, checkOutDate, nights, pricePerNight, totalPrice } = req.body;

db.run(
`INSERT INTO bookings (userId, propertyId, propertyTitle, checkInDate, checkOutDate, nights, pricePerNight, totalPrice)  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
[req.userId, propertyId, propertyTitle, checkInDate, checkOutDate, nights, pricePerNight, totalPrice],
function (err) {
if (err) return res.status(500).json({ error: ‘Failed to create booking’ });
res.json({ success: true, message: ‘Booking created!’, bookingId: this.lastID });
}
);
});

app.get(’/api/bookings’, verifyToken, (req, res) => {
db.all(`SELECT * FROM bookings WHERE userId = ? ORDER BY createdAt DESC`, [req.userId], (err, bookings) => {
if (err) return res.status(500).json({ error: ‘Failed to fetch bookings’ });
res.json({ bookings });
});
});

app.delete(’/api/bookings/:id’, verifyToken, (req, res) => {
db.run(
`DELETE FROM bookings WHERE id = ? AND userId = ?`,
[req.params.id, req.userId],
function (err) {
if (err) return res.status(500).json({ error: ‘Failed to cancel booking’ });
res.json({ success: true, message: ‘Booking cancelled’ });
}
);
});

// ════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ════════════════════════════════════════════════════════════════════

app.get(’/api/health’, (req, res) => {
res.json({ status: ‘Server running ✅’, timestamp: new Date() });
});

// ════════════════════════════════════════════════════════════════════
// SERVE FRONTEND (HTML)
// ════════════════════════════════════════════════════════════════════

app.get(’/’, (req, res) => {
res.send(getHTMLPage());
});

function getHTMLPage() {
return `<!DOCTYPE html>

<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Dandy — Premium Shortlets</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

```
:root {
  --navy: #0D1B2A;
  --navy-mid: #162333;
  --sand: #E8D5B0;
  --coral: #E8613A;
  --coral-dark: #C94F2A;
  --white: #F9F6F1;
  --slate: #8A9BB0;
  --slate-light: #C4D0DC;
  --card-bg: #ffffff;
  --border: #E4E0D8;
}

html { scroll-behavior: smooth; }

body {
  font-family: 'Inter', sans-serif;
  background: var(--white);
  color: var(--navy);
  min-height: 100vh;
}

/* ── NAV ── */
nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 2.5rem;
  height: 68px;
  background: rgba(13,27,42,0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  transition: background 0.3s;
}
.nav-logo {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--white);
  letter-spacing: -0.02em;
  text-decoration: none;
}
.nav-logo span { color: var(--coral); }
.nav-links {
  display: flex; align-items: center; gap: 2rem;
  list-style: none;
}
.nav-links a {
  color: var(--slate-light); font-size: 0.875rem;
  text-decoration: none; letter-spacing: 0.02em;
  transition: color 0.2s;
}
.nav-links a:hover { color: var(--white); }
.nav-cta {
  background: var(--coral); color: #fff !important;
  padding: 0.5rem 1.25rem; border-radius: 6px;
  font-weight: 500; transition: background 0.2s !important;
  border: none; cursor: pointer; font-family: 'Inter', sans-serif;
}
.nav-cta:hover { background: var(--coral-dark) !important; }

/* ── HERO ── */
.hero {
  position: relative; height: 100vh; min-height: 600px;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.hero-bg {
  position: absolute; inset: 0;
  background: linear-gradient(135deg, #0D1B2A 0%, #1A3A5C 60%, #0D2840 100%);
}
.hero-pattern {
  position: absolute; inset: 0; opacity: 0.04;
  background-image: radial-gradient(circle, var(--sand) 1px, transparent 1px);
  background-size: 40px 40px;
}
.hero-img-col {
  position: absolute; right: 0; top: 0; bottom: 0; width: 52%;
  overflow: hidden;
}
.hero-img-col img {
  width: 100%; height: 100%; object-fit: cover; opacity: 0.35;
  filter: saturate(0.7);
}
.hero-img-col::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(to right, #0D1B2A 0%, transparent 60%);
}
.hero-content {
  position: relative; z-index: 2;
  max-width: 1100px; width: 100%; margin: 0 auto;
  padding: 0 2.5rem; padding-top: 68px;
}
.hero-eyebrow {
  display: inline-flex; align-items: center; gap: 0.5rem;
  font-size: 0.75rem; font-weight: 600; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--coral);
  margin-bottom: 1.25rem;
}
.hero-eyebrow::before {
  content: ''; display: block; width: 28px; height: 1px;
  background: var(--coral);
}
.hero h1 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(2.6rem, 5vw, 4rem);
  font-weight: 700; line-height: 1.1;
  color: var(--white);
  max-width: 580px;
  margin-bottom: 1.25rem;
}
.hero h1 em { font-style: italic; color: var(--sand); }
.hero-sub {
  font-size: 1rem; color: var(--slate-light);
  max-width: 420px; line-height: 1.65;
  margin-bottom: 2.5rem;
}

.search-bar {
  background: #fff;
  border-radius: 12px;
  display: flex; align-items: stretch;
  max-width: 680px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  overflow: hidden;
}
.search-field {
  flex: 1; display: flex; align-items: center; gap: 0.6rem;
  padding: 0 1.25rem; border-right: 1px solid var(--border);
}
.search-field:last-of-type { border-right: none; }
.search-field svg { color: var(--slate); flex-shrink: 0; }
.search-field select,
.search-field input {
  border: none; outline: none; background: transparent;
  font-family: 'Inter', sans-serif; font-size: 0.875rem;
  color: var(--navy); width: 100%; padding: 1rem 0;
}
.search-field label {
  display: block; font-size: 0.65rem; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--slate); margin-bottom: 2px;
}
.search-inner { display: flex; flex-direction: column; padding: 0.75rem 0; }
.search-btn {
  background: var(--coral); color: #fff;
  border: none; cursor: pointer;
  padding: 0 1.75rem; font-size: 0.9rem; font-weight: 600;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.02em;
  transition: background 0.2s;
  display: flex; align-items: center; gap: 0.5rem;
}
.search-btn:hover { background: var(--coral-dark); }

.hero-stats {
  display: flex; gap: 2.5rem; margin-top: 2.5rem;
}
.stat-item { }
.stat-num {
  font-family: 'Playfair Display', serif;
  font-size: 1.6rem; font-weight: 700; color: var(--white);
}
.stat-label {
  font-size: 0.75rem; color: var(--slate); letter-spacing: 0.04em;
}

/* ── SECTION COMMONS ── */
section { padding: 5rem 0; }
.container { max-width: 1100px; margin: 0 auto; padding: 0 2.5rem; }
.section-head { margin-bottom: 3rem; }
.section-eyebrow {
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.15em;
  text-transform: uppercase; color: var(--coral);
  margin-bottom: 0.6rem;
}
.section-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 700; line-height: 1.2;
  color: var(--navy);
}
.section-title em { font-style: italic; }
.section-sub {
  font-size: 0.9rem; color: var(--slate);
  margin-top: 0.6rem; line-height: 1.6;
}

/* ── FILTER BAR ── */
.filter-section { padding: 2rem 0 0; }
.filter-bar {
  display: flex; align-items: center; gap: 0.75rem;
  flex-wrap: wrap;
}
.filter-btn {
  border: 1.5px solid var(--border); background: #fff;
  border-radius: 100px; padding: 0.45rem 1.1rem;
  font-family: 'Inter', sans-serif; font-size: 0.825rem;
  font-weight: 500; color: var(--navy); cursor: pointer;
  transition: all 0.18s;
}
.filter-btn:hover,
.filter-btn.active {
  border-color: var(--coral); background: var(--coral);
  color: #fff;
}
.filter-count {
  margin-left: auto; font-size: 0.8rem; color: var(--slate);
}

/* ── PROPERTY GRID ── */
.listings-section { padding-top: 2rem; }
.property-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.75rem;
}

.property-card {
  border-radius: 14px; overflow: hidden;
  position: relative; cursor: pointer;
  aspect-ratio: 3/3.8;
  background: var(--navy-mid);
  box-shadow: 0 4px 20px rgba(13,27,42,0.10);
  transition: transform 0.28s, box-shadow 0.28s;
}
.property-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 16px 48px rgba(13,27,42,0.2);
}
.card-img {
  position: absolute; inset: 0;
  width: 100%; height: 100%; object-fit: cover;
  transition: transform 0.4s ease;
}
.property-card:hover .card-img { transform: scale(1.04); }

.card-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(13,27,42,0.9) 0%, rgba(13,27,42,0.3) 55%, rgba(13,27,42,0.0) 100%);
}

.card-badges {
  position: absolute; top: 1rem; left: 1rem; right: 1rem;
  display: flex; gap: 0.4rem; flex-wrap: wrap;
}
.badge {
  font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; padding: 0.3rem 0.65rem;
  border-radius: 100px;
}
.badge-type { background: var(--coral); color: #fff; }
.badge-featured { background: rgba(232,213,176,0.95); color: var(--navy); }

.card-wishlist {
  position: absolute; top: 1rem; right: 1rem;
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,0.15); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; backdrop-filter: blur(8px);
  transition: background 0.2s;
}
.card-wishlist:hover { background: rgba(255,255,255,0.3); }
.card-wishlist svg { color: #fff; }

.card-info {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 1.25rem;
  transform: translateY(0);
  transition: transform 0.3s ease;
}
.card-location {
  font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--slate-light);
  margin-bottom: 0.35rem;
}
.card-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem; font-weight: 600;
  color: #fff; line-height: 1.25;
  margin-bottom: 0.75rem;
}
.card-meta {
  display: flex; align-items: center; gap: 1rem;
  margin-bottom: 0.85rem;
}
.card-meta-item {
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.78rem; color: var(--slate-light);
}
.card-meta-item svg { width: 13px; height: 13px; }

.card-extras {
  display: flex; align-items: center; justify-content: space-between;
  overflow: hidden; max-height: 0;
  opacity: 0;
  transition: max-height 0.35s ease, opacity 0.3s ease;
}
.property-card:hover .card-extras {
  max-height: 60px; opacity: 1;
}
.card-price {
  font-family: 'Playfair Display', serif;
  font-size: 1.2rem; font-weight: 700; color: #fff;
}
.card-price span { font-family: 'Inter', sans-serif; font-size: 0.7rem; font-weight: 400; color: var(--slate-light); }
.card-book-btn {
  background: var(--coral); color: #fff;
  border: none; border-radius: 7px;
  padding: 0.5rem 1rem; font-size: 0.8rem; font-weight: 600;
  font-family: 'Inter', sans-serif; cursor: pointer;
  transition: background 0.2s;
}
.card-book-btn:hover { background: var(--coral-dark); }

.card-rating {
  display: flex; align-items: center; gap: 0.25rem;
  font-size: 0.75rem; color: var(--sand); font-weight: 600;
}

/* ── HOW IT WORKS ── */
.how-section { background: var(--navy); }
.how-section .section-title { color: var(--white); }
.how-section .section-eyebrow { color: var(--sand); }
.how-section .section-sub { color: var(--slate); }
.steps-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 2rem; margin-top: 3rem;
}
.step-card {
  position: relative;
  padding: 2rem;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  background: rgba(255,255,255,0.03);
  transition: border-color 0.3s;
}
.step-card:hover { border-color: var(--coral); }
.step-num {
  font-family: 'Playfair Display', serif;
  font-size: 3rem; font-weight: 700;
  color: rgba(232,213,176,0.12);
  line-height: 1;
  margin-bottom: 1rem;
}
.step-icon {
  width: 44px; height: 44px; border-radius: 10px;
  background: rgba(232,97,58,0.15);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 1rem;
}
.step-icon svg { color: var(--coral); }
.step-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem; font-weight: 600;
  color: var(--white); margin-bottom: 0.5rem;
}
.step-desc { font-size: 0.85rem; color: var(--slate); line-height: 1.6; }

/* ── TESTIMONIALS ── */
.testi-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
.testi-card {
  background: #fff; border-radius: 14px;
  padding: 1.75rem;
  border: 1px solid var(--border);
  transition: box-shadow 0.25s;
}
.testi-card:hover { box-shadow: 0 8px 32px rgba(13,27,42,0.1); }
.testi-stars { color: #F5A623; font-size: 0.9rem; margin-bottom: 1rem; }
.testi-quote {
  font-family: 'Playfair Display', serif;
  font-size: 1rem; font-style: italic;
  color: var(--navy); line-height: 1.65;
  margin-bottom: 1.25rem;
}
.testi-author { display: flex; align-items: center; gap: 0.75rem; }
.testi-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  object-fit: cover; background: var(--sand);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Playfair Display', serif;
  font-size: 1rem; font-weight: 700; color: var(--navy);
  flex-shrink: 0;
}
.testi-name { font-size: 0.875rem; font-weight: 600; color: var(--navy); }
.testi-city { font-size: 0.75rem; color: var(--slate); }

/* ── CTA BANNER ── */
.cta-section {
  background: linear-gradient(135deg, var(--coral) 0%, #C94F2A 100%);
  padding: 4rem 0;
}
.cta-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 2rem; flex-wrap: wrap;
}
.cta-text h2 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.4rem, 3vw, 2rem);
  color: #fff; font-weight: 700; margin-bottom: 0.4rem;
}
.cta-text p { color: rgba(255,255,255,0.8); font-size: 0.9rem; }
.cta-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
.btn-white {
  background: #fff; color: var(--coral);
  border: none; border-radius: 8px;
  padding: 0.8rem 1.75rem; font-size: 0.9rem; font-weight: 600;
  font-family: 'Inter', sans-serif; cursor: pointer;
  transition: transform 0.18s, box-shadow 0.18s;
}
.btn-white:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
.btn-outline-white {
  background: transparent; color: #fff;
  border: 2px solid rgba(255,255,255,0.6);
  border-radius: 8px; padding: 0.8rem 1.75rem;
  font-size: 0.9rem; font-weight: 600;
  font-family: 'Inter', sans-serif; cursor: pointer;
  transition: border-color 0.18s, background 0.18s;
}
.btn-outline-white:hover { border-color: #fff; background: rgba(255,255,255,0.1); }

/* ── FOOTER ── */
footer {
  background: var(--navy); color: var(--slate);
  padding: 3.5rem 0 1.5rem;
}
.footer-grid {
  display: grid; grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 2.5rem; margin-bottom: 3rem;
}
.footer-brand .nav-logo { display: inline-block; margin-bottom: 1rem; }
.footer-brand p { font-size: 0.85rem; line-height: 1.7; max-width: 240px; }
.footer-col h4 {
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--slate-light);
  margin-bottom: 1rem;
}
.footer-col ul { list-style: none; }
.footer-col ul li { margin-bottom: 0.6rem; }
.footer-col ul a {
  font-size: 0.85rem; color: var(--slate);
  text-decoration: none; transition: color 0.2s;
}
.footer-col ul a:hover { color: var(--white); }
.footer-bottom {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 1.5rem;
  display: flex; align-items: center; justify-content: space-between;
  font-size: 0.8rem;
}
.social-links { display: flex; gap: 1rem; }
.social-links a {
  color: var(--slate); text-decoration: none;
  transition: color 0.2s; font-size: 0.85rem;
}
.social-links a:hover { color: var(--white); }

/* ── MODAL ── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(13,27,42,0.75);
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem;
  opacity: 0; pointer-events: none; transition: opacity 0.25s;
}
.modal-overlay.open { opacity: 1; pointer-events: all; }
.modal {
  background: #fff; border-radius: 16px;
  width: 100%; max-width: 520px;
  max-height: 90vh; overflow-y: auto;
  padding: 2rem;
  transform: translateY(20px); transition: transform 0.3s;
}
.modal-overlay.open .modal { transform: translateY(0); }
.modal-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 1.5rem;
}
.modal-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.3rem; font-weight: 700; color: var(--navy);
}
.modal-close {
  border: none; background: none; cursor: pointer;
  color: var(--slate); font-size: 1.25rem; padding: 0;
}
.modal-img {
  width: 100%; height: 200px; object-fit: cover;
  border-radius: 10px; margin-bottom: 1.25rem;
}
.modal-detail-row {
  display: flex; gap: 1rem; flex-wrap: wrap;
  margin-bottom: 1.25rem;
}
.modal-chip {
  display: flex; align-items: center; gap: 0.35rem;
  font-size: 0.8rem; color: var(--navy); font-weight: 500;
  background: var(--white); padding: 0.35rem 0.75rem;
  border-radius: 100px; border: 1px solid var(--border);
}
.modal-desc { font-size: 0.875rem; color: var(--slate); line-height: 1.7; margin-bottom: 1.5rem; }
.modal-price-row {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 1.25rem; border-top: 1px solid var(--border);
}
.modal-price {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem; font-weight: 700; color: var(--navy);
}
.modal-price small { font-family: 'Inter', sans-serif; font-size: 0.75rem; font-weight: 400; color: var(--slate); }
.btn-coral {
  background: var(--coral); color: #fff; border: none;
  border-radius: 8px; padding: 0.8rem 1.75rem;
  font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600;
  cursor: pointer; transition: background 0.2s;
}
.btn-coral:hover { background: var(--coral-dark); }

/* ── LOGIN MODAL ── */
.login-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(13,27,42,0.95);
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem;
  backdrop-filter: blur(8px);
  opacity: 1; pointer-events: all;
  transition: opacity 0.3s, pointer-events 0.3s;
}
.login-overlay.hidden {
  opacity: 0; pointer-events: none;
}
.login-container {
  background: var(--white);
  border-radius: 16px;
  width: 100%; max-width: 420px;
  padding: 3rem 2rem;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  transform: scale(1); transition: transform 0.3s;
}
.login-overlay.hidden .login-container {
  transform: scale(0.95);
}
.login-header {
  text-align: center; margin-bottom: 2rem;
}
.login-logo {
  font-family: 'Playfair Display', serif;
  font-size: 2rem; font-weight: 700;
  color: var(--navy); margin-bottom: 0.5rem;
}
.login-logo span { color: var(--coral); }
.login-subtitle {
  font-size: 0.9rem; color: var(--slate);
  line-height: 1.6;
}
.login-form {
  display: flex; flex-direction: column; gap: 1rem;
}
.form-group {
  display: flex; flex-direction: column; gap: 0.5rem;
}
.form-group label {
  font-size: 0.85rem; font-weight: 600;
  color: var(--navy); letter-spacing: 0.02em;
}
.form-group input {
  padding: 0.9rem 1rem;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  color: var(--navy);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.form-group input:focus {
  outline: none;
  border-color: var(--coral);
  box-shadow: 0 0 0 3px rgba(232,97,58,0.1);
}
.form-group input::placeholder {
  color: var(--slate-light);
}
.login-btn {
  background: var(--coral); color: #fff;
  border: none; border-radius: 8px;
  padding: 1rem; font-size: 0.95rem; font-weight: 600;
  font-family: 'Inter', sans-serif; cursor: pointer;
  margin-top: 0.5rem;
  transition: background 0.2s, transform 0.1s;
}
.login-btn:hover {
  background: var(--coral-dark);
  transform: translateY(-2px);
}
.login-btn:active { transform: translateY(0); }
.login-btn:disabled {
  background: var(--slate);
  cursor: not-allowed;
  transform: none;
}
.login-remember {
  display: flex; align-items: center; gap: 0.6rem;
  font-size: 0.85rem; color: var(--slate);
}
.login-remember input {
  width: 16px; height: 16px; cursor: pointer;
}
.login-footer {
  text-align: center; font-size: 0.85rem; color: var(--slate);
  margin-top: 1.5rem;
}
.login-footer a {
  color: var(--coral); text-decoration: none; font-weight: 600;
  transition: color 0.2s; cursor: pointer;
}
.login-footer a:hover { color: var(--coral-dark); }
.login-divider {
  text-align: center; margin: 1.5rem 0; position: relative;
  color: var(--slate); font-size: 0.8rem;
}
.login-divider::before {
  content: ''; position: absolute; inset: 50% 0;
  height: 1px; background: var(--border);
}
.login-divider span {
  position: relative; background: var(--white); padding: 0 0.75rem;
}

@media (max-width: 768px) {
  nav { padding: 0 1.25rem; }
  .nav-links { display: none; }
  .hero h1 { font-size: 2rem; }
  .hero-img-col { display: none; }
  .search-bar { flex-direction: column; }
  .search-field { border-right: none; border-bottom: 1px solid var(--border); }
  .search-field:last-of-type { border-bottom: none; }
  .hero-stats { gap: 1.5rem; }
  .footer-grid { grid-template-columns: 1fr 1fr; }
  .cta-inner { flex-direction: column; }
  .container { padding: 0 1.25rem; }
}
@media (max-width: 480px) {
  .property-grid { grid-template-columns: 1fr; }
  .footer-grid { grid-template-columns: 1fr; }
}
```

  </style>
</head>
<body>

<!-- LOGIN MODAL -->

<div class="login-overlay" id="login-overlay">
  <div class="login-container">
    <div class="login-header">
      <div class="login-logo">Dan<span>dy</span></div>
      <p class="login-subtitle">Sign in to your account to browse and book premium shortlets</p>
    </div>

```
<form class="login-form" id="login-form" onsubmit="handleLogin(event)">
  <div class="form-group">
    <label for="email">Email Address</label>
    <input type="email" id="email" name="email" placeholder="you@example.com" required>
  </div>
  
  <div class="form-group">
    <label for="password">Password</label>
    <input type="password" id="password" name="password" placeholder="••••••••" required>
  </div>
  
  <label class="login-remember">
    <input type="checkbox" id="remember" name="remember">
    <span>Remember me on this device</span>
  </label>
  
  <button type="submit" class="login-btn">Sign In</button>
</form>

<div class="login-divider"><span>or</span></div>

<button class="login-btn" style="background: #4285F4; margin-top: 0;" type="button" onclick="alert('Google Sign-in coming soon!')">
  Continue with Google
</button>

<div class="login-footer">
  Don't have an account? <a onclick="showSignup()">Create one</a><br>
  <a onclick="alert('Password reset coming soon!')">Forgot your password?</a>
</div>
```

  </div>
</div>

<!-- NAV -->

<nav>
  <a href="#" class="nav-logo">Dan<span>dy</span></a>
  <ul class="nav-links" id="nav-links">
    <li><a href="#listings">Browse</a></li>
    <li><a href="#how">How it Works</a></li>
    <li><a href="#reviews">Reviews</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#" class="nav-cta" onclick="openLoginModal(event)">Login</a></li>
  </ul>
</nav>

<!-- HERO -->

<section class="hero">
  <div class="hero-bg"></div>
  <div class="hero-pattern"></div>
  <div class="hero-img-col">
    <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80" alt="Luxury apartment interior" />
  </div>
  <div class="hero-content">
    <div class="hero-eyebrow">Premium Shortlets Nigeria</div>
    <h1>Find your <em>perfect</em> stay, anywhere</h1>
    <p class="hero-sub">Curated short-term apartments in Lagos, Abuja, and Port Harcourt — fully furnished, instantly bookable.</p>

```
<div class="search-bar">
  <div class="search-field">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    <div class="search-inner">
      <label>Location</label>
      <select>
        <option value="">All cities</option>
        <option>Lagos</option>
        <option>Abuja</option>
        <option>Port Harcourt</option>
      </select>
    </div>
  </div>
  <div class="search-field">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    <div class="search-inner">
      <label>Bedrooms</label>
      <select>
        <option value="">Any</option>
        <option>1 bed</option>
        <option>2 beds</option>
        <option>3 beds</option>
        <option>4+ beds</option>
      </select>
    </div>
  </div>
  <div class="search-field">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    <div class="search-inner">
      <label>Max price / night</label>
      <select>
        <option value="">Any budget</option>
        <option>Under ₦100k</option>
        <option>₦100k–₦200k</option>
        <option>₦200k–₦300k</option>
        <option>₦300k+</option>
      </select>
    </div>
  </div>
  <button class="search-btn" onclick="document.getElementById('listings').scrollIntoView({behavior:'smooth'})">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    Search
  </button>
</div>

<div class="hero-stats">
  <div class="stat-item">
    <div class="stat-num">107+</div>
    <div class="stat-label">Verified listings</div>
  </div>
  <div class="stat-item">
    <div class="stat-num">3</div>
    <div class="stat-label">Major cities</div>
  </div>
  <div class="stat-item">
    <div class="stat-num">4.9★</div>
    <div class="stat-label">Avg. guest rating</div>
  </div>
</div>
```

  </div>
</section>

<!-- FILTER + LISTINGS -->

<section class="filter-section" id="listings">
  <div class="container">
    <div class="section-head">
      <div class="section-eyebrow">Available Now</div>
      <h2 class="section-title">Browse <em>premium</em> shortlets</h2>
      <p class="section-sub">Showing 12 of 107 verified listings across Nigeria</p>
    </div>
    <div class="filter-bar">
      <button class="filter-btn active" onclick="filterCards(this,'all')">All</button>
      <button class="filter-btn" onclick="filterCards(this,'abuja')">Abuja</button>
      <button class="filter-btn" onclick="filterCards(this,'lagos')">Lagos</button>
      <button class="filter-btn" onclick="filterCards(this,'ph')">Port Harcourt</button>
      <button class="filter-btn" onclick="filterCards(this,'1bed')">1 Bedroom</button>
      <button class="filter-btn" onclick="filterCards(this,'2bed')">2 Bedrooms</button>
      <button class="filter-btn" onclick="filterCards(this,'3bed')">3 Bedrooms</button>
      <span class="filter-count" id="filter-count">12 results</span>
    </div>
  </div>
</section>

<section class="listings-section">
  <div class="container">
    <div class="property-grid" id="property-grid"></div>
  </div>
</section>

<!-- HOW IT WORKS -->

<section class="how-section" id="how">
  <div class="container">
    <div class="section-head">
      <div class="section-eyebrow">Simple process</div>
      <h2 class="section-title">Book in <em>three steps</em></h2>
      <p class="section-sub">From browsing to checking in — we make it effortless.</p>
    </div>
    <div class="steps-grid">
      <div class="step-card">
        <div class="step-num">01</div>
        <div class="step-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <div class="step-title">Browse & filter</div>
        <p class="step-desc">Search by city, budget, and size. Every listing is verified and professionally photographed.</p>
      </div>
      <div class="step-card">
        <div class="step-num">02</div>
        <div class="step-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div class="step-title">Select your dates</div>
        <p class="step-desc">Pick check-in and check-out. Instant availability — no waiting for approval on most listings.</p>
      </div>
      <div class="step-card">
        <div class="step-num">03</div>
        <div class="step-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </div>
        <div class="step-title">Confirm & check in</div>
        <p class="step-desc">Pay securely, receive your access details, and walk right in. Our team is on call 24/7.</p>
      </div>
      <div class="step-card">
        <div class="step-num">04</div>
        <div class="step-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </div>
        <div class="step-title">Enjoy your stay</div>
        <p class="step-desc">Fully furnished, serviced, and move-in ready. Leave a review and earn loyalty rewards.</p>
      </div>
    </div>
  </div>
</section>

<!-- TESTIMONIALS -->

<section id="reviews">
  <div class="container">
    <div class="section-head">
      <div class="section-eyebrow">Guest reviews</div>
      <h2 class="section-title">Loved by <em>thousands</em></h2>
    </div>
    <div class="testi-grid">
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">"Booked a 3-bedroom in Jahi for a business trip. The apartment was spotless, check-in was seamless and the team responded within minutes. Will absolutely use Dandy again."</p>
        <div class="testi-author">
          <div class="testi-avatar" style="background:#E8D5B0;">A</div>
          <div>
            <div class="testi-name">Adaeze Okonkwo</div>
            <div class="testi-city">Abuja, Nigeria</div>
          </div>
        </div>
      </div>
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">"The Guzape apartment with the private cinema blew our minds. Perfect for our anniversary weekend. Pricing was fair and the host was incredibly responsive."</p>
        <div class="testi-author">
          <div class="testi-avatar" style="background:#C4D0DC;">K</div>
          <div>
            <div class="testi-name">Kelechi Eze</div>
            <div class="testi-city">Lagos, Nigeria</div>
          </div>
        </div>
      </div>
      <div class="testi-card">
        <div class="testi-stars">★★★★☆</div>
        <p class="testi-quote">"Stayed in a 1-bed in Life Camp for two weeks during a project. Compact but beautiful, great location and value. Dandy made the whole process incredibly easy."</p>
        <div class="testi-author">
          <div class="testi-avatar" style="background:#F5D5C5;">T</div>
          <div>
            <div class="testi-name">Tunde Fashola</div>
            <div class="testi-city">Port Harcourt, Nigeria</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- CTA -->

<section class="cta-section" id="contact">
  <div class="container">
    <div class="cta-inner">
      <div class="cta-text">
        <h2>Have a property to list?</h2>
        <p>Join 50+ trusted hosts earning from their spaces. We handle marketing, bookings, and guest support.</p>
      </div>
      <div class="cta-actions">
        <button class="btn-white">List Your Property</button>
        <button class="btn-outline-white">Talk to Us</button>
      </div>
    </div>
  </div>
</section>

<!-- FOOTER -->

<footer>
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <a href="#" class="nav-logo">Dan<span>dy</span></a>
        <p>Nigeria's premium shortlet platform. Verified apartments in Lagos, Abuja, and Port Harcourt — beautifully furnished and instantly bookable.</p>
      </div>
      <div class="footer-col">
        <h4>Browse</h4>
        <ul>
          <li><a href="#">Lagos shortlets</a></li>
          <li><a href="#">Abuja shortlets</a></li>
          <li><a href="#">Port Harcourt</a></li>
          <li><a href="#">All listings</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <ul>
          <li><a href="#">About us</a></li>
          <li><a href="#">Blog</a></li>
          <li><a href="#">Careers</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Support</h4>
        <ul>
          <li><a href="#">Help centre</a></li>
          <li><a href="#">Cancellation policy</a></li>
          <li><a href="#">Safety</a></li>
          <li><a href="#">Privacy policy</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Dandy Properties. All rights reserved.</span>
      <div class="social-links">
        <a href="#">Instagram</a>
        <a href="#">Twitter</a>
        <a href="#">Facebook</a>
        <a href="#">WhatsApp</a>
      </div>
    </div>
  </div>
</footer>

<!-- PROPERTY DETAIL MODAL -->

<div class="modal-overlay" id="modal-overlay" onclick="closeModal(event)">
  <div class="modal" id="modal">
    <div class="modal-head">
      <div class="modal-title" id="modal-title">Property Name</div>
      <button class="modal-close" onclick="document.getElementById('modal-overlay').classList.remove('open')">✕</button>
    </div>
    <img id="modal-img" class="modal-img" src="" alt="">
    <div class="modal-detail-row" id="modal-chips"></div>
    <p class="modal-desc" id="modal-desc"></p>
    <div class="modal-price-row">
      <div class="modal-price" id="modal-price"></div>
      <button class="btn-coral" onclick="alert('Booking system coming soon!')">Reserve Now</button>
    </div>
  </div>
</div>

<script>
const listings = [
  { id:1, title:"3-Bed Luxury Terrace with PS5 & Cinema", city:"Abuja", area:"Guzape", beds:3, baths:2, price:"₦290,000", tag:"abuja", badge:"Featured", img:"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80", rating:"5.0", desc:"A stunning 3-bedroom terrace in the upscale Guzape district, complete with a PlayStation 5 setup and a private home cinema. Fully air-conditioned, serviced weekly, and minutes from Transcorp Hilton.", amenities:["3 beds","2 baths","Private Cinema","PS5","WiFi"] },
  { id:2, title:"Modern 3-Bed Flat, Life Camp", city:"Abuja", area:"Life Camp", beds:3, baths:2, price:"₦120,000", tag:"abuja", badge:"Shortlet", img:"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", rating:"4.8", desc:"Spacious 3-bedroom apartment in the serene Life Camp neighbourhood. Open-plan living area, modern kitchen, high-speed internet, and a secured estate with 24hr power backup.", amenities:["3 beds","2 baths","24hr Power","WiFi","Kitchen"] },
  { id:3, title:"Elegant 2-Bed Apartment, Jahi", city:"Abuja", area:"Jahi", beds:2, baths:2, price:"₦210,000", tag:"abuja", badge:"Shortlet", img:"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80", rating:"4.9", desc:"Contemporary 2-bedroom apartment in quiet Jahi. Floor-to-ceiling windows, Italian furnishings, and a rooftop terrace with panoramic city views. Ideal for couples or small families.", amenities:["2 beds","2 baths","Rooftop","Gym Access","WiFi"] },
  { id:4, title:"Cosy 1-Bed Mini Flat, Life Camp", city:"Abuja", area:"Life Camp", beds:1, baths:1, price:"₦60,000", tag:"abuja", badge:"Best Value", img:"https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80", rating:"4.7", desc:"Affordable yet stylish 1-bedroom mini flat perfect for solo travellers or remote workers. Fast WiFi, self-contained, and walking distance to shopping malls and restaurants.", amenities:["1 bed","1 bath","WiFi","24hr Power","Kitchen"] },
  { id:5, title:"Luxury 3-Bed Flat with PS5, Jahi", city:"Abuja", area:"Jahi", beds:3, baths:3, price:"₦220,000", tag:"abuja", badge:"Shortlet", img:"https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&q=80", rating:"5.0", desc:"Upscale 3-bedroom flat complete with PS5, Netflix-ready smart TVs in every room, a fully equipped kitchen, and concierge service. Perfect for families or groups visiting Abuja.", amenities:["3 beds","3 baths","PS5","Smart TV","Pool"] },
  { id:6, title:"Stylish 1-Bed Flat, Wuye", city:"Abuja", area:"Wuye", beds:1, baths:1, price:"₦95,000", tag:"abuja", badge:"Shortlet", img:"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80", rating:"4.6", desc:"Contemporary 1-bedroom apartment in the bustling Wuye district. Designer furniture, high-speed internet, and a building with on-site gym and swimming pool.", amenities:["1 bed","1 bath","Pool","Gym","WiFi"] },
  { id:7, title:"Premium 3-Bed Penthouse, Lekki", city:"Lagos", area:"Lekki Phase 1", beds:3, baths:3, price:"₦350,000", tag:"lagos", badge:"Featured", img:"https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80", rating:"5.0", desc:"Breathtaking penthouse apartment on the 12th floor in Lekki Phase 1. Ocean views, wrap-around terrace, chef's kitchen, and dedicated concierge. The ultimate Lagos experience.", amenities:["3 beds","3 baths","Ocean View","Terrace","Concierge"] },
  { id:8, title:"Chic 2-Bed Studio, Victoria Island", city:"Lagos", area:"Victoria Island", beds:2, baths:2, price:"₦180,000", tag:"lagos", badge:"Shortlet", img:"https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80", rating:"4.8", desc:"Chic 2-bedroom apartment in the heart of Victoria Island. Walking distance to top restaurants, bars, and business offices. Perfect for business travellers and couples.", amenities:["2 beds","2 baths","WiFi","24hr Power","Parking"] },
  { id:9, title:"Spacious 1-Bed Apartment, Ikeja GRA", city:"Lagos", area:"Ikeja GRA", beds:1, baths:1, price:"₦75,000", tag:"lagos", badge:"Best Value", img:"https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80", rating:"4.5", desc:"Well-appointed 1-bedroom apartment in the prestigious Ikeja GRA. Quiet and secure, close to the airport — ideal for layovers or short business stays.", amenities:["1 bed","1 bath","WiFi","Power","Security"] },
  { id:10, title:"3-Bed Waterfront Flat, GRA", city:"Port Harcourt", area:"GRA Phase 2", beds:3, baths:2, price:"₦200,000", tag:"ph", badge:"Shortlet", img:"https://images.unsplash.com/photo-1571939228382-b2f2b585ce15?w=800&q=80", rating:"4.8", desc:"Elegant 3-bedroom apartment with waterfront views in Port Harcourt GRA Phase 2. Fully serviced with a generator backup, modern kitchen, and a dedicated parking space.", amenities:["3 beds","2 baths","Waterfront","Generator","Parking"] },
  { id:11, title:"Cosy 2-Bed Flat, Trans-Amadi", city:"Port Harcourt", area:"Trans-Amadi", beds:2, baths:1, price:"₦110,000", tag:"ph", badge:"Shortlet", img:"https://images.unsplash.com/photo-1527853787696-f7be74f2e39a?w=800&q=80", rating:"4.6", desc:"Comfortable 2-bedroom flat in Trans-Amadi, Port Harcourt. Close to major oil company offices, making it a favourite for industry professionals on assignment.", amenities:["2 beds","1 bath","WiFi","Kitchen","Security"] },
  { id:12, title:"1-Bed Studio, Old GRA", city:"Port Harcourt", area:"Old GRA", beds:1, baths:1, price:"₦85,000", tag:"ph", badge:"Best Value", img:"https://images.unsplash.com/photo-1533779283484-8ad4a1dbc139?w=800&q=80", rating:"4.7", desc:"Tastefully furnished studio apartment in the historic Old GRA. Peaceful neighbourhood, fully air-conditioned, with backup power and fast broadband internet.", amenities:["1 bed","1 bath","WiFi","AC","Power"] },
];

function renderCards(items) {
  const grid = document.getElementById('property-grid');
  grid.innerHTML = items.map(p => \`
    <div class="property-card" data-tag="\${p.tag}" onclick="openModal(\${p.id})">
      <img class="card-img" src="\${p.img}" alt="\${p.title}" loading="lazy">
      <div class="card-overlay"></div>
      <div class="card-badges">
        <span class="badge badge-type">Shortlet</span>
        \${p.badge === 'Featured' ? '<span class="badge badge-featured">★ Featured</span>' : ''}
        \${p.badge === 'Best Value' ? '<span class="badge badge-featured">Best Value</span>' : ''}
      </div>
      <button class="card-wishlist" onclick="event.stopPropagation()">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
      <div class="card-info">
        <div class="card-location">\${p.area} · \${p.city}</div>
        <div class="card-title">\${p.title}</div>
        <div class="card-meta">
          <div class="card-meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            \${p.beds} bed\${p.beds>1?'s':''}
          </div>
          <div class="card-meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 4H2v7h20V4z"/><path d="M2 11v11"/><path d="M22 11v3"/><path d="M6 22v-4"/><path d="M18 22v-3"/></svg>
            \${p.baths} bath\${p.baths>1?'s':''}
          </div>
          <div class="card-rating">★ \${p.rating}</div>
        </div>
        <div class="card-extras">
          <div class="card-price">\${p.price} <span>/ night</span></div>
          <button class="card-book-btn" onclick="event.stopPropagation();openModal(\${p.id})">View</button>
        </div>
      </div>
    </div>
  \`).join('');
  document.getElementById('filter-count').textContent = items.length + ' results';
}

function filterCards(btn, tag) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = tag === 'all' ? listings : listings.filter(l => {
    if(tag==='1bed') return l.beds===1;
    if(tag==='2bed') return l.beds===2;
    if(tag==='3bed') return l.beds===3;
    return l.tag===tag;
  });
  renderCards(filtered);
}

function openModal(id) {
  const p = listings.find(l=>l.id===id);
  if(!p) return;
  document.getElementById('modal-title').textContent = p.title;
  document.getElementById('modal-img').src = p.img;
  document.getElementById('modal-img').alt = p.title;
  document.getElementById('modal-desc').textContent = p.desc;
  document.getElementById('modal-price').innerHTML = p.price + ' <small>/ night</small>';
  document.getElementById('modal-chips').innerHTML = p.amenities.map(a=>
    \`<span class="modal-chip">\${a}</span>\`).join('');
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal(e) {
  if(e.target === document.getElementById('modal-overlay'))
    document.getElementById('modal-overlay').classList.remove('open');
}

// ── LOGIN FUNCTIONALITY ──

function openLoginModal(e) {
  e.preventDefault();
  document.getElementById('login-overlay').classList.remove('hidden');
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const remember = document.getElementById('remember').checked;
  
  const loginBtn = event.target.querySelector('.login-btn');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('dandyToken', data.token);
      localStorage.setItem('dandyUser', JSON.stringify(data.user));
      
      if(remember) {
        localStorage.setItem('dandyRemember', 'true');
      }
      
      closeLoginModal();
      updateNavbarWithUser(data.user);
      alert(\`✅ Welcome back, \${data.user.firstName || email.split('@')[0]}!\`);
    } else {
      alert(\`❌ \${data.error || 'Login failed'}\`);
    }
  } catch (err) {
    alert('❌ Error connecting to server. Make sure backend is running.');
    console.error('Login error:', err);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
}

function updateNavbarWithUser(user) {
  const navLinks = document.getElementById('nav-links');
  if(navLinks) {
    navLinks.innerHTML = \`
      <li><a href="#listings">Browse</a></li>
      <li><a href="#how">How it Works</a></li>
      <li><a href="#reviews">Reviews</a></li>
      <li style="display: flex; align-items: center; gap: 0.75rem;">
        <span style="color: var(--slate-light); font-size: 0.875rem;">👤 \${user.firstName || user.email}</span>
        <a href="#" class="nav-cta" onclick="logout(event)">Logout</a>
      </li>
    \`;
  }
}

function logout(event) {
  event.preventDefault();
  localStorage.removeItem('dandyToken');
  localStorage.removeItem('dandyUser');
  localStorage.removeItem('dandyRemember');
  location.reload();
}

function closeLoginModal() {
  const overlay = document.getElementById('login-overlay');
  overlay.classList.add('hidden');
}

function showSignup() {
  alert('Sign up coming soon! For now, you can test with any email and password (min 6 chars)');
}

// Check if user is already logged in
window.addEventListener('load', function() {
  const user = localStorage.getItem('dandyUser');
  const token = localStorage.getItem('dandyToken');
  const remember = localStorage.getItem('dandyRemember');
  
  if(user && token && remember === 'true') {
    setTimeout(() => {
      closeLoginModal();
      updateNavbarWithUser(JSON.parse(user));
    }, 300);
  }
  
  const overlay = document.getElementById('login-overlay');
  if(overlay) {
    overlay.addEventListener('click', function(e) {
      if(e.target === this) {
        closeLoginModal();
      }
    });
  }
  
  renderCards(listings);
});
</script>

</body>
</html>`;
}

// 404 handler
app.use((req, res) => {
res.status(404).json({ error: ‘Route not found’ });
});

// Start server
app.listen(PORT, () => {
console.log(’’);
console.log(‘╔════════════════════════════════════════════╗’);
console.log(‘║  🚀 DANDY BACKEND IS RUNNING            ║’);
console.log(‘╠════════════════════════════════════════════╣’);
console.log(`║  🌐 Open: http://localhost:${PORT}       ║`);
console.log(‘║  📚 API: http://localhost:’ + PORT + ‘/api/health  ║’);
console.log(‘║  🔐 Login with any email + password (6+)    ║’);
console.log(‘╚════════════════════════════════════════════╝’);
console.log(’’);
});