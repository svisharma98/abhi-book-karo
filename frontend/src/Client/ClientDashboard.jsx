import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Paper, Stack, Typography
} from "@mui/material";
import { ArrowForward, CalendarMonth, Logout, ShoppingBag } from "@mui/icons-material";
import { Link, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import "./client.css";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bka-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const formatDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
  day: "numeric", month: "short", year: "numeric"
});

function BookingList({ bookings, loading }) {
  if (loading) return <Box className="client-empty"><CircularProgress size={26} /></Box>;
  if (!bookings.length) return <Box className="client-empty">
    <CalendarMonth />
    <Typography variant="h6">No booking requests yet</Typography>
    <Typography color="text.secondary">When you request a service, it will appear here.</Typography>
    <Button component={Link} to="/services" variant="contained">Browse services</Button>
  </Box>;
  return <div className="client-booking-list">{bookings.map((booking) => <Paper key={booking.id} className="client-booking" elevation={0}>
    <img src={booking.serviceImage} alt="" />
    <Box className="client-booking-info">
      <Typography className="client-reference">{booking.reference}</Typography>
      <Typography variant="h6">{booking.serviceName}</Typography>
      <Typography color="text.secondary">
        {formatDate(booking.eventDate)} · {booking.eventTime} · {booking.fromLocation && booking.toLocation
          ? `${booking.fromLocation} → ${booking.toLocation}`
          : booking.venue}
      </Typography>
      <Typography color="text.secondary">
        Total: ₹{booking.totalAmount} · Paid: ₹{booking.paidAmount} · Due: ₹{booking.dueAmount}
      </Typography>
      {booking.priceOfferStatus === "pending" && <Typography className="client-offer">Owner price offer: ₹{booking.priceOfferAmount}</Typography>}
    </Box>
    <Chip label={booking.decisionStatus === "accepted" ? "Accepted" : booking.decisionStatus === "rejected" ? "Declined" : booking.status} />
    <Button component={Link} to={`/booking/${booking.id}`} aria-label={`View ${booking.reference}`}><ArrowForward /></Button>
  </Paper>)}</div>;
}

export default function ClientDashboard({ user, logout }) {
  const location = useLocation();
  const isRequestsPage = location.pathname === "/client/bookings";
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/bookings");
      setBookings(data.bookings);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load your booking requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const accepted = bookings.filter((booking) => booking.decisionStatus === "accepted").length;
  const pending = bookings.filter((booking) => booking.decisionStatus === "pending").length;

  return <Box className="client-panel">
    <header className="client-header">
      <Link to="/client" className="client-brand"><span className="client-brand-mark">B</span>Book Kare Abhi</Link>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar>{user.name?.[0]}</Avatar>
        <Box className="client-header-user"><Typography fontWeight={700}>{user.name}</Typography><Typography variant="caption">Client account</Typography></Box>
        <Button onClick={() => { logout(); toast.info("You’re signed out."); }} startIcon={<Logout />}>Sign out</Button>
      </Stack>
    </header>
    <Box className="client-content">
      <nav className="client-nav">
        <Link className={!isRequestsPage ? "active" : ""} to="/client"><ShoppingBag /> Overview</Link>
        <Link className={isRequestsPage ? "active" : ""} to="/client/bookings"><CalendarMonth /> All booking requests</Link>
        <Link to="/services">Browse services <ArrowForward /></Link>
      </nav>
      <main>
        <Box className="client-title">
          <Typography className="client-eyebrow">CLIENT PORTAL</Typography>
          <Typography variant="h4">{isRequestsPage ? "All booking requests" : `Welcome, ${user.name?.split(" ")[0] || "back"}`}</Typography>
          <Typography color="text.secondary">{isRequestsPage ? "Every request you have made, with its latest status." : "Your event plans and booking requests, together in one place."}</Typography>
        </Box>
        {!isRequestsPage && <div className="client-metrics">
          {[["All requests", bookings.length], ["Awaiting response", pending], ["Accepted", accepted]].map(([label, count]) => <Paper key={label} elevation={0}><Typography>{label}</Typography><strong>{loading ? "—" : count}</strong></Paper>)}
        </div>}
        {error ? <Alert severity="error" action={<Button onClick={loadBookings}>Retry</Button>}>{error}</Alert> : <Paper className="client-requests" elevation={0}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" className="client-requests-heading">
            <Box><Typography variant="h6">{isRequestsPage ? "Your requests" : "Your booking requests"}</Typography><Typography color="text.secondary">Only you can see these requests.</Typography></Box>
            {!isRequestsPage && <Chip label={`${bookings.length} total`} />}
          </Stack>
          <BookingList bookings={bookings} loading={loading} />
        </Paper>}
      </main>
    </Box>
  </Box>;
}
