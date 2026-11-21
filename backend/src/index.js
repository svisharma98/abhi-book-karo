import "./config.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./Website/auth.js";
import serviceRoutes from "./Owner/services.js";
import ownerBookingRoutes from "./Owner/bookings.js";
import clientBookingRoutes from "./Client/bookings.js";
import userRoutes from "./Admin/users.js";
import "./db.js";

const app = express();
const frontendDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../frontend/dist");
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      imgSrc: ["'self'", "data:", "https:"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "100kb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }), authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", ownerBookingRoutes);
app.use("/api/bookings", clientBookingRoutes);
app.use("/api/users", userRoutes);
app.get("/api/health", (req, res) => res.json({ status: "ok", service: "Book Kare Abhi API" }));

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use((req, res) => res.status(404).json({ message: "The requested endpoint was not found." }));
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`Book Kare Abhi API listening on http://localhost:${port}`));
