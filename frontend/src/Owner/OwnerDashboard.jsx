import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, MenuItem, Paper, Stack, TextField,
  Tooltip, Typography
} from "@mui/material";
import {
  AccessTime, ArrowForward, CalendarMonth, Check, CheckCircle, ChevronLeft, ChevronRight, Close, Dashboard,
  Description, Email, EventAvailable, LocationOn, Logout, Menu as MenuIcon,
  MiscellaneousServices, Paid, Phone, Refresh
} from "@mui/icons-material";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Link, Outlet, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import "./owner-dashboard.css";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bka-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const errorMessage = (error) => error.response?.data?.message || "We couldn't complete that request. Please try again.";
const money = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);
const niceDate = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Date not set";
const localDateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const bookingRoute = (booking) => booking.fromLocation && booking.toLocation
  ? `${booking.fromLocation} → ${booking.toLocation}`
  : booking.venue;

function Loading({ label = "Loading owner workspace…" }) {
  return <Box className="loading"><CircularProgress size={28} /><Typography color="text.secondary">{label}</Typography></Box>;
}

export function OwnerLayout({ user, logout }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { label: "Overview", path: "/owner", icon: <Dashboard /> },
    { label: "Bookings", path: "/owner/bookings", icon: <CalendarMonth /> },
    { label: "Services", path: "/owner/services", icon: <MiscellaneousServices /> }
  ];
  return <Box className="owner-shell">
    <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
      <Link to="/owner" className="brand"><span className="brand-mark">B</span><span>book kare abhi<small>OWNER STUDIO</small></span></Link>
      <Typography className="sidebar-label">MANAGE</Typography>
      <nav>{links.map((link) => <Link key={link.path} to={link.path} onClick={() => setMenuOpen(false)} className={`nav-link ${location.pathname === link.path ? "active" : ""}`}>{link.icon}{link.label}</Link>)}</nav>
      <div className="sidebar-bottom">
        <Divider />
        <Stack direction="row" alignItems="center" spacing={1.2} className="owner-profile">
          <Avatar>{user.name?.[0]}</Avatar><Box sx={{ flex: 1, minWidth: 0 }}><Typography fontWeight={700} variant="body2" noWrap>{user.name}</Typography><Typography variant="caption" color="text.secondary">Service owner</Typography></Box>
          <IconButton title="Sign out" onClick={logout}><Logout fontSize="small" /></IconButton>
        </Stack>
      </div>
    </aside>
    {menuOpen && <button className="sidebar-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    <Box className="owner-main">
      <header className="topbar"><IconButton className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><MenuIcon /></IconButton><Typography color="text.secondary">A beautiful day to make things happen.</Typography><Box sx={{ flex: 1 }} /><Chip avatar={<Avatar>{user.name?.[0]}</Avatar>} label={user.name} /></header>
      <main className="page-content"><Outlet /></main>
    </Box>
  </Box>;
}

function PageTitle({ eyebrow, title, subtitle, action }) {
  return <Stack className="page-title" direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
    <Box><Typography className="eyebrow">{eyebrow}</Typography><Typography variant="h4">{title}</Typography><Typography color="text.secondary">{subtitle}</Typography></Box>{action}
  </Stack>;
}

