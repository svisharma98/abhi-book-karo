import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { db } from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const publicUser = ({ id, name, email, role, phone }) => ({ id, name, email, role, phone });

function validationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  next();
}

function createSession(user) {
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  return { token, user: publicUser(user) };
}

router.post("/register",
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Please enter your name."),
  body("email").trim().isEmail().withMessage("Please enter a valid email address."),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
  body("phone").optional({ values: "falsy" }).trim().isLength({ max: 30 }).withMessage("Phone number is too long."),
  validationErrors,
  (req, res, next) => {
    try {
      const { name, email, password, phone } = req.body;
      const user = db.prepare(
        "INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, 'client') RETURNING id, name, email, role, phone"
      ).get(name, email, bcrypt.hashSync(password, 12), phone || null);
      res.status(201).json(createSession(user));
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ message: "An account with this email already exists." });
      next(error);
    }
  }
);

router.post("/login",
  body("email").trim().isEmail().withMessage("Please enter a valid email address."),
  body("password").notEmpty().withMessage("Please enter your password."),
  validationErrors,
  (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(req.body.email);
    if (!user || !bcrypt.compareSync(req.body.password, user.password_hash)) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    res.json(createSession(user));
  }
);

router.get("/me", authenticate, (req, res) => {
  const user = db.prepare("SELECT id, name, email, role, phone FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(401).json({ message: "Account not found." });
  res.json({ user });
});

export default router;
