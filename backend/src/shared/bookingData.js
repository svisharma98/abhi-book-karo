import { db } from "../db.js";

const bookingFields = `
  b.id, b.reference, b.service_id AS serviceId,
  b.event_date AS eventDate, b.event_time AS eventTime,
  b.venue, b.notes, b.status, b.decision_status AS decisionStatus,
  b.price_offer_amount AS priceOfferAmount, b.price_offer_message AS priceOfferMessage,
  b.price_offer_status AS priceOfferStatus, b.payment_status AS paymentStatus,
  b.total_amount AS totalAmount, b.created_at AS createdAt,
  s.name AS serviceName, s.image_url AS serviceImage,
  u.id AS userId,
  COALESCE(b.customer_name, u.name) AS customerName,
  COALESCE(b.customer_email, u.email) AS customerEmail,
  COALESCE(b.customer_phone, u.phone) AS customerPhone
`;

export const bookingQuery = `
  SELECT ${bookingFields} FROM bookings b
  JOIN services s ON s.id = b.service_id JOIN users u ON u.id = b.user_id
`;

export const getBooking = db.prepare(`${bookingQuery} WHERE b.id = ?`);