function useRemote(load, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = async () => {
    setLoading(true);
    try { setData(await load()); setError(""); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, deps);
  return { data, loading, error, refresh };
}

export function Overview() {
  const { data, loading, error, refresh } = useRemote(async () => (await api.get("/bookings/summary")).data);
  if (loading) return <Loading />;
  if (error) return <Alert severity="error" action={<Button onClick={refresh}>Retry</Button>}>{error}</Alert>;
  const totals = data.totals || {};
  return <>
    <PageTitle eyebrow="BUSINESS OVERVIEW" title="Your bookings, at a glance" subtitle="Review requests and keep services ready for every celebration." action={<Button component={Link} to="/owner/bookings" variant="contained" endIcon={<ArrowForward />}>Review bookings</Button>} />
    <div className="metric-grid">
      <Metric icon={<CalendarMonth />} label="All bookings" value={totals.total || 0} />
      <Metric icon={<Refresh />} label="Awaiting decision" value={totals.pending || 0} />
      <Metric icon={<Check />} label="Accepted" value={totals.confirmed || 0} />
      <Metric icon={<Paid />} label="Completed revenue" value={money(totals.revenue)} />
    </div>
    <Paper className="panel recent-panel" elevation={0}>
      <Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="h6">Recent bookings</Typography><Typography color="text.secondary" variant="body2">Latest customer requests</Typography></Box><Button component={Link} to="/owner/bookings">View all</Button></Stack>
      {data.recent.length ? <div className="table-scroll"><table><thead><tr><th>Customer</th><th>Service</th><th>Event date</th><th>Status</th><th>Price</th></tr></thead><tbody>{data.recent.map((booking) => <tr key={booking.id}><td>{booking.customerName}<small>{booking.customerEmail}</small></td><td>{booking.serviceName}</td><td>{niceDate(booking.eventDate)}</td><td><DecisionChip booking={booking} /></td><td>{money(booking.totalAmount)}</td></tr>)}</tbody></table></div> : <EmptyState text="New booking requests will appear here." />}
    </Paper>
  </>;
}

function Metric({ icon, label, value }) {
  return <Paper className="metric-card" elevation={0}><span className="metric-icon">{icon}</span><Typography variant="body2" color="text.secondary">{label}</Typography><Typography className="metric-value">{value}</Typography></Paper>;
}

function DecisionChip({ booking }) {
  const label = booking.decisionStatus === "rejected" ? "Rejected" : booking.decisionStatus === "accepted" ? "Accepted" : booking.status === "completed" ? "Completed" : "Pending";
  const color = label === "Accepted" || label === "Completed" ? "success" : label === "Rejected" ? "error" : "warning";
  return <Chip size="small" label={label} color={color} />;
}

function EmptyState({ text }) {
  return <Box className="empty-state"><CalendarMonth /><Typography color="text.secondary">{text}</Typography></Box>;
}

export function Bookings() {
  const { data, loading, error, refresh } = useRemote(async () => (await api.get("/bookings")).data.bookings);
  const calendarRef = useRef(null);
  const datePickerRef = useRef(null);
  const bookingDetailsRequest = useRef(0);
  const [calendarMonth, setCalendarMonth] = useState(() => localDateValue(new Date()).slice(0, 7));
  const [selected, setSelected] = useState(null);
  const [offer, setOffer] = useState({ amount: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [calendarInitialized, setCalendarInitialized] = useState(false);
  const [manualBookingOpen, setManualBookingOpen] = useState(false);
  const [manualBookingDate, setManualBookingDate] = useState("");
  const [bookingAmounts, setBookingAmounts] = useState({ totalAmount: "" });
  const [paymentEntry, setPaymentEntry] = useState({ amount: "", paymentDate: localDateValue(new Date()), note: "" });
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [selectedServiceFilter, setSelectedServiceFilter] = useState("all");
  const [manualBooking, setManualBooking] = useState({
    customerName: "", customerEmail: "", customerPhone: "", serviceId: "",
    eventTime: "", fromLocation: "", toLocation: "",
    totalAmount: "", advanceAmount: "0", notes: ""
  });
  useEffect(() => {
    api.get("/services")
      .then(({ data: response }) => setServices(response.services))
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => setServicesLoading(false));
  }, []);
  const selectedService = services.find((service) => String(service.id) === selectedServiceFilter);
  const filteredBookings = useMemo(() => (data || []).filter((booking) =>
    selectedServiceFilter === "all"
    || String(booking.serviceId) === selectedServiceFilter
    || booking.serviceName?.trim().toLocaleLowerCase() === selectedService?.name.trim().toLocaleLowerCase()
  ), [data, selectedServiceFilter, selectedService]);
  const bookingsByDate = useMemo(() => {
    const grouped = new Map();
    filteredBookings.forEach((booking) => {
      grouped.set(booking.eventDate, [...(grouped.get(booking.eventDate) || []), booking]);
    });
    return grouped;
  }, [filteredBookings]);
  const bookedDates = useMemo(() => new Set(
    filteredBookings.filter((booking) => booking.decisionStatus === "accepted").map((booking) => booking.eventDate)
  ), [filteredBookings]);
  const allBookedDates = useMemo(() => new Set(
    (data || []).filter((booking) => booking.decisionStatus === "accepted").map((booking) => booking.eventDate)
  ), [data]);
  const activeBooking = filteredBookings.find((booking) => booking.id === activeBookingId)
    || (bookingsByDate.get(selectedCalendarDate) || []).find((booking) => booking.decisionStatus === "accepted")
    || (bookingsByDate.get(selectedCalendarDate) || [])[0];
  useEffect(() => {
    if (!data || calendarInitialized) return;
    const today = localDateValue(new Date());
    const initialBooking = [...data]
      .sort((a, b) => `${a.eventDate}T${a.eventTime}`.localeCompare(`${b.eventDate}T${b.eventTime}`))
      .find((booking) => booking.eventDate >= today) || data[0];
    if (initialBooking) {
      setActiveBookingId(initialBooking.id);
    }
    setCalendarInitialized(true);
  }, [data, calendarInitialized]);
  const events = useMemo(() => filteredBookings.map((booking) => ({
    id: String(booking.id),
    title: `${booking.serviceName} · ${booking.customerName}`,
    start: `${booking.eventDate}T${booking.eventTime}`,
    backgroundColor: booking.decisionStatus === "accepted" ? "#18a957" : booking.decisionStatus === "rejected" ? "#657393" : "#2456e8",
    textColor: "#fff",
    borderColor: "transparent",
    classNames: [`booking-event-${booking.decisionStatus}`],
    extendedProps: { booking }
  })), [filteredBookings]);
  const decide = async (decision) => {
    if (!selected) return;
    setSaving(true);
    try {
      const { data: response } = await api.patch(`/bookings/${selected.id}/decision`, { decision });
      setSelected(response.booking);
      toast.success(decision === "accepted" ? "Booking accepted." : "Booking rejected.");
      await refresh();
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setSaving(false); }
  };
  const sendOffer = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const { data: response } = await api.patch(`/bookings/${selected.id}/price-offer`, {
        amount: Number(offer.amount), message: offer.message
      });
      setSelected(response.booking);
      toast.success("Price offer sent to the customer.");
      await refresh();
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setSaving(false); }
  };
  const openBooking = async (booking) => {
    const requestId = ++bookingDetailsRequest.current;
    setSelectedCalendarDate(booking.eventDate);
    setActiveBookingId(booking.id);
    setSelected(booking);
    setBookingAmounts({ totalAmount: String(booking.totalAmount ?? 0) });
    setPaymentEntry({ amount: "", paymentDate: localDateValue(new Date()), note: "" });
    setOffer({ amount: booking.priceOfferStatus === "pending" ? String(booking.priceOfferAmount) : String(booking.totalAmount || ""), message: booking.priceOfferMessage || "" });
    try {
      const { data: response } = await api.get(`/bookings/${booking.id}`);
      if (bookingDetailsRequest.current === requestId) {
        setSelected(response.booking);
        setBookingAmounts({ totalAmount: String(response.booking.totalAmount ?? 0) });
      }
    } catch (e) {
      if (bookingDetailsRequest.current === requestId) toast.error(errorMessage(e));
    }
  };
  const closeBooking = () => {
    bookingDetailsRequest.current += 1;
    setSelected(null);
  };
  const selectCalendarDate = (date) => {
    const dateBookings = bookingsByDate.get(date) || [];
    const booking = dateBookings.find((item) => item.decisionStatus === "accepted") || dateBookings[0];
    setSelectedCalendarDate(date);
    setActiveBookingId(booking?.id ?? null);
  };
  const jumpToMonth = (month) => {
    if (!month) return;
    setCalendarMonth(month);
    calendarRef.current?.getApi().gotoDate(`${month}-01`);
  };
  const openMonthPicker = () => {
    const picker = datePickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === "function") picker.showPicker();
    else picker.click();
  };
  const openManualBooking = async () => {
    if (!selectedCalendarDate || allBookedDates.has(selectedCalendarDate)) return;
    const serviceId = selectedServiceFilter !== "all"
      ? selectedServiceFilter
      : String(services[0]?.id || "");
    const service = services.find((item) => String(item.id) === serviceId);
    setManualBookingDate(selectedCalendarDate);
    setManualBooking((current) => ({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      serviceId,
      eventTime: "",
      fromLocation: "",
      toLocation: "",
      totalAmount: String(service?.priceFrom ?? 0),
      advanceAmount: "0",
      notes: ""
    }));
    setManualBookingOpen(true);
  };
  const updateManualBooking = (key, value) => {
    setManualBooking((current) => ({ ...current, [key]: value }));
  };
  const saveManualBooking = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data: response } = await api.post("/bookings/manual", {
        ...manualBooking,
        serviceId: Number(manualBooking.serviceId),
        totalAmount: Number(manualBooking.totalAmount),
        advanceAmount: Number(manualBooking.advanceAmount),
        eventDate: manualBookingDate
      });
      setActiveBookingId(response.booking.id);
      setSelectedCalendarDate(manualBookingDate);
      setSelectedServiceFilter(String(response.booking.serviceId));
      setManualBookingOpen(false);
      toast.success("Manual booking added and confirmed.");
      await refresh();
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setSaving(false); }
  };
  const saveBookingAmounts = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const { data: response } = await api.patch(`/bookings/${selected.id}/amounts`, {
        totalAmount: Number(bookingAmounts.totalAmount)
      });
      setSelected(response.booking);
      setBookingAmounts({
        totalAmount: String(response.booking.totalAmount)
      });
      toast.success("Total booking amount updated.");
      await refresh();
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setSaving(false); }
  };
  const recordBookingPayment = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const { data: response } = await api.post(`/bookings/${selected.id}/payments`, {
        amount: Number(paymentEntry.amount),
        paymentDate: paymentEntry.paymentDate,
        note: paymentEntry.note
      });
      setSelected(response.booking);
      setBookingAmounts({ totalAmount: String(response.booking.totalAmount) });
      setPaymentEntry({ amount: "", paymentDate: localDateValue(new Date()), note: "" });
      toast.success("Payment recorded.");
      await refresh();
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setSaving(false); }
  };
  const eventContent = (info) => {
    const booking = info.event.extendedProps.booking;
    const details = <Stack spacing={.5} className="calendar-tooltip">
      <strong>{booking.serviceName}</strong><span>{booking.customerName} · {booking.customerPhone || booking.customerEmail}</span>
      <span>{niceDate(booking.eventDate)} at {booking.eventTime}</span><span>{bookingRoute(booking)}</span>
      <span>{booking.priceOfferStatus === "pending" ? `Offer pending: ${money(booking.priceOfferAmount)}` : `Price: ${money(booking.totalAmount)}`}</span>
    </Stack>;
    return <Tooltip title={details} arrow placement="top">
      <span className={`calendar-event calendar-event-${booking.decisionStatus}`} title={`${booking.customerName} · ${booking.serviceName} · ${bookingRoute(booking)}`}>
        {info.view.type === "dayGridMonth"
          ? booking.decisionStatus === "accepted"
            ? <span className="booked-day-mark"><CheckCircle /><span>Booked</span></span>
            : <span className={`calendar-event-status calendar-event-status-${booking.decisionStatus}`}><i /><span>{booking.decisionStatus === "rejected" ? "Not available" : "Pending"}</span></span>
          : <><span className="calendar-event-time">{info.timeText}</span><span className="calendar-event-label">{info.event.title}</span></>}
      </span>
    </Tooltip>;
  };

  if (loading) return <Loading />;
  if (error) return <Alert severity="error" action={<Button onClick={refresh}>Retry</Button>}>{error}</Alert>;
  return <>
    <section className="booking-calendar-heading">
      <span className="booking-calendar-heading-icon"><CalendarMonth /></span>
      <div>
        <Typography variant="h4">Booking Calendar</Typography>
        <Typography color="text.secondary">View booking history and details</Typography>
      </div>
      <Chip className="booking-calendar-count" icon={<CalendarMonth />} label={`${filteredBookings.length} ${filteredBookings.length === 1 ? "Event" : "Events"}`} />
    </section>
    <input
      ref={datePickerRef}
      className="calendar-date-picker-input"
      type="month"
      aria-label="Jump to calendar month"
      value={calendarMonth}
      onChange={(event) => jumpToMonth(event.target.value)}
    />
    <Paper className="panel calendar-panel" elevation={0}>
      <div className="calendar-controls-row">
        <div className="calendar-key" aria-label="Calendar availability legend">
          <span><i className="calendar-key-dot calendar-key-available" />Available</span>
          <span><i className="calendar-key-dot calendar-key-booked" />Booked</span>
          <span><i className="calendar-key-dot calendar-key-unavailable" />Not Available</span>
        </div>
        <TextField
          className="booking-calendar-filter"
          select
          label="Filter by service"
          value={selectedServiceFilter}
          onChange={(event) => setSelectedServiceFilter(event.target.value)}
          disabled={servicesLoading}
          size="small"
        >
          <MenuItem value="all">All services</MenuItem>
          {services.map((service) => <MenuItem key={service.id} value={String(service.id)}>{service.name}</MenuItem>)}
        </TextField>
      </div>
      <div className="booking-calendar-layout">
        <div className="booking-calendar-grid">
          <div className="booking-calendar-toolbar">
            <div className="booking-calendar-navigation">
              <IconButton aria-label="Previous month" onClick={() => calendarRef.current?.getApi().prev()}><ChevronLeft /></IconButton>
              <IconButton aria-label="Next month" onClick={() => calendarRef.current?.getApi().next()}><ChevronRight /></IconButton>
              <Button onClick={() => calendarRef.current?.getApi().today()}>Today</Button>
            </div>
            <div className="booking-calendar-month-title">
              <Typography component="h2">
                {new Date(`${calendarMonth}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </Typography>
              <IconButton aria-label="Choose month and year" title="Choose month and year" onClick={openMonthPicker}>
                <CalendarMonth />
              </IconButton>
            </div>
            <Button className="booking-calendar-month-view" variant="contained" disableElevation>Month</Button>
          </div>
          <FullCalendar ref={calendarRef} plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" height="auto" events={events}
            firstDay={0} fixedWeekCount={true} dayHeaderFormat={{ weekday: "short" }}
            eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
            headerToolbar={false}
            datesSet={(info) => setCalendarMonth(localDateValue(info.view.currentStart).slice(0, 7))}
            dayCellClassNames={(info) => [
              ...(bookedDates.has(localDateValue(info.date)) ? ["booking-day-booked"] : []),
              ...(localDateValue(info.date) === selectedCalendarDate ? ["booking-selected-day"] : []),
            ]}
            dayCellContent={(info) => {
              if (info.view.type !== "dayGridMonth") return info.dayNumberText;
              return <span className="booking-day-number">{info.dayNumberText}</span>;
            }}
            dateClick={(info) => selectCalendarDate(info.dateStr)}
            eventContent={eventContent}
            eventClick={(info) => {
              info.jsEvent.preventDefault();
              const booking = info.event.extendedProps.booking;
              setSelectedCalendarDate(booking.eventDate);
              setActiveBookingId(booking.id);
            }}
            />
        </div>
        <aside className="booking-details-panel" aria-live="polite">
          {activeBooking ? <>
            <div className={`booking-detail-status booking-detail-status-${activeBooking.decisionStatus}`}>
              <span>{activeBooking.decisionStatus === "accepted" ? <CheckCircle /> : <EventAvailable />}</span>
              <div>
                <strong>{activeBooking.decisionStatus === "accepted" ? "Date Booked" : activeBooking.decisionStatus === "rejected" ? "Not Available" : "Booking Request"}</strong>
                <small>{niceDate(activeBooking.eventDate)}</small>
              </div>
            </div>
            <section className="booking-detail-section">
              <h3><CalendarMonth />Booking Details</h3>
              <div className="booking-contact-row"><Avatar>{activeBooking.customerName?.[0]}</Avatar><strong>{activeBooking.customerName}</strong></div>
              <div className="booking-contact-row"><Email /><span>{activeBooking.customerEmail}</span></div>
              {activeBooking.customerPhone && <div className="booking-contact-row"><Phone /><span>{activeBooking.customerPhone}</span></div>}
            </section>
            <section className="booking-detail-section">
              <h3><EventAvailable />Booking Information</h3>
              <div className="booking-detail-row"><span>Service</span><strong>{activeBooking.serviceName}</strong></div>
              <div className="booking-detail-row"><span>Date</span><strong>{niceDate(activeBooking.eventDate)}</strong></div>
              <div className="booking-detail-row"><span>Time</span><strong>{activeBooking.eventTime}</strong></div>
              <div className="booking-detail-row"><span>Price</span><strong>{money(activeBooking.priceOfferStatus === "pending" ? activeBooking.priceOfferAmount : activeBooking.totalAmount)}</strong></div>
              <div className="booking-detail-row booking-detail-venue"><LocationOn /><strong>{activeBooking.venue}</strong></div>
            </section>
            {activeBooking.notes && <section className="booking-detail-section">
              <h3><Description />Additional Info</h3>
              <p className="booking-detail-notes">{activeBooking.notes}</p>
            </section>}
            <Button className="booking-full-details-button" variant="contained" fullWidth endIcon={<ArrowForward />} onClick={() => openBooking(activeBooking)}>View Full Details</Button>
          </> : <>
            <div className="booking-detail-status booking-detail-status-available">
              <span><EventAvailable /></span>
              <div><strong>{selectedCalendarDate && allBookedDates.has(selectedCalendarDate) && !bookedDates.has(selectedCalendarDate)
                ? "Unavailable"
                : selectedCalendarDate && bookedDates.has(selectedCalendarDate)
                  ? "Date Booked"
                : selectedCalendarDate && selectedCalendarDate < localDateValue(new Date())
                  ? "No booking scheduled"
                  : "Available Date"}</strong><small>{niceDate(selectedCalendarDate || localDateValue(new Date()))}</small></div>
            </div>
            <p className="booking-available-message">{selectedCalendarDate && allBookedDates.has(selectedCalendarDate) && !bookedDates.has(selectedCalendarDate)
              ? "No bookings for this service are scheduled on this date."
              : selectedCalendarDate && bookedDates.has(selectedCalendarDate)
                ? "A booking is scheduled for this service on this date."
                : "No bookings are scheduled for this date."}</p>
            {selectedCalendarDate && selectedCalendarDate >= localDateValue(new Date()) && !allBookedDates.has(selectedCalendarDate) && <Button
              className="booking-full-details-button"
              variant="contained"
              fullWidth
              endIcon={<ArrowForward />}
              onClick={openManualBooking}
            >
              Add booking
            </Button>}
          </>}
        </aside>
      </div>
      <div className="calendar-note"><span>i</span>Click any date to view details. Booked dates are marked with <CheckCircle /></div>
    </Paper>
    <Paper className="panel" elevation={0}>
      <Typography variant="h6">All booking requests</Typography>
      <div className="table-scroll"><table><thead><tr><th>Customer</th><th>Service & event</th><th>From / to</th><th>Decision</th><th>Price</th><th>Actions</th></tr></thead><tbody>
        {data.map((booking) => <tr key={booking.id}>
          <td>{booking.customerName}<small>{booking.customerEmail}</small></td>
          <td>{booking.serviceName}<small>{niceDate(booking.eventDate)} · {booking.eventTime}</small></td>
          <td>{bookingRoute(booking)}</td><td><DecisionChip booking={booking} /></td>
          <td>{booking.priceOfferStatus === "pending" ? <><strong>{money(booking.priceOfferAmount)}</strong><small>Offer awaiting response</small></> : money(booking.totalAmount)}</td>
          <td><Button size="small" onClick={() => openBooking(booking)}>Details / negotiate</Button></td>
        </tr>)}
      </tbody></table></div>
      {!data.length && <EmptyState text="No booking requests yet." />}
    </Paper>
    <Dialog
      open={Boolean(selected)}
      onClose={() => !saving && closeBooking()}
      fullWidth
      maxWidth="md"
      className="owner-booking-dialog"
    >
      {selected && <>
        <DialogTitle className="owner-booking-dialog-title">
          <Box className="owner-booking-header-main">
            {selected.serviceImage && <img src={selected.serviceImage} alt="" />}
            <Box>
              <Typography variant="h5">{selected.serviceName}</Typography>
              <Typography className="owner-booking-header-date">
                {niceDate(selected.eventDate)} · {selected.eventTime}
              </Typography>
              <Typography className="owner-booking-reference">{selected.reference}</Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <DecisionChip booking={selected} />
            <IconButton
              aria-label="Close booking details"
              onClick={() => !saving && closeBooking()}
              disabled={saving}
              size="small"
            >
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent className="owner-booking-dialog-content">
          <Stack spacing={2.5} className="booking-detail">
            <section className="owner-booking-amounts" aria-label="Booking payment summary">
              <div className="owner-booking-amount-card owner-booking-amount-total">
                <span>Total booking amount</span>
                <strong>{money(selected.totalAmount)}</strong>
              </div>
              <div className="owner-booking-amount-card owner-booking-amount-paid">
                <span>Paid amount</span>
                <strong>{money(selected.paidAmount)}</strong>
              </div>
              <div className={`owner-booking-amount-card owner-booking-amount-due ${selected.dueAmount <= 0 ? "is-settled" : ""}`}>
                <span>Due amount</span>
                <strong>{money(selected.dueAmount)}</strong>
              </div>
            </section>

            <section className="owner-booking-info owner-booking-customer-card">
              <div className="owner-booking-card-heading">
                <span><EventAvailable /></span>
                <div>
                  <Typography variant="h6">Customer & event</Typography>
                  <Typography color="text.secondary">Contact information and event details</Typography>
                </div>
              </div>
              <div className="owner-booking-info-grid">
                <Detail label="Customer" value={selected.customerName} />
                <Detail label="Email" value={selected.customerEmail} />
                {selected.customerPhone && <Detail label="Mobile number" value={selected.customerPhone} />}
                <Detail label="Booking date & time" value={`${niceDate(selected.eventDate)} · ${selected.eventTime}`} />
                <Detail label="From" value={selected.fromLocation || selected.venue} />
                <Detail label="To" value={selected.toLocation || selected.venue} />
              </div>
              {selected.notes && <div className="owner-booking-notes">
                <Typography className="owner-booking-section-label">NOTES</Typography>
                <Typography>{selected.notes}</Typography>
              </div>}
            </section>

            {selected.decisionStatus !== "accepted" && selected.priceOfferStatus !== "none" && <Alert severity={selected.priceOfferStatus === "pending" ? "info" : "success"}>
            {selected.priceOfferStatus === "pending" ? `Offer sent: ${money(selected.priceOfferAmount)}. Waiting for customer response.` : `Last offer ${selected.priceOfferStatus}: ${money(selected.priceOfferAmount)}.`}
            {selected.priceOfferMessage && <Typography variant="body2">{selected.priceOfferMessage}</Typography>}
          </Alert>}
            <div className="owner-booking-management">
              <form className="owner-booking-form-card" onSubmit={saveBookingAmounts}>
                <div>
                  <Typography variant="h6">Total booking amount</Typography>
                  {/* <Typography color="text.secondary">Set the agreed total.</Typography> */}
                </div>
                <TextField
                  label="Total booking amount (₹)"
                  type="number"
                  inputProps={{ min: selected.paidAmount, step: 1 }}
                  required
                  value={bookingAmounts.totalAmount}
                  onChange={(e) => setBookingAmounts({ totalAmount: e.target.value })}
                />
                <Button type="submit" variant="contained" disabled={saving}>
                  {saving ? "Saving…" : "Save total amount"}
                </Button>
              </form>

              <form className="owner-booking-form-card" onSubmit={recordBookingPayment}>
                <div>
                  <Typography variant="h6">Record an installment</Typography>
                  <Typography color="text.secondary">Add each payment received. Remaining due: {money(selected.dueAmount)}.</Typography>
                </div>
                <TextField
                  label="Payment amount (₹)"
                  type="number"
                  inputProps={{ min: 1, max: selected.dueAmount, step: 1 }}
                  required
                  value={paymentEntry.amount}
                  onChange={(e) => setPaymentEntry({ ...paymentEntry, amount: e.target.value })}
                />
                <TextField
                  label="Payment date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  required
                  value={paymentEntry.paymentDate}
                  onChange={(e) => setPaymentEntry({ ...paymentEntry, paymentDate: e.target.value })}
                />
                <TextField
                  label="Note (optional)"
                  placeholder="e.g. Second installment"
                  inputProps={{ maxLength: 250 }}
                  value={paymentEntry.note}
                  onChange={(e) => setPaymentEntry({ ...paymentEntry, note: e.target.value })}
                />
                <Button type="submit" variant="outlined" startIcon={<Paid />} disabled={saving || selected.dueAmount <= 0}>
                  {saving ? "Recording…" : "Record payment"}
                </Button>
              </form>

              {selected.decisionStatus !== "accepted" && <form className="owner-booking-form-card" onSubmit={sendOffer}>
                  <div>
                    <Typography variant="h6">Price offer</Typography>
                    <Typography color="text.secondary">Send or update a quote for the customer.</Typography>
                  </div>
                  <TextField label="Offer amount (₹)" type="number" inputProps={{ min: 0, step: 1 }} required value={offer.amount} onChange={(e) => setOffer({ ...offer, amount: e.target.value })} />
                  <TextField label="Message for the customer" multiline minRows={2} inputProps={{ maxLength: 500 }} value={offer.message} onChange={(e) => setOffer({ ...offer, message: e.target.value })} />
                  <Button type="submit" variant="outlined" startIcon={<Paid />} disabled={saving}>{saving ? "Sending…" : "Send price offer"}</Button>
                </form>}
            </div>

            <section className="owner-booking-info owner-booking-payment-history">
              <div className="owner-booking-payment-heading">
                <div>
                  <Typography variant="h6">Payment history</Typography>
                  <Typography color="text.secondary">Installments received toward this booking</Typography>
                </div>
                <span>{selected.payments?.length || 0} {selected.payments?.length === 1 ? "payment" : "payments"}</span>
              </div>
              {selected.payments?.length ? <div className="owner-booking-payment-list">
                <div className="owner-booking-payment-columns" aria-hidden="true">
                  <span>Amount received</span>
                  <span>Date paid</span>
                  <span>Note</span>
                </div>
                {selected.payments.map((payment) => (
                  <div className="owner-booking-payment-row" key={payment.id}>
                    <div className="owner-booking-payment-amount">
                      <strong>{money(payment.amount)}</strong>
                    </div>
                    <div className="owner-booking-payment-date">
                      <strong>{niceDate(payment.paymentDate)}</strong>
                    </div>
                    <div className="owner-booking-payment-note">
                      <strong>{payment.note || "—"}</strong>
                    </div>
                  </div>
                ))}
              </div> : <Typography className="owner-booking-no-payments" color="text.secondary">
                No installments have been recorded for this booking yet.
              </Typography>}
            </section>
          </Stack>
        </DialogContent>
        <DialogActions className="decision-actions owner-booking-dialog-actions">
          <Button color="error" startIcon={<Close />} disabled={saving || selected.decisionStatus === "rejected"} onClick={() => decide("rejected")}>Reject booking</Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<Check />} disabled={saving || selected.decisionStatus === "accepted"} onClick={() => decide("accepted")}>Accept booking</Button>
        </DialogActions>
      </>}
    </Dialog>
    <Dialog open={manualBookingOpen} onClose={() => !saving && setManualBookingOpen(false)} fullWidth maxWidth="sm">
      <form onSubmit={saveManualBooking}>
        <DialogTitle>Add booking</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="success">Available date · {niceDate(manualBookingDate)}. This manual booking will be confirmed when saved.</Alert>
            {servicesLoading ? <CircularProgress size={24} sx={{ alignSelf: "center" }} /> : !services.length ? <Alert severity="warning">Add an active service before creating a booking.</Alert> : <>
            <TextField
              label="Booking date"
              type="date"
              required
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: localDateValue(new Date()) }}
              value={manualBookingDate}
              onChange={(e) => {
                if (allBookedDates.has(e.target.value)) {
                  toast.error("This date is already booked. Please choose another date.");
                  return;
                }
                setManualBookingDate(e.target.value);
              }}
            />
            <TextField select label="Service" required value={manualBooking.serviceId} onChange={(e) => {
              const serviceId = e.target.value;
              const service = services.find((item) => String(item.id) === serviceId);
              setManualBooking((current) => ({
                ...current,
                serviceId,
                totalAmount: String(service?.priceFrom ?? 0)
              }));
            }}>
              {services.map((service) => <MenuItem key={service.id} value={service.id}>{service.name} · {service.priceFrom ? money(service.priceFrom) : "Custom quote"}</MenuItem>)}
            </TextField>
              <div className="form-grid">
                <TextField label="Customer name" required inputProps={{ maxLength: 100 }} value={manualBooking.customerName} onChange={(e) => updateManualBooking("customerName", e.target.value)} />
                <TextField label="Customer email" type="email" required value={manualBooking.customerEmail} onChange={(e) => updateManualBooking("customerEmail", e.target.value)} />
              </div>
              <div className="form-grid">
                <TextField label="Mobile number" type="tel" required inputProps={{ minLength: 7, maxLength: 30 }} value={manualBooking.customerPhone} onChange={(e) => updateManualBooking("customerPhone", e.target.value)} />
                <TextField label="Event time" type="time" required InputLabelProps={{ shrink: true }} value={manualBooking.eventTime} onChange={(e) => updateManualBooking("eventTime", e.target.value)} />
              </div>
              <div className="form-grid">
                <TextField label="From" required inputProps={{ minLength: 2, maxLength: 250 }} value={manualBooking.fromLocation} onChange={(e) => updateManualBooking("fromLocation", e.target.value)} />
                <TextField label="To" required inputProps={{ minLength: 2, maxLength: 250 }} value={manualBooking.toLocation} onChange={(e) => updateManualBooking("toLocation", e.target.value)} />
              </div>
              <div className="form-grid">
                <TextField label="Total booking amount (₹)" type="number" required inputProps={{ min: 0, step: 1 }} value={manualBooking.totalAmount} onChange={(e) => updateManualBooking("totalAmount", e.target.value)} />
                <TextField label="Initial payment (₹)" type="number" required inputProps={{ min: 0, max: manualBooking.totalAmount, step: 1 }} value={manualBooking.advanceAmount} onChange={(e) => updateManualBooking("advanceAmount", e.target.value)} />
              </div>
              <Typography color="text.secondary">
                Due amount: {money(Math.max(0, Number(manualBooking.totalAmount || 0) - Number(manualBooking.advanceAmount || 0)))}
              </Typography>
              <TextField label="Notes" multiline minRows={2} inputProps={{ maxLength: 1000 }} value={manualBooking.notes} onChange={(e) => updateManualBooking("notes", e.target.value)} />
            </>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualBookingOpen(false)} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving || servicesLoading || !services.length}>
            {saving ? "Saving…" : "Add booking"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  </>;
}

function Detail({ label, value }) {
  return <div className="owner-booking-info-item">
    <Typography component="span">{label}</Typography>
    <Typography component="strong">{value}</Typography>
  </div>;
}

const emptyService = { name: "", slug: "", description: "", imageUrl: "", priceFrom: 0, category: "Events", featured: false, active: true };
export function Services() {
  const { data, loading, error, refresh } = useRemote(async () => (await api.get("/services/manage")).data.services);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(emptyService);
  const [saving, setSaving] = useState(false);
  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const add = () => { setEditing(null); setValues(emptyService); setOpen(true); };
  const edit = (service) => { setEditing(service); setValues({ ...service, featured: Boolean(service.featured), active: Boolean(service.active) }); setOpen(true); };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const body = { ...values, slug: values.slug || values.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") };
      if (editing) await api.put(`/services/${editing.id}`, body);
      else await api.post("/services", body);
      toast.success(editing ? "Service updated." : "Service created.");
      setOpen(false);
      await refresh();
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setSaving(false); }
  };
  const hide = async (service) => {
    if (!window.confirm(`Hide ${service.name} from the customer services page?`)) return;
    try { await api.delete(`/services/${service.id}`); toast.success("Service hidden."); await refresh(); }
    catch (e) { toast.error(errorMessage(e)); }
  };
  if (loading) return <Loading />;
  if (error) return <Alert severity="error" action={<Button onClick={refresh}>Retry</Button>}>{error}</Alert>;
  return <>
    <PageTitle eyebrow="SERVICE COLLECTION" title="Manage services" subtitle="Manage every service shown to customers, including van bookings." action={<Button variant="contained" color="secondary" startIcon={<MiscellaneousServices />} onClick={add}>Add service</Button>} />
    <Paper className="panel" elevation={0}><div className="table-scroll"><table><thead><tr><th>Service</th><th>Category</th><th>Starting price</th><th>Visibility</th><th>Actions</th></tr></thead><tbody>
      {data.map((service) => <tr key={service.id}><td><div className="service-cell"><Avatar variant="rounded" src={service.imageUrl} /><div><strong>{service.name}</strong><small>/{service.slug}</small></div></div></td><td>{service.category}</td><td>{service.priceFrom ? money(service.priceFrom) : "Custom quote"}</td><td><Chip size="small" label={service.active ? "Visible" : "Hidden"} color={service.active ? "success" : "default"} /></td><td><Button size="small" onClick={() => edit(service)}>Edit</Button>{service.active && <Button size="small" color="error" onClick={() => hide(service)}>Hide</Button>}</td></tr>)}
    </tbody></table></div>
      {!data.length && <EmptyState text="No services have been added yet." />}
    </Paper>
    <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="sm"><form onSubmit={save}>
      <DialogTitle>{editing ? "Edit service" : "Add a service"}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        <TextField label="Service name" required value={values.name} onChange={(e) => update("name", e.target.value)} />
        <TextField label="URL slug" helperText="Lowercase words separated by hyphens." value={values.slug} onChange={(e) => update("slug", e.target.value)} />
        <TextField label="Description" required multiline minRows={3} value={values.description} onChange={(e) => update("description", e.target.value)} />
        <TextField label="Image URL" type="url" required value={values.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} />
        <div className="form-grid"><TextField label="Starting price (₹)" type="number" inputProps={{ min: 0 }} required value={values.priceFrom} onChange={(e) => update("priceFrom", Number(e.target.value))} /><TextField label="Category" required value={values.category} onChange={(e) => update("category", e.target.value)} /></div>
        <label className="check-label"><input type="checkbox" checked={Boolean(values.featured)} onChange={(e) => update("featured", e.target.checked)} /> Feature on homepage</label>
        <label className="check-label"><input type="checkbox" checked={Boolean(values.active)} onChange={(e) => update("active", e.target.checked)} /> Visible to customers</label>
      </Stack></DialogContent><DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? "Saving…" : "Save service"}</Button></DialogActions>
    </form></Dialog>
  </>;
}
