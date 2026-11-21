import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { db } from "../db.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/summary", (req, res) => {
  const users = db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN role = 'client' THEN 1 ELSE 0 END) AS clients,
      SUM(CASE WHEN role = 'owner' THEN 1 ELSE 0 END) AS owners,
      SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins
    FROM users
  `).get();
  const bookings = db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN decision_status = 'pending' THEN 1 ELSE 0 END) AS pending
    FROM bookings
  `).get();
  res.json({ users, bookings });
});

router.get("/", (req, res) => {
  const rows = db.prepare(`
    SELECT id, name, email, role, phone, created_at AS createdAt
    FROM users ORDER BY created_at DESC, id DESC
  `).all();
  res.json({ users: rows });
});

export default router;
