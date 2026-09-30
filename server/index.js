import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 4000;
const uploadsDir = path.join(__dirname, 'uploads');
const dbPath = path.join(__dirname, 'orbit.db');

fs.mkdirSync(uploadsDir, { recursive: true });

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK(type IN ('lost', 'found')),
    category TEXT NOT NULL,
    location_name TEXT,
    latitude REAL,
    longitude REAL,
    image_url TEXT,
    image_hash TEXT,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    matched_item_id INTEGER NOT NULL,
    score REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_id) REFERENCES items(id),
    FOREIGN KEY(matched_item_id) REFERENCES items(id)
  );
`);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname) || '.png';
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 100000)}${extension}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function generateImageHash(filePath) {
  try {
    const buffer = await sharp(filePath)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .toBuffer();

    const pixels = Array.from(buffer);
    const mean = pixels.reduce((sum, value) => sum + value, 0) / pixels.length;
    const bits = pixels.map((value) => (value >= mean ? '1' : '0')).join('');
    return bits;
  } catch (error) {
    return null;
  }
}

function hammingSimilarity(hashA, hashB) {
  if (!hashA || !hashB || hashA.length !== hashB.length) return 0;

  let difference = 0;
  for (let index = 0; index < hashA.length; index += 1) {
    if (hashA[index] !== hashB[index]) difference += 1;
  }

  return 1 - difference / hashA.length;
}

function buildLocationScore(latA, lonA, latB, lonB) {
  if (!latA || !latB || !lonA || !lonB) return 0.5;

  const distance = calculateDistanceKm(latA, lonA, latB, lonB);
  if (distance <= 0.5) return 1;
  if (distance <= 2) return 0.8;
  if (distance <= 5) return 0.6;
  if (distance <= 10) return 0.4;
  return 0.2;
}

function findMatchesForItem(item) {
  const rows = db.prepare(`
    SELECT * FROM items
    WHERE id != ?
      AND status = 'open'
      AND type != ?
      AND category = ?
    ORDER BY created_at DESC
  `).all(item.id, item.type, item.category);

  const matches = rows
    .map((candidate) => {
      const imageSimilarity = hammingSimilarity(item.image_hash, candidate.image_hash);
      const locationScore = buildLocationScore(
        Number(item.latitude),
        Number(item.longitude),
        Number(candidate.latitude),
        Number(candidate.longitude)
      );
      const combined = (imageSimilarity * 0.7) + (locationScore * 0.3);

      return {
        ...candidate,
        score: Number(combined.toFixed(2))
      };
    })
    .filter((candidate) => candidate.score >= 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return matches;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Orbit backend is running.' });
});

app.get('/api/items', (_req, res) => {
  const items = db.prepare(`
    SELECT * FROM items
    ORDER BY created_at DESC
  `).all();

  res.json({ items });
});

app.get('/api/items/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) {
    return res.status(404).json({ message: 'Item not found' });
  }

  return res.json({ item });
});

app.post('/api/items', upload.single('image'), async (req, res) => {
  const {
    title,
    description,
    type,
    category,
    locationName,
    latitude,
    longitude
  } = req.body;

  if (!title || !type || !category) {
    return res.status(400).json({ message: 'Title, type and category are required.' });
  }

  if (!['lost', 'found'].includes(type)) {
    return res.status(400).json({ message: 'Type must be lost or found.' });
  }

  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
  const hash = imagePath ? await generateImageHash(path.join(uploadsDir, req.file.filename)) : null;

  const statement = db.prepare(`
    INSERT INTO items (
      title,
      description,
      type,
      category,
      location_name,
      latitude,
      longitude,
      image_url,
      image_hash,
      status,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', datetime('now'))
  `);

  const result = statement.run(
    title,
    description || '',
    type,
    category,
    locationName || '',
    Number(latitude) || null,
    Number(longitude) || null,
    imagePath,
    hash
  );

  const newItem = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
  const matches = findMatchesForItem(newItem);

  return res.status(201).json({ item: newItem, matches });
});

app.post('/api/items/:id/resolve', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) {
    return res.status(404).json({ message: 'Item not found' });
  }

  db.prepare(`UPDATE items SET status = 'resolved' WHERE id = ?`).run(req.params.id);
  return res.json({ message: 'Item marked as resolved.' });
});

app.listen(port, () => {
  console.log(`Orbit backend is running on http://localhost:${port}`);
});
