import jwt from "jsonwebtoken";

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Please sign in to continue." });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Administrator access is required." });
  next();
}

export function requireOwner(req, res, next) {
  if (req.user?.role !== "owner") return res.status(403).json({ message: "Owner access is required." });
  next();
}

export function requireClient(req, res, next) {
  if (!["client", "customer"].includes(req.user?.role)) return res.status(403).json({ message: "Client access is required." });
  next();
}
