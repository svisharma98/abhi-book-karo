import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import { randomBytes } from "node:crypto";
import { db } from "../db.js";
import { authenticate, requireOwner } from "../middleware/auth.js";
import { bookingQuery, getBookingWithPayments } from "../shared/bookingData.js";

const router = Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  next();
};

router.get("/", authenticate, (req, res, next) => {
  if (req.user.role !== "owner") return next();
  const bookings = db.prepare(`${bookingQuery} ORDER BY b.event_date DESC, b.event_time`).all();
  res.json({ bookings });
});

router.get("/summary", authenticate, requireOwner, (req, res) => {
  const totals = db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN decision_status = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN decision_status = 'accepted' THEN 1 ELSE 0 END) AS confirmed,
      SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) AS revenue
    FROM bookings
  `).get();
  const recent = db.prepare(`${bookingQuery} ORDER BY b.created_at DESC LIMIT 6`).all();
  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS bookings,
      SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) AS revenue
    FROM bookings GROUP BY month ORDER BY month DESC LIMIT 6
  `).all().reverse();
  const popular = db.prepare(`
    SELECT s.name, COUNT(b.id) AS bookings FROM services s
    LEFT JOIN bookings b ON b.service_id = s.id GROUP BY s.id ORDER BY bookings DESC LIMIT 5
  `).all();
  res.json({ totals, recent, monthly, popular });
});

