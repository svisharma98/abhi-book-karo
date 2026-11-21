import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const databaseFile = process.env.DATABASE_FILE || "./data/bookkareabhi.sqlite";
const resolvedDatabaseFile = path.resolve(here, "..", databaseFile);
fs.mkdirSync(path.dirname(resolvedDatabaseFile), { recursive: true });

export const db = new Database(resolvedDatabaseFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'owner', 'admin')),
    phone TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    price_from INTEGER NOT NULL DEFAULT 0 CHECK (price_from >= 0),
    category TEXT NOT NULL DEFAULT 'Events',
    featured INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    service_id INTEGER NOT NULL REFERENCES services(id),
    event_date TEXT NOT NULL,
    event_time TEXT NOT NULL,
    venue TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid'
      CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    total_amount INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON bookings(user_id);
  CREATE INDEX IF NOT EXISTS bookings_event_date_idx ON bookings(event_date);
`);

const userTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get()?.sql || "";
if (!userTableSql.includes("'client'") || !userTableSql.includes("'owner'")) {
  db.pragma("foreign_keys = OFF");
  try {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE COLLATE NOCASE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'owner', 'admin')),
          phone TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO users_new (id, name, email, password_hash, role, phone, created_at)
        SELECT id, name, email, password_hash,
          CASE role WHEN 'customer' THEN 'client' ELSE role END, phone, created_at
        FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
      `);
    }).immediate();
  } finally {
    db.pragma("foreign_keys = ON");
  }
}

if (db.pragma("foreign_key_check").length) {
  throw new Error("Database migration found invalid booking references.");
}

const bookingColumns = new Set(db.prepare("PRAGMA table_info(bookings)").all().map(({ name }) => name));
if (!bookingColumns.has("decision_status")) {
  db.exec("ALTER TABLE bookings ADD COLUMN decision_status TEXT NOT NULL DEFAULT 'pending' CHECK (decision_status IN ('pending', 'accepted', 'rejected'))");
  db.exec("UPDATE bookings SET decision_status = CASE status WHEN 'confirmed' THEN 'accepted' WHEN 'cancelled' THEN 'rejected' ELSE 'pending' END");
}
if (!bookingColumns.has("price_offer_amount")) {
  db.exec("ALTER TABLE bookings ADD COLUMN price_offer_amount INTEGER CHECK (price_offer_amount IS NULL OR price_offer_amount >= 0)");
}
if (!bookingColumns.has("price_offer_message")) {
  db.exec("ALTER TABLE bookings ADD COLUMN price_offer_message TEXT");
}
if (!bookingColumns.has("price_offer_status")) {
  db.exec("ALTER TABLE bookings ADD COLUMN price_offer_status TEXT NOT NULL DEFAULT 'none' CHECK (price_offer_status IN ('none', 'pending', 'accepted', 'rejected'))");
}
if (!bookingColumns.has("customer_name")) {
  db.exec("ALTER TABLE bookings ADD COLUMN customer_name TEXT");
}
if (!bookingColumns.has("customer_email")) {
  db.exec("ALTER TABLE bookings ADD COLUMN customer_email TEXT");
}
if (!bookingColumns.has("customer_phone")) {
  db.exec("ALTER TABLE bookings ADD COLUMN customer_phone TEXT");
}

const seedServices = [
  ["Van Booking", "van-booking", "Comfortable, reliable vans for wedding guests, family trips, and group travel.", "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1200&q=85", 4500, "Travel", 1],
  ["Band Baja Booking", "band-baja-booking", "Bring your baraat to life with a vibrant traditional band and professional performers.", "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=85", 18000, "Celebrations", 1],
  ["Rath Booking", "rath-booking", "Make a grand entrance with a beautifully presented ceremonial wedding rath.", "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85", 12000, "Celebrations", 0],
  ["DJ Booking", "dj-booking", "Get the celebration started with a skilled DJ, premium sound, and a dance-floor-ready set.", "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=85", 9000, "Entertainment", 1],
  ["Tent House Booking", "tent-house-booking", "Beautiful, practical event spaces with tenting and arrangements tailored to your occasion.", "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=85", 25000, "Event setup", 1],
  ["Decoration Booking", "decoration-booking", "Thoughtful floral and venue decoration designed around your event and your style.", "https://images.unsplash.com/photo-1478146896981-b80fe463b330?auto=format&fit=crop&w=1200&q=85", 15000, "Event setup", 0],
  ["Photographer Booking", "photographer-booking", "Capture candid moments and the details you will want to remember.", "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1200&q=85", 10000, "Photography", 1],
  ["Other Custom Services", "other-custom-services", "Looking for something special? Tell us what you have in mind and we will help plan it.", "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=85", 0, "Custom", 0]
];

const insertService = db.prepare(`
  INSERT OR IGNORE INTO services (name, slug, description, image_url, price_from, category, featured)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const seed = db.transaction(() => {
  for (const service of seedServices) insertService.run(...service);
  const email = process.env.ADMIN_EMAIL || "admin@bookkareabhi.com";
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (!existing) {
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
      throw new Error("Set ADMIN_PASSWORD to a unique password with at least 12 characters before first startup.");
    }
    db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')")
      .run(process.env.ADMIN_NAME || "Book Kare Abhi Admin", email, bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12));
  }
  const demoUsers = [
    ["Demo Client", "test@client.com", "client"],
    ["Demo Owner", "test@owner.com", "owner"],
    ["Demo Admin", "test@admin.com", "admin"]
  ];
  const insertDemoUser = db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, ?)
  `);
  for (const [name, demoEmail, role] of demoUsers) {
    insertDemoUser.run(name, demoEmail, bcrypt.hashSync("test12345", 12), role);
  }
});
seed();
db.prepare(`
  UPDATE services SET image_url = ?
  WHERE slug = 'dj-booking' AND image_url LIKE '%photo-1571266028243-d220c9c3b9c9%'
`).run("https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=85");
