import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import { db } from "../db.js";
import { authenticate, requireOwner } from "../middleware/auth.js";

const router = Router();
const fields = "id, name, slug, description, image_url AS imageUrl, price_from AS priceFrom, category, featured, active, created_at AS createdAt";
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  next();
};
const serviceRules = [
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Service name must be 2–100 characters."),
  body("slug").trim().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage("Use a lowercase, hyphen-separated slug."),
  body("description").trim().isLength({ min: 10, max: 2000 }).withMessage("Description must be at least 10 characters."),
  body("imageUrl").trim().isURL({ protocols: ["http", "https"] }).withMessage("Please provide a valid image URL."),
  body("priceFrom").isInt({ min: 0 }).withMessage("Starting price must be a non-negative whole number."),
  body("category").trim().isLength({ min: 2, max: 60 }).withMessage("Please enter a category."),
  body("featured").optional().isBoolean(),
  body("active").optional().isBoolean()
];

router.get("/", (req, res) => {
  res.json({ services: db.prepare(`SELECT ${fields} FROM services WHERE active = 1 ORDER BY featured DESC, name`).all() });
});

router.get("/manage", authenticate, requireOwner, (req, res) => {
  res.json({ services: db.prepare(`SELECT ${fields} FROM services ORDER BY active DESC, featured DESC, name`).all() });
});

router.get("/:slug", param("slug").trim().notEmpty(), validate, (req, res) => {
  const service = db.prepare(`SELECT ${fields} FROM services WHERE slug = ? AND active = 1`).get(req.params.slug);
  if (!service) return res.status(404).json({ message: "We could not find that service." });
  res.json({ service });
});

router.post("/", authenticate, requireOwner, serviceRules, validate, (req, res, next) => {
  try {
    const { name, slug, description, imageUrl, priceFrom, category, featured = false, active = true } = req.body;
    const service = db.prepare(`
      INSERT INTO services (name, slug, description, image_url, price_from, category, featured, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING ${fields}
    `).get(name, slug, description, imageUrl, priceFrom, category, Number(featured), Number(active));
    res.status(201).json({ service });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ message: "A service with this slug already exists." });
    next(error);
  }
});

router.put("/:id", authenticate, requireOwner, param("id").isInt({ min: 1 }), serviceRules, validate, (req, res, next) => {
  try {
    const { name, slug, description, imageUrl, priceFrom, category, featured = false, active = true } = req.body;
    const service = db.prepare(`
      UPDATE services SET name = ?, slug = ?, description = ?, image_url = ?, price_from = ?,
        category = ?, featured = ?, active = ? WHERE id = ? RETURNING ${fields}
    `).get(name, slug, description, imageUrl, priceFrom, category, Number(featured), Number(active), req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found." });
    res.json({ service });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ message: "A service with this slug already exists." });
    next(error);
  }
});

router.delete("/:id", authenticate, requireOwner, param("id").isInt({ min: 1 }), validate, (req, res) => {
  const result = db.prepare("UPDATE services SET active = 0 WHERE id = ?").run(req.params.id);
  if (!result.changes) return res.status(404).json({ message: "Service not found." });
  res.status(204).end();
});

export default router;