router.post("/manual",
  authenticate, requireOwner,
  body("serviceId").isInt({ min: 1 }).withMessage("Please choose a service."),
  body("eventDate").isISO8601({ strict: true }).withMessage("Please choose a valid event date."),
  body("eventTime").matches(/^\d{2}:\d{2}$/).withMessage("Please choose a valid event time."),
  body("fromLocation").trim().isLength({ min: 2, max: 250 }).withMessage("Please enter the starting location."),
  body("toLocation").trim().isLength({ min: 2, max: 250 }).withMessage("Please enter the destination."),
  body("customerName").trim().isLength({ min: 2, max: 100 }).withMessage("Please enter the customer's name."),
  body("customerEmail").trim().isEmail().withMessage("Please enter a valid customer email address."),
  body("customerPhone").trim().isLength({ min: 7, max: 30 }).withMessage("Please enter a valid mobile number."),
  body("totalAmount").isInt({ min: 0 }).withMessage("Enter a valid total booking amount."),
  body("advanceAmount").isInt({ min: 0 }).withMessage("Enter a valid advanced amount."),
  body("notes").optional({ values: "falsy" }).trim().isLength({ max: 1000 }).withMessage("Notes must be under 1,000 characters."),
  validate,
  (req, res) => {
    const {
      serviceId, eventDate, eventTime, fromLocation, toLocation,
      customerName, customerEmail, customerPhone, totalAmount, advanceAmount, notes = ""
    } = req.body;
    if (Number(advanceAmount) > Number(totalAmount)) {
      return res.status(400).json({ message: "Advanced amount cannot exceed the total booking amount." });
    }
    if (eventDate < new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ message: "Please choose a date in the future." });
    }
    const service = db.prepare("SELECT id, price_from FROM services WHERE id = ? AND active = 1").get(serviceId);
    if (!service) return res.status(404).json({ message: "This service is not currently available." });
    const existingBooking = db.prepare(
      "SELECT id FROM bookings WHERE event_date = ? AND decision_status = 'accepted' LIMIT 1"
    ).get(eventDate);
    if (existingBooking) return res.status(409).json({ message: "This date is already booked." });

    const reference = `BK-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
    const createBooking = db.transaction(() => {
      const booking = db.prepare(`
        INSERT INTO bookings (
          reference, user_id, service_id, event_date, event_time, venue,
          from_location, to_location, notes, total_amount, advance_amount, decision_status, status,
          customer_name, customer_email, customer_phone
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted', 'confirmed', ?, ?, ?)
        RETURNING id
      `).get(
        reference, req.user.id, service.id, eventDate, eventTime, toLocation,
        fromLocation, toLocation, notes, totalAmount, advanceAmount,
        customerName, customerEmail, customerPhone
      );
      if (Number(advanceAmount) > 0) {
        db.prepare(`
          INSERT INTO booking_payments (booking_id, amount, note) VALUES (?, ?, ?)
        `).run(booking.id, advanceAmount, "Initial payment");
        if (Number(advanceAmount) >= Number(totalAmount)) {
          db.prepare("UPDATE bookings SET payment_status = 'paid' WHERE id = ?").run(booking.id);
        }
      }
      return booking.id;
    });
    const bookingId = createBooking();
    res.status(201).json({ booking: getBookingWithPayments(bookingId) });
  }
);

router.patch("/:id/amounts",
  authenticate, requireOwner,
  param("id").isInt({ min: 1 }),
  body("totalAmount").isInt({ min: 0 }).withMessage("Enter a valid total booking amount."),
  validate,
  (req, res) => {
    const updateTotal = db.transaction(() => {
      const current = db.prepare(`
        SELECT b.id, COALESCE(SUM(p.amount), 0) AS paid_amount
        FROM bookings b LEFT JOIN booking_payments p ON p.booking_id = b.id
        WHERE b.id = ? GROUP BY b.id
      `).get(req.params.id);
      if (!current) return { error: "not_found" };
      if (Number(req.body.totalAmount) < current.paid_amount) return { error: "below_paid" };
      db.prepare(`
        UPDATE bookings SET total_amount = ?, payment_status = ?
        WHERE id = ?
      `).run(
        req.body.totalAmount,
        current.paid_amount >= Number(req.body.totalAmount) ? "paid" : "unpaid",
        req.params.id
      );
      return { success: true };
    });
    const result = updateTotal();
    if (result.error === "not_found") return res.status(404).json({ message: "Booking not found." });
    if (result.error === "below_paid") {
      return res.status(400).json({ message: "Total booking amount cannot be less than payments already received." });
    }
    res.json({ booking: getBookingWithPayments(Number(req.params.id)) });
  }
);

router.post("/:id/payments",
  authenticate, requireOwner,
  param("id").isInt({ min: 1 }),
  body("amount").isInt({ min: 1 }).withMessage("Enter a payment amount greater than zero."),
  body("paymentDate").optional({ values: "falsy" }).isISO8601({ strict: true }).withMessage("Enter a valid payment date."),
  body("note").optional({ values: "falsy" }).trim().isLength({ max: 250 }).withMessage("Payment note must be under 250 characters."),
  validate,
  (req, res) => {
    const { amount, paymentDate, note = "" } = req.body;
    const recordPayment = db.transaction(() => {
      const booking = db.prepare(`
        SELECT b.total_amount AS totalAmount, COALESCE(SUM(p.amount), 0) AS paidAmount
        FROM bookings b LEFT JOIN booking_payments p ON p.booking_id = b.id
        WHERE b.id = ? GROUP BY b.id
      `).get(req.params.id);
      if (!booking) return { error: "not_found" };
      if (Number(amount) > booking.totalAmount - booking.paidAmount) return { error: "exceeds_due" };
      db.prepare(`
        INSERT INTO booking_payments (booking_id, amount, payment_date, note)
        VALUES (?, ?, COALESCE(?, date('now')), ?)
      `).run(req.params.id, amount, paymentDate || null, note || null);
      const paidAmount = booking.paidAmount + Number(amount);
      db.prepare("UPDATE bookings SET payment_status = ? WHERE id = ?")
        .run(paidAmount >= booking.totalAmount ? "paid" : "unpaid", req.params.id);
      return { success: true };
    });
    const result = recordPayment();
    if (result.error === "not_found") return res.status(404).json({ message: "Booking not found." });
    if (result.error === "exceeds_due") {
      return res.status(400).json({ message: "Payment cannot exceed the remaining due amount." });
    }
    res.status(201).json({ booking: getBookingWithPayments(Number(req.params.id)) });
  }
);

router.patch("/:id/decision",
  authenticate, requireOwner,
  param("id").isInt({ min: 1 }),
  body("decision").isIn(["accepted", "rejected"]).withMessage("Choose accept or reject."),
  validate,
  (req, res) => {
    const status = req.body.decision === "accepted" ? "confirmed" : "cancelled";
    const result = db.prepare(
      "UPDATE bookings SET decision_status = ?, status = ? WHERE id = ?"
    ).run(req.body.decision, status, req.params.id);
    if (!result.changes) return res.status(404).json({ message: "Booking not found." });
    res.json({ booking: getBookingWithPayments(Number(req.params.id)) });
  }
);

router.patch("/:id/price-offer",
  authenticate, requireOwner,
  param("id").isInt({ min: 1 }),
  body("amount").isInt({ min: 0 }).withMessage("Offer must be a non-negative whole number."),
  body("message").optional({ values: "falsy" }).trim().isLength({ max: 500 }).withMessage("Message must be under 500 characters."),
  validate,
  (req, res) => {
    const booking = db.prepare(`
      SELECT b.id, COALESCE(SUM(p.amount), 0) AS paidAmount
      FROM bookings b LEFT JOIN booking_payments p ON p.booking_id = b.id
      WHERE b.id = ? GROUP BY b.id
    `).get(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (Number(req.body.amount) < booking.paidAmount) {
      return res.status(400).json({ message: "Price offer cannot be lower than payments already received." });
    }
    const result = db.prepare(`
      UPDATE bookings SET price_offer_amount = ?, price_offer_message = ?, price_offer_status = 'pending'
      WHERE id = ?
    `).run(req.body.amount, req.body.message || null, req.params.id);
    if (!result.changes) return res.status(404).json({ message: "Booking not found." });
    res.json({ booking: getBookingWithPayments(Number(req.params.id)) });
  }
);

router.patch("/:id/status",
  authenticate, requireOwner,
  param("id").isInt({ min: 1 }),
  body("status").isIn(["pending", "confirmed", "completed", "cancelled"]).withMessage("Invalid booking status."),
  body("paymentStatus").optional().isIn(["unpaid", "paid", "refunded"]).withMessage("Invalid payment status."),
  validate,
  (req, res) => {
    const result = db.prepare(`
      UPDATE bookings SET status = ?, payment_status = COALESCE(?, payment_status) WHERE id = ?
    `).run(req.body.status, req.body.paymentStatus || null, req.params.id);
    if (!result.changes) return res.status(404).json({ message: "Booking not found." });
    res.json({ booking: getBookingWithPayments(Number(req.params.id)) });
  }
);

router.get("/:id", authenticate, (req, res, next) => {
  if (req.user.role !== "owner") return next();
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: "Invalid booking ID." });
  const booking = getBookingWithPayments(id);
  if (!booking) return res.status(404).json({ message: "Booking not found." });
  res.json({ booking });
});

export default router;
