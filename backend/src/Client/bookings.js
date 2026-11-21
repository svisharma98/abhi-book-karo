import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import { randomBytes } from "node:crypto";
import { db } from "../db.js";
import { authenticate, requireClient } from "../middleware/auth.js";
import { bookingQuery, getBooking } from "../shared/bookingData.js";

const router = Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  next();
};

router.get("/", authenticate, requireClient, (req, res) => {
  const bookings = db.prepare(
    `${bookingQuery} WHERE b.user_id = ? ORDER BY b.created_at DESC`
  ).all(req.user.id);
  res.json({ bookings });
});

router.post("/",
  authenticate, requireClient,
  body("serviceId").isInt({ min: 1 }).withMessage("Please choose a service."),
  body("eventDate").isISO8601({ strict: true }).withMessage("Please choose a valid event date."),
  body("eventTime").matches(/^\d{2}:\d{2}$/).withMessage("Please choose a valid event time."),
  body("venue").trim().isLength({ min: 3, max: 250 }).withMessage("Please enter the event venue."),
  body("notes").optional({ values: "falsy" }).trim().isLength({ max: 1000 }).withMessage("Notes must be under 1,000 characters."),
  validate,
  (req, res) => {
    const { serviceId, eventDate, eventTime, venue, notes = "" } = req.body;
    if (eventDate < new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ message: "Please choose a date in the future." });
    }
    const service = db.prepare("SELECT id, price_from FROM services WHERE id = ? AND active = 1").get(serviceId);
    if (!service) return res.status(404).json({ message: "This service is not currently available." });
    const reference = `BK-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
    const booking = db.prepare(`
      INSERT INTO bookings (reference, user_id, service_id, event_date, event_time, venue, notes, total_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
    `).get(reference, req.user.id, service.id, eventDate, eventTime, venue, notes, service.price_from);
    res.status(201).json({ booking: getBooking.get(booking.id) });
  }
);

router.patch("/:id/price-offer-response",
  authenticate, requireClient,
  param("id").isInt({ min: 1 }),
  body("response").isIn(["accepted", "rejected"]).withMessage("Please accept or reject the price offer."),
  validate,
  (req, res) => {
    const booking = db.prepare("SELECT id, price_offer_amount, price_offer_status FROM bookings WHERE id = ? AND user_id = ?")
      .get(req.params.id, req.user.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (booking.price_offer_status !== "pending" || booking.price_offer_amount === null) {
      return res.status(409).json({ message: "There is no pending price offer to respond to." });
    }
    db.prepare(`
      UPDATE bookings SET price_offer_status = ?, total_amount = CASE WHEN ? = 'accepted' THEN price_offer_amount ELSE total_amount END
      WHERE id = ? AND user_id = ? AND price_offer_status = 'pending'
    `).run(req.body.response, req.body.response, req.params.id, req.user.id);
    res.json({ booking: getBooking.get(Number(req.params.id)) });
  }
);

router.get("/:id", authenticate, requireClient, param("id").isInt({ min: 1 }), validate, (req, res) => {
  const booking = getBooking.get(req.params.id);
  if (!booking || booking.userId !== req.user.id) {
    return res.status(404).json({ message: "Booking not found." });
  }
  res.json({ booking });
});

export default router;
