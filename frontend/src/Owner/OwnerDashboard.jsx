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
  const [calendarMonth, setCalendarMonth] = useState(() => localDateValue(new Date()).slice(0, 7));
  const [selected, setSelected] = useState(null);
  const [offer, setOffer] = useState({ amount: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [calendarInitialized, setCalendarInitialized] = useState(false);
  const [manualBookingOpen, setManualBookingOpen] = useState(false);
  const [manualBookingDate, setManualBookingDate] = useState("");
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [selectedServiceFilter, setSelectedServiceFilter] = useState("all");
  const [manualBooking, setManualBooking] = useState({
    customerName: "", customerEmail: "", customerPhone: "", serviceId: "",
    eventTime: "", venue: "", notes: ""
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
  const openBooking = (booking) => {
    setSelectedCalendarDate(booking.eventDate);
    setActiveBookingId(booking.id);
    setSelected(booking);
    setOffer({ amount: booking.priceOfferStatus === "pending" ? String(booking.priceOfferAmount) : String(booking.totalAmount || ""), message: booking.priceOfferMessage || "" });
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
    setManualBookingDate(selectedCalendarDate);
    setManualBooking((current) => ({ ...current, eventTime: "" }));
    setManualBookingOpen(true);
    setManualBooking((current) => ({
      ...current,
      serviceId: selectedServiceFilter !== "all"
        ? selectedServiceFilter
        : current.serviceId || String(services[0]?.id || "")
    }));
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
  const eventContent = (info) => {
    const booking = info.event.extendedProps.booking;
    const details = <Stack spacing={.5} className="calendar-tooltip">
      <strong>{booking.serviceName}</strong><span>{booking.customerName} · {booking.customerPhone || booking.customerEmail}</span>
      <span>{niceDate(booking.eventDate)} at {booking.eventTime}</span><span>{booking.venue}</span>
      <span>{booking.priceOfferStatus === "pending" ? `Offer pending: ${money(booking.priceOfferAmount)}` : `Price: ${money(booking.totalAmount)}`}</span>
    </Stack>;
    return <Tooltip title={details} arrow placement="top">
      <span className={`calendar-event calendar-event-${booking.decisionStatus}`} title={`${booking.customerName} · ${booking.serviceName} · ${booking.venue}`}>
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
      <div className="table-scroll"><table><thead><tr><th>Customer</th><th>Service & event</th><th>Venue</th><th>Decision</th><th>Price</th><th>Actions</th></tr></thead><tbody>
        {data.map((booking) => <tr key={booking.id}>
          <td>{booking.customerName}<small>{booking.customerEmail}</small></td>
          <td>{booking.serviceName}<small>{niceDate(booking.eventDate)} · {booking.eventTime}</small></td>
          <td>{booking.venue}</td><td><DecisionChip booking={booking} /></td>
          <td>{booking.priceOfferStatus === "pending" ? <><strong>{money(booking.priceOfferAmount)}</strong><small>Offer awaiting response</small></> : money(booking.totalAmount)}</td>
          <td><Button size="small" onClick={() => openBooking(booking)}>Details / negotiate</Button></td>
        </tr>)}
      </tbody></table></div>
      {!data.length && <EmptyState text="No booking requests yet." />}
    </Paper>
    <Dialog open={Boolean(selected)} onClose={() => !saving && setSelected(null)} fullWidth maxWidth="sm">
      {selected && <>
        <DialogTitle>Booking details</DialogTitle>
        <DialogContent><Stack spacing={1.5} className="booking-detail">
          <div><Typography className="eyebrow">REFERENCE</Typography><Typography fontWeight={700}>{selected.reference}</Typography></div>
          <Detail label="Customer" value={`${selected.customerName} · ${selected.customerEmail}`} />
          {selected.customerPhone && <Detail label="Phone" value={selected.customerPhone} />}
          <Detail label="Service" value={selected.serviceName} />
          <Detail label="Date & time" value={`${niceDate(selected.eventDate)} · ${selected.eventTime}`} />
          <Detail label="Venue" value={selected.venue} />
          {selected.notes && <Detail label="Notes" value={selected.notes} />}
          <Detail label="Booking status" value={<DecisionChip booking={selected} />} />
          <Detail label="Current price" value={money(selected.totalAmount)} />
          {selected.priceOfferStatus !== "none" && <Alert severity={selected.priceOfferStatus === "pending" ? "info" : "success"}>
            {selected.priceOfferStatus === "pending" ? `Offer sent: ${money(selected.priceOfferAmount)}. Waiting for customer response.` : `Last offer ${selected.priceOfferStatus}: ${money(selected.priceOfferAmount)}.`}
            {selected.priceOfferMessage && <Typography variant="body2">{selected.priceOfferMessage}</Typography>}
          </Alert>}
          <Divider />
          <form onSubmit={sendOffer}><Stack spacing={1.5}>
            <Typography fontWeight={700}>Send or update price offer</Typography>
            <TextField label="Offer amount (₹)" type="number" inputProps={{ min: 0, step: 1 }} required value={offer.amount} onChange={(e) => setOffer({ ...offer, amount: e.target.value })} />
            <TextField label="Message for the customer" multiline minRows={2} inputProps={{ maxLength: 500 }} value={offer.message} onChange={(e) => setOffer({ ...offer, message: e.target.value })} />
            <Button type="submit" variant="outlined" startIcon={<Paid />} disabled={saving}>{saving ? "Sending…" : "Send price offer"}</Button>
          </Stack></form>
        </Stack></DialogContent>
        <DialogActions className="decision-actions">
          <Button color="error" startIcon={<Close />} disabled={saving || selected.decisionStatus === "rejected"} onClick={() => decide("rejected")}>Reject booking</Button>
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
            <TextField select label="Service" required value={manualBooking.serviceId} onChange={(e) => updateManualBooking("serviceId", e.target.value)}>
              {services.map((service) => <MenuItem key={service.id} value={service.id}>{service.name} · {service.priceFrom ? money(service.priceFrom) : "Custom quote"}</MenuItem>)}
            </TextField>
              <div className="form-grid">
                <TextField label="Customer name" required inputProps={{ maxLength: 100 }} value={manualBooking.customerName} onChange={(e) => updateManualBooking("customerName", e.target.value)} />
                <TextField label="Customer email" type="email" required value={manualBooking.customerEmail} onChange={(e) => updateManualBooking("customerEmail", e.target.value)} />
              </div>
              <div className="form-grid">
                <TextField label="Phone (optional)" type="tel" inputProps={{ maxLength: 30 }} value={manualBooking.customerPhone} onChange={(e) => updateManualBooking("customerPhone", e.target.value)} />
                <TextField label="Event time" type="time" required InputLabelProps={{ shrink: true }} value={manualBooking.eventTime} onChange={(e) => updateManualBooking("eventTime", e.target.value)} />
              </div>
              <TextField label="Event venue / city" required inputProps={{ minLength: 3, maxLength: 250 }} value={manualBooking.venue} onChange={(e) => updateManualBooking("venue", e.target.value)} />
              <TextField label="Notes (optional)" multiline minRows={2} inputProps={{ maxLength: 1000 }} value={manualBooking.notes} onChange={(e) => updateManualBooking("notes", e.target.value)} />
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
  return <Stack direction="row" justifyContent="space-between" spacing={2}><Typography color="text.secondary">{label}</Typography><Typography fontWeight={600} textAlign="right">{value}</Typography></Stack>;
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
