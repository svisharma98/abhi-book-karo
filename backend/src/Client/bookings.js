import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import { randomBytes } from "node:crypto";
import { db } from "../db.js";
import { authenticate, requireClient } from "../middleware/auth.js";
import { bookingQuery, getBookingWithPayments } from "../shared/bookingData.js";

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
  body("customerName").trim().isLength({ min: 2, max: 100 }).withMessage("Please enter your name."),
  body("customerEmail").trim().isEmail().withMessage("Please enter a valid email address."),
  body("customerPhone").trim().isLength({ min: 7, max: 30 }).withMessage("Please enter a valid mobile number."),
  body("fromLocation").trim().isLength({ min: 2, max: 250 }).withMessage("Please enter the starting location."),
  body("toLocation").trim().isLength({ min: 2, max: 250 }).withMessage("Please enter the destination."),
  body("notes").optional({ values: "falsy" }).trim().isLength({ max: 1000 }).withMessage("Notes must be under 1,000 characters."),
  validate,
  (req, res) => {
    const {
      serviceId, eventDate, eventTime, customerName, customerEmail, customerPhone,
      fromLocation, toLocation, notes = ""
    } = req.body;
    if (eventDate < new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ message: "Please choose a date in the future." });
    }
    const service = db.prepare("SELECT id, price_from FROM services WHERE id = ? AND active = 1").get(serviceId);
    if (!service) return res.status(404).json({ message: "This service is not currently available." });
    const reference = `BK-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
    const booking = db.prepare(`
      INSERT INTO bookings (
        reference, user_id, service_id, event_date, event_time, venue,
        from_location, to_location, notes, total_amount, customer_name, customer_email, customer_phone
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
    `).get(
      reference, req.user.id, service.id, eventDate, eventTime, toLocation,
      fromLocation, toLocation, notes, service.price_from,
      customerName, customerEmail, customerPhone
    );
    res.status(201).json({ booking: getBookingWithPayments(booking.id) });
  }
);

router.patch("/:id/price-offer-response",
  authenticate, requireClient,
  param("id").isInt({ min: 1 }),
  body("response").isIn(["accepted", "rejected"]).withMessage("Please accept or reject the price offer."),
  validate,
  (req, res) => {
    const booking = db.prepare(`
      SELECT b.id, b.price_offer_amount, b.price_offer_status,
        COALESCE(SUM(p.amount), 0) AS paid_amount
      FROM bookings b LEFT JOIN booking_payments p ON p.booking_id = b.id
      WHERE b.id = ? AND b.user_id = ? GROUP BY b.id
    `)
      .get(req.params.id, req.user.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (booking.price_offer_status !== "pending" || booking.price_offer_amount === null) {
      return res.status(409).json({ message: "There is no pending price offer to respond to." });
    }
    if (req.body.response === "accepted" && booking.price_offer_amount < booking.paid_amount) {
      return res.status(409).json({ message: "The accepted offer cannot be lower than payments already received. Please contact the owner." });
    }
    db.prepare(`
      UPDATE bookings SET
        price_offer_status = ?,
        total_amount = CASE WHEN ? = 'accepted' THEN price_offer_amount ELSE total_amount END,
        payment_status = CASE
          WHEN ? = 'accepted' AND price_offer_amount <= (
            SELECT COALESCE(SUM(amount), 0) FROM booking_payments WHERE booking_id = bookings.id
          ) THEN 'paid'
          WHEN ? = 'accepted' THEN 'unpaid'
          ELSE payment_status
        END
      WHERE id = ? AND user_id = ? AND price_offer_status = 'pending'
    `).run(req.body.response, req.body.response, req.body.response, req.body.response, req.params.id, req.user.id);
    res.json({ booking: getBookingWithPayments(Number(req.params.id)) });
  }
);

router.get("/:id", authenticate, requireClient, param("id").isInt({ min: 1 }), validate, (req, res) => {
  const booking = getBookingWithPayments(req.params.id);
  if (!booking || booking.userId !== req.user.id) {
    return res.status(404).json({ message: "Booking not found." });
  }
  res.json({ booking });
});

export default router;
