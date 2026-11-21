import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  ArrowForward,
  ArrowOutward,
  AutoAwesome,
  CalendarMonth,
  CheckCircle,
  ChevronRight,
  Close,
  EventAvailable,
  FavoriteBorder,
  Handshake,
  Menu as MenuIcon,
  PersonOutline,
  Search,
  ShieldOutlined,
  Star,
  VerifiedOutlined,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import {
  Bookings as OwnerBookings,
  Overview as OwnerOverview,
  OwnerLayout,
  Services as OwnerServices,
} from "../Owner/OwnerDashboard.jsx";
import ClientDashboard from "../Client/ClientDashboard.jsx";
import AdminDashboard from "../Admin/AdminDashboard.jsx";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const roleHome = (role) =>
  ({
    client: "/client",
    customer: "/client",
    owner: "/owner",
    admin: "/admin",
  })[role] || "/";
const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bka-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
const niceDate = (date) =>
  date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Date to be confirmed";
const pageError = (error) =>
  error.response?.data?.message ||
  "We couldn't complete that request. Please try again.";

function useRemote(load, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = async () => {
    setLoading(true);
    try {
      setData(await load());
      setError("");
    } catch (e) {
      setError(pageError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
  }, deps);
  return { data, loading, error, refresh };
}

function PageLoader() {
  return (
    <Box className="loader">
      <CircularProgress size={28} />
      <Typography color="text.secondary">Getting everything ready…</Typography>
    </Box>
  );
}

function ServiceCard({ service }) {
  return (
    <Card className="service-card">
      <Link to={`/services/${service.slug}`} className="service-image-link">
        <CardMedia
          component="img"
          image={service.imageUrl}
          alt={service.name}
          className="service-image"
        />
        {service.featured ? (
          <Chip
            icon={<Star />}
            label="Popular"
            size="small"
            className="image-chip"
          />
        ) : null}
      </Link>
      <CardContent className="service-card-content">
        <Typography className="eyebrow">{service.category}</Typography>
        <Typography variant="h6" className="service-name">
          {service.name}
        </Typography>
        <Typography color="text.secondary" className="service-description">
          {service.description}
        </Typography>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          className="service-bottom"
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Starting from
            </Typography>
            <Typography className="price">
              {service.priceFrom ? money(service.priceFrom) : "Let’s talk"}
            </Typography>
          </Box>
          <Button
            component={Link}
            to={`/services/${service.slug}`}
            variant="outlined"
            endIcon={<ArrowForward />}
            size="small"
          >
            Explore
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function SiteHeader({ user, logout }) {
  const [open, setOpen] = useState(false);
  const links = [
    ["Services", "/services"],
    ["About us", "/about"],
    ["Contact", "/contact"],
  ];
  return (
    <>
      <AppBar position="sticky" elevation={0} className="site-header">
        <Container maxWidth="xl">
          <Toolbar disableGutters className="site-toolbar">
            <Link to="/" className="brand">
              <span className="brand-mark">B</span>
              <span>
                book kare<span className="brand-light"> abhi</span>
                <small>Har Booking, Abhi!</small>
              </span>
            </Link>
            <Box className="header-links">
              {links.map(([name, path]) => (
                <Button key={path} component={Link} to={path} color="inherit">
                  {name}
                </Button>
              ))}
            </Box>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              className="header-actions"
            >
              {user ? (
                <>
                  <Button
                    component={Link}
                    to={roleHome(user.role)}
                    color="inherit"
                    startIcon={<PersonOutline />}
                  >
                    {user.role === "admin"
                      ? "Admin dashboard"
                      : user.role === "owner"
                        ? "Owner dashboard"
                        : "Client dashboard"}
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={logout}
                  >
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button component={Link} to="/login" color="inherit">
                    Log in
                  </Button>
                  <Button
                    component={Link}
                    to="/services"
                    variant="contained"
                    color="secondary"
                  >
                    Book a service <ArrowForward fontSize="small" />
                  </Button>
                </>
              )}
            </Stack>
            <IconButton
              className="mobile-menu"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 280, p: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="h6">Menu</Typography>
              <IconButton onClick={() => setOpen(false)}>
                <Close />
              </IconButton>
            </Stack>
            {links.map(([name, path]) => (
              <Button
                key={path}
                component={Link}
                to={path}
                onClick={() => setOpen(false)}
              >
                {name}
              </Button>
            ))}
            {user ? (
              <Button
                component={Link}
                to={roleHome(user.role)}
                onClick={() => setOpen(false)}
              >
                My dashboard
              </Button>
            ) : (
              <Button
                component={Link}
                to="/login"
                onClick={() => setOpen(false)}
              >
                Log in
              </Button>
            )}
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <Container maxWidth="xl">
        <Box className="footer-grid">
          <Box>
            <Link to="/" className="brand footer-brand">
              <span className="brand-mark">B</span>
              <span>
                book kare<span className="brand-light"> abhi</span>
                <small>Har Booking, Abhi!</small>
              </span>
            </Link>
            <Typography className="footer-copy">
              The little details make the biggest memories. Let’s make your next
              celebration unforgettable.
            </Typography>
          </Box>
          <Box>
            <Typography className="footer-title">Explore</Typography>
            <Stack spacing={1}>
              <Link to="/services">All services</Link>
              <Link to="/about">About us</Link>
              <Link to="/contact">Contact</Link>
            </Stack>
          </Box>
          <Box>
            <Typography className="footer-title">The essentials</Typography>
            <Stack spacing={1}>
              <Link to="/privacy">Privacy policy</Link>
              <Link to="/terms">Terms & conditions</Link>
              <Link to="/login">Your account</Link>
            </Stack>
          </Box>
          <Box>
            <Typography className="footer-title">We’re here to help</Typography>
            <Typography className="footer-copy">
              Need a hand planning your event? Get in touch with our friendly
              team.
            </Typography>
            <Link to="/contact" className="footer-cta">
              Talk to us <ArrowOutward fontSize="small" />
            </Link>
          </Box>
        </Box>
        <Divider className="footer-divider" />
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          className="footer-legal"
        >
          <Typography>
            © {new Date().getFullYear()} Book Kare Abhi. Made for moments that
            matter.
          </Typography>
          <Typography>Book Kare Abhi – Har Booking, Abhi!</Typography>
        </Stack>
      </Container>
    </footer>
  );
}

function Home() {
  const [selectedService, setSelectedService] = useState("");
  const { data, loading } = useRemote(
    async () => (await api.get("/services")).data.services,
  );
  const services = data || [];
  return (
    <>
      <section className="hero">
        <div className="hero-photo"></div>
        <Container maxWidth="xl" className="hero-inner">
          <Box className="hero-copy">
            <Chip
              icon={<AutoAwesome />}
              label="Your celebration, beautifully sorted"
              className="hero-chip"
            />
            <Typography className="hero-heading">
              The best days
              <br />
              deserve <em>the best plans.</em>
            </Typography>
            <Typography className="hero-subtitle">
              From the first beat to the final farewell, find the people and
              services who make every occasion feel like yours.
            </Typography>
            <Button
              component={Link}
              to="/services"
              variant="contained"
              color="secondary"
              size="large"
              endIcon={<ArrowForward />}
            >
              Explore our services
            </Button>
            <Stack direction="row" spacing={2} className="trust-row">
              <Stack direction="row" alignItems="center">
                <Avatar className="trust-avatar">A</Avatar>
                <Avatar className="trust-avatar avatar-two">R</Avatar>
                <Avatar className="trust-avatar avatar-three">S</Avatar>
              </Stack>
              <Box>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Star className="gold-star" fontSize="small" />
                  <Star className="gold-star" fontSize="small" />
                  <Star className="gold-star" fontSize="small" />
                  <Star className="gold-star" fontSize="small" />
                  <Star className="gold-star" fontSize="small" />
                  <Typography className="trust-rating">4.9/5</Typography>
                </Stack>
                <Typography className="trust-caption">
                  Making celebrations feel effortless
                </Typography>
              </Box>
            </Stack>
          </Box>
          <Box className="hero-note">
            <span className="note-icon">
              <FavoriteBorder />
            </span>
            <Box>
              <Typography>Every detail, thoughtfully done</Typography>
              <Typography variant="caption">
                Good plans. Great people. Wonderful memories.
              </Typography>
            </Box>
          </Box>
        </Container>
      </section>
      <Container maxWidth="xl">
        <Paper className="search-panel" elevation={0}>
          <Box className="search-intro">
            <Typography className="eyebrow">LET’S GET STARTED</Typography>
            <Typography variant="h6">What are you planning?</Typography>
          </Box>
          <TextField
            select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            label="Choose a service"
            className="search-select"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
          >
            <MenuItem value="">Any service</MenuItem>
            {services.map((service) => (
              <MenuItem key={service.id} value={service.slug}>
                {service.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            component={Link}
            to={selectedService ? `/services/${selectedService}` : "/services"}
            variant="contained"
            endIcon={<ArrowForward />}
          >
            Find your service
          </Button>
        </Paper>
        <section className="section services-section">
          <SectionHeading
            eyebrow="MADE FOR YOUR MOMENTS"
            title="The good stuff, all in one place"
            body="A few clicks closer to a celebration that feels just right."
            action="See all services"
            to="/services"
          />
          {loading ? (
            <PageLoader />
          ) : (
            <div className="service-grid">
              {services
                .filter((s) => s.featured)
                .slice(0, 4)
                .map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
            </div>
          )}
        </section>
        <section className="steps-section">
          <SectionHeading
            eyebrow="AS EASY AS IT SHOULD BE"
            title="From “what if” to “wow”"
            body="We keep the planning simple, so you can focus on the moments that matter."
          />
          <div className="steps-grid">
            {[
              [
                "01",
                "Find your thing",
                "Explore trusted services made for weddings, gatherings, and every kind of celebration.",
                <Search />,
              ],
              [
                "02",
                "Make it yours",
                "Share a few event details and send a booking request in minutes.",
                <CalendarMonth />,
              ],
              [
                "03",
                "Enjoy the moment",
                "Our team will help coordinate the details. You bring the happy.",
                <AutoAwesome />,
              ],
            ].map(([number, title, body, icon]) => (
              <Paper key={number} className="step-card" elevation={0}>
                <span className="step-number">{number}</span>
                <span className="step-icon">{icon}</span>
                <Typography variant="h6">{title}</Typography>
                <Typography color="text.secondary">{body}</Typography>
              </Paper>
            ))}
          </div>
        </section>
        <section className="why-section">
          <div className="why-photo"></div>
          <Box className="why-content">
            <Typography className="eyebrow">
              A LITTLE LESS STRESS, A LOT MORE JOY
            </Typography>
            <Typography className="section-title">
              More than bookings.
              <br />
              <em>Peace of mind.</em>
            </Typography>
            <Typography color="text.secondary">
              We bring the right services together, so planning your event feels
              as good as the event itself.
            </Typography>
            <Stack spacing={2} className="why-points">
              {[
                [
                  <VerifiedOutlined />,
                  "Handpicked service partners",
                  "People who care about getting the details right.",
                ],
                [
                  <Handshake />,
                  "One simple place to plan",
                  "Browse, compare, and request all in one place.",
                ],
                [
                  <ShieldOutlined />,
                  "Support when you need it",
                  "A real team, ready to help you along the way.",
                ],
              ].map(([icon, title, caption]) => (
                <Stack key={title} direction="row" spacing={2}>
                  <span className="why-icon">{icon}</span>
                  <Box>
                    <Typography fontWeight={700}>{title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {caption}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
            <Button
              component={Link}
              to="/about"
              variant="outlined"
              endIcon={<ArrowForward />}
            >
              A little more about us
            </Button>
          </Box>
        </section>
        <section className="testimonial-section">
          <span className="quote-mark">“</span>
          <Typography className="testimonial-text">
            Everything came together so beautifully. We got to be present with
            our family, and that was the best gift of all.
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            spacing={1.5}
          >
            <Avatar className="review-avatar">P</Avatar>
            <Box sx={{ textAlign: "left" }}>
              <Typography fontWeight={700}>Priya & Arjun</Typography>
              <Typography variant="caption" color="text.secondary">
                A celebration made memorable
              </Typography>
            </Box>
          </Stack>
        </section>
        <section className="cta-panel">
          <Box>
            <Typography className="eyebrow">
              YOUR NEXT CHAPTER STARTS HERE
            </Typography>
            <Typography className="section-title">
              Let’s make it <em>one to remember.</em>
            </Typography>
            <Typography color="text.secondary">
              Tell us what you’re celebrating. We’ll help you take it from
              there.
            </Typography>
          </Box>
          <Button
            component={Link}
            to="/services"
            variant="contained"
            color="secondary"
            endIcon={<ArrowForward />}
          >
            Start planning
          </Button>
        </section>
      </Container>
    </>
  );
}

function SectionHeading({ eyebrow, title, body, action, to }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ sm: "end" }}
      justifyContent="space-between"
      spacing={2}
      className="section-heading"
    >
      <Box>
        <Typography className="eyebrow">{eyebrow}</Typography>
        <Typography className="section-title">{title}</Typography>
        {body && (
          <Typography color="text.secondary" className="section-body">
            {body}
          </Typography>
        )}
      </Box>
      {action && (
        <Button component={Link} to={to} endIcon={<ArrowForward />}>
          {action}
        </Button>
      )}
    </Stack>
  );
}

function Services() {
  const [search, setSearch] = useState("");
  const { data, loading, error } = useRemote(
    async () => (await api.get("/services")).data.services,
  );
  const services = useMemo(
    () =>
      (data || []).filter((s) =>
        `${s.name} ${s.category} ${s.description}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [data, search],
  );
  return (
    <Container maxWidth="xl" className="page-main">
      <PageIntro
        eyebrow="FIND YOUR PERFECT FIT"
        title="Services for every kind of celebration"
        body="From the grand entrance to the last dance, find all the pieces that make your day your own."
      />
      <TextField
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search services, categories…"
        className="service-search"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />
      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : loading ? (
        <PageLoader />
      ) : services.length ? (
        <div className="service-grid">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No services found"
          body="Try another search, or get in touch and tell us what you have in mind."
        />
      )}
    </Container>
  );
}

function PageIntro({ eyebrow, title, body }) {
  return (
    <Box className="page-intro">
      <Typography className="eyebrow">{eyebrow}</Typography>
      <Typography className="section-title">{title}</Typography>
      <Typography color="text.secondary">{body}</Typography>
    </Box>
  );
}

function EmptyState({ title, body }) {
  return (
    <Paper elevation={0} className="empty-state">
      <span className="empty-icon">
        <EventAvailable />
      </span>
      <Typography variant="h6">{title}</Typography>
      <Typography color="text.secondary">{body}</Typography>
    </Paper>
  );
}

function ServiceDetail({ user }) {
  const { slug } = useParams();
  const { data, loading, error } = useRemote(
    async () => (await api.get(`/services/${slug}`)).data.service,
    [slug],
  );
  if (loading) return <PageLoader />;
  if (error)
    return (
      <Container className="page-main">
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  return (
    <Container maxWidth="xl" className="page-main">
      <Link to="/services" className="back-link">
        <ChevronRight sx={{ transform: "rotate(180deg)" }} /> All services
      </Link>
      <div className="detail-layout">
        <Box className="detail-photo-wrap">
          <img src={data.imageUrl} alt={data.name} className="detail-photo" />
        </Box>
        <Box className="detail-copy">
          <Typography className="eyebrow">
            {data.category} · MADE FOR YOUR MOMENT
          </Typography>
          <Typography className="section-title">{data.name}</Typography>
          <Typography color="text.secondary">{data.description}</Typography>
          <Stack spacing={2} className="detail-benefits">
            <Stack direction="row" spacing={1}>
              <CheckCircle color="secondary" />
              <Typography>
                Thoughtful service, tailored to your event
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <CheckCircle color="secondary" />
              <Typography>A team to help you with the details</Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <CheckCircle color="secondary" />
              <Typography>
                No commitment until your request is reviewed
              </Typography>
            </Stack>
          </Stack>
          <Paper className="booking-cta" elevation={0}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Starting from
              </Typography>
              <Typography className="price detail-price">
                {data.priceFrom ? money(data.priceFrom) : "Custom quote"}
              </Typography>
            </Box>
            <Button
              component={Link}
              to={
                user ? `/book/${data.slug}` : `/login?next=/book/${data.slug}`
              }
              variant="contained"
              color="secondary"
              endIcon={<ArrowForward />}
            >
              Request a booking
            </Button>
          </Paper>
        </Box>
      </div>
    </Container>
  );
}

function BookingForm({ user }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      customerName: user?.name || "",
      customerEmail: user?.email || "",
      customerPhone: user?.phone || "",
    },
  });
  useEffect(() => {
    api
      .get(`/services/${slug}`)
      .then((r) => setService(r.data.service))
      .catch((e) => toast.error(pageError(e)))
      .finally(() => setLoading(false));
  }, [slug]);
  if (!user) return <Navigate to={`/login?next=/book/${slug}`} replace />;
  if (loading) return <PageLoader />;
  if (!service)
    return (
      <Container className="page-main">
        <Alert severity="error">This service could not be found.</Alert>
      </Container>
    );
  const submit = async (values) => {
    try {
      const { data } = await api.post("/bookings", {
        ...values,
        serviceId: service.id,
      });
      toast.success("Your booking request is on its way!");
      navigate(`/booking/${data.booking.id}`, {
        state: { booking: data.booking },
      });
    } catch (error) {
      toast.error(pageError(error));
    }
  };
  return (
    <Container maxWidth="md" className="page-main">
      <PageIntro
        eyebrow="A FEW LITTLE DETAILS"
        title="Let’s get your plans started"
        body="Send us your event details. Our team will be in touch to help make it happen."
      />
      <Paper className="form-card" elevation={0}>
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          className="selected-service"
        >
          <img src={service.imageUrl} alt="" />
          <Box>
            <Typography className="eyebrow">SERVICE · {service.category}</Typography>
            <Typography variant="h6">{service.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              From{" "}
              {service.priceFrom ? money(service.priceFrom) : "a custom quote"}{" "}
              · final details confirmed with you
            </Typography>
          </Box>
        </Stack>
        <Divider />
        <form onSubmit={handleSubmit(submit)} className="form-stack">
          <div className="form-grid">
            <TextField
              label="Name"
              inputProps={{ maxLength: 100 }}
              error={!!errors.customerName}
              helperText={errors.customerName?.message}
              {...register("customerName", {
                required: "Please enter your name.",
                minLength: { value: 2, message: "Please enter your full name." },
              })}
            />
            <TextField
              label="Email"
              type="email"
              error={!!errors.customerEmail}
              helperText={errors.customerEmail?.message}
              {...register("customerEmail", {
                required: "Please enter your email address.",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Please enter a valid email address.",
                },
              })}
            />
          </div>
          <div className="form-grid">
            <TextField
              label="Mobile number"
              type="tel"
              inputProps={{ maxLength: 30 }}
              error={!!errors.customerPhone}
              helperText={errors.customerPhone?.message}
              {...register("customerPhone", {
                required: "Please enter your mobile number.",
                minLength: { value: 7, message: "Please enter a valid mobile number." },
              })}
            />
            <TextField
              label="Booking date"
              type="date"
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: new Date().toISOString().slice(0, 10) }}
              error={!!errors.eventDate}
              helperText={errors.eventDate?.message}
              {...register("eventDate", {
                required: "Please choose your event date.",
              })}
            />
          </div>
          <div className="form-grid">
            <TextField
              label="From"
              placeholder="Starting location"
              inputProps={{ maxLength: 250 }}
              error={!!errors.fromLocation}
              helperText={errors.fromLocation?.message}
              {...register("fromLocation", {
                required: "Please enter the starting location.",
                minLength: { value: 2, message: "Please enter a valid location." },
              })}
            />
            <TextField
              label="To"
              placeholder="Destination"
              inputProps={{ maxLength: 250 }}
              error={!!errors.toLocation}
              helperText={errors.toLocation?.message}
              {...register("toLocation", {
                required: "Please enter the destination.",
                minLength: { value: 2, message: "Please enter a valid location." },
              })}
            />
          </div>
          <div className="form-grid">
            <TextField
              label="Event time"
              type="time"
              InputLabelProps={{ shrink: true }}
              error={!!errors.eventTime}
              helperText={errors.eventTime?.message}
              {...register("eventTime", { required: "Please choose a time." })}
            />
          </div>
          <TextField
            label="Notes"
            multiline
            minRows={3}
            placeholder="Guest count, preferences, or special requests (optional)"
            {...register("notes")}
          />
          <Alert severity="info" icon={<ShieldOutlined />}>
            This is a booking request, not a confirmed reservation. Our team
            will follow up to confirm availability and pricing.
          </Alert>
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            size="large"
            disabled={isSubmitting}
            endIcon={<ArrowForward />}
          >
            {isSubmitting ? "Sending request…" : "Send booking request"}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}

function BookingDetails({ user }) {
  const { id } = useParams();
  const { data, loading, error, refresh } = useRemote(
    async () => (await api.get(`/bookings/${id}`)).data.booking,
    [id],
  );
  const [responding, setResponding] = useState(false);
  if (!user) return <Navigate to="/login" replace />;
  if (loading) return <PageLoader />;
  if (error)
    return (
      <Container className="page-main">
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  const respondToOffer = async (response) => {
    setResponding(true);
    try {
      await api.patch(`/bookings/${id}/price-offer-response`, { response });
      toast.success(
        response === "accepted"
          ? "Price offer accepted."
          : "Price offer declined.",
      );
      await refresh();
    } catch (e) {
      toast.error(pageError(e));
    } finally {
      setResponding(false);
    }
  };
  return (
    <Container maxWidth="md" className="page-main">
      <PageIntro
        eyebrow="YOUR REQUEST IS IN"
        title="A lovely plan is taking shape."
        body="We’ve received your booking request. Our team will be in touch to confirm the details."
      />
      <Paper className="booking-detail-card" elevation={0}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography className="eyebrow">BOOKING REFERENCE</Typography>
            <Typography variant="h6">{data.reference}</Typography>
          </Box>
          <StatusChip status={data.status} />
        </Stack>
        <Divider />
        {data.decisionStatus === "rejected" && (
          <Alert severity="error">
            The owner was unable to accept this booking request.
          </Alert>
        )}
        {data.priceOfferStatus === "pending" && (
          <Alert
            severity="info"
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  disabled={responding}
                  onClick={() => respondToOffer("rejected")}
                >
                  Decline
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  disabled={responding}
                  onClick={() => respondToOffer("accepted")}
                >
                  Accept offer
                </Button>
              </Stack>
            }
          >
            <Typography fontWeight={700}>
              Price offer: {money(data.priceOfferAmount)}
            </Typography>
            {data.priceOfferMessage && (
              <Typography variant="body2">{data.priceOfferMessage}</Typography>
            )}
          </Alert>
        )}
        <Stack spacing={2}>
          <DetailRow label="Name" value={data.customerName} />
          <DetailRow label="Email" value={data.customerEmail} />
          <DetailRow label="Mobile number" value={data.customerPhone} />
          <DetailRow label="Service" value={data.serviceName} />
          <DetailRow
            label="Booking date"
            value={niceDate(data.eventDate)}
          />
          <DetailRow label="From" value={data.fromLocation} />
          <DetailRow label="To" value={data.toLocation || data.venue} />
          <DetailRow label="Event time" value={data.eventTime} />
          {data.notes && <DetailRow label="Notes" value={data.notes} />}
          <DetailRow
            label="Total booking amount"
            value={data.totalAmount ? money(data.totalAmount) : "Custom quote"}
          />
          <DetailRow label="Paid so far" value={money(data.paidAmount)} />
          <DetailRow label="Due amount" value={money(data.dueAmount)} />
          <Box>
            <Typography fontWeight={700} mb={1}>Payment history</Typography>
            {data.payments?.length ? (
              <Stack spacing={1}>
                {data.payments.map((payment) => (
                  <Stack key={payment.id} direction="row" justifyContent="space-between" spacing={2}>
                    <Typography color="text.secondary">
                      {niceDate(payment.paymentDate)}{payment.note ? ` · ${payment.note}` : ""}
                    </Typography>
                    <Typography fontWeight={600}>{money(payment.amount)}</Typography>
                  </Stack>
                ))}
              </Stack>
            ) : <Typography color="text.secondary">No payments recorded yet.</Typography>}
          </Box>
        </Stack>
        <Button component={Link} to="/my-bookings" variant="outlined">
          View all my bookings
        </Button>
      </Paper>
    </Container>
  );
}

function DetailRow({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={600} textAlign="right">
        {value || "—"}
      </Typography>
    </Stack>
  );
}

function StatusChip({ status }) {
  const color =
    {
      confirmed: "success",
      completed: "success",
      cancelled: "default",
      pending: "warning",
    }[status] || "default";
  return (
    <Chip label={status} color={color} size="small" className="status-chip" />
  );
}

function MyBookings({ user }) {
  const { data, loading, error } = useRemote(
    async () => (await api.get("/bookings")).data.bookings,
    [user],
  );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Container maxWidth="xl" className="page-main">
      <PageIntro
        eyebrow="YOUR PLANS, ALL TOGETHER"
        title="My bookings"
        body="Keep an eye on your requests and revisit the details whenever you need."
      />
      {loading ? (
        <PageLoader />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : data?.length ? (
        <div className="booking-list">
          {data.map((booking) => (
            <Paper
              component={Link}
              to={`/booking/${booking.id}`}
              key={booking.id}
              className="booking-list-card"
              elevation={0}
            >
              <img src={booking.serviceImage} alt="" />
              <Box className="booking-list-info">
                <Typography className="eyebrow">{booking.reference}</Typography>
                <Typography variant="h6">{booking.serviceName}</Typography>
                <Typography color="text.secondary">
                  {niceDate(booking.eventDate)} · {booking.fromLocation && booking.toLocation
                    ? `${booking.fromLocation} → ${booking.toLocation}`
                    : booking.venue}
                </Typography>
              </Box>
              <StatusChip status={booking.status} />
              <ArrowForward className="booking-arrow" />
            </Paper>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Your next celebration starts here"
          body="You haven't requested a booking yet. Browse our services and find the one that's right for you."
        />
      )}
      <Button
        component={Link}
        to="/services"
        variant="contained"
        color="secondary"
        endIcon={<ArrowForward />}
        className="empty-action"
      >
        Explore services
      </Button>
    </Container>
  );
}

function AuthPage({ mode, onLogin }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registerMode = mode === "register";
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const submit = async (values) => {
    try {
      const { data } = await api.post(
        `/auth/${registerMode ? "register" : "login"}`,
        values,
      );
      onLogin(data);
      toast.success(
        registerMode ? "Your account is ready. Welcome!" : "Welcome back!",
      );
      const destination = searchParams.get("next") || roleHome(data.user.role);
      navigate(destination, { replace: true });
    } catch (error) {
      toast.error(pageError(error));
    }
  };
  return (
    <Container maxWidth="sm" className="auth-page">
      <Paper elevation={0} className="auth-card">
        <Link to="/" className="brand auth-brand">
          <span className="brand-mark">B</span>
          <span>
            book kare<span className="brand-light"> abhi</span>
            <small>Har Booking, Abhi!</small>
          </span>
        </Link>
        <Typography className="eyebrow">
          {registerMode
            ? "LET’S MAKE SOMETHING SPECIAL"
            : "GOOD TO SEE YOU AGAIN"}
        </Typography>
        <Typography variant="h4" className="auth-title">
          {registerMode ? "Create your account" : "Welcome back"}
        </Typography>
        <Typography color="text.secondary">
          {registerMode
            ? "A few details and you're ready to plan."
            : "Sign in to pick up where you left off."}
        </Typography>
        <form onSubmit={handleSubmit(submit)} className="form-stack">
          {registerMode && (
            <TextField
              label="Your name"
              autoComplete="name"
              error={!!errors.name}
              helperText={errors.name?.message}
              {...register("name", {
                required: "Please enter your name.",
                minLength: {
                  value: 2,
                  message: "Please enter at least 2 characters.",
                },
              })}
            />
          )}
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            {...register("email", {
              required: "Please enter your email.",
              pattern: {
                value: /^\S+@\S+\.\S+$/,
                message: "Please enter a valid email address.",
              },
            })}
          />
          {registerMode && (
            <TextField
              label="Phone number (optional)"
              autoComplete="tel"
              {...register("phone")}
            />
          )}
          <TextField
            label="Password"
            type="password"
            autoComplete={registerMode ? "new-password" : "current-password"}
            error={!!errors.password}
            helperText={errors.password?.message}
            {...register("password", {
              required: "Please enter your password.",
              minLength: registerMode
                ? { value: 8, message: "Use at least 8 characters." }
                : undefined,
            })}
          />
          {!registerMode && (
            <Link to="/forgot-password" className="forgot-link">
              Forgot password?
            </Link>
          )}
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            size="large"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "One moment…"
              : registerMode
                ? "Create account"
                : "Sign in"}{" "}
            <ArrowForward className="button-icon" />
          </Button>
        </form>
        <Divider />
        <Typography textAlign="center" color="text.secondary">
          {registerMode ? "Already have an account?" : "New to Book Kare Abhi?"}{" "}
          <Link
            className="text-link"
            to={registerMode ? "/login" : "/register"}
          >
            {registerMode ? "Sign in" : "Create an account"}
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}

function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <Container maxWidth="sm" className="auth-page">
      <Paper elevation={0} className="auth-card">
        <Link to="/" className="brand auth-brand">
          <span className="brand-mark">B</span>
          <span>
            book kare<span className="brand-light"> abhi</span>
            <small>Har Booking, Abhi!</small>
          </span>
        </Link>
        <Typography className="eyebrow">ACCOUNT SUPPORT</Typography>
        <Typography variant="h4" className="auth-title">
          Forgot your password?
        </Typography>
        {submitted ? (
          <Alert severity="info">
            Password reset email delivery is not configured yet. Please contact
            our team for help accessing your account.
          </Alert>
        ) : (
          <>
            <Typography color="text.secondary">
              Enter your email and we’ll help you get back to planning.
            </Typography>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
            >
              <TextField label="Email address" type="email" required />
              <Button type="submit" variant="contained" color="secondary">
                Continue
              </Button>
            </form>
          </>
        )}
        <Link to="/login" className="text-link">
          Back to sign in
        </Link>
      </Paper>
    </Container>
  );
}

function StaticPage({ type }) {
  const pages = {
    about: [
      "A little about us",
      "Good celebrations start with feeling looked after.",
      "Book Kare Abhi brings trusted event services together in one friendly place. We believe planning should feel exciting, not overwhelming. From transport and entertainment to the finishing touches, we help you find the right people for the moments that matter.",
      "Our promise is simple: clear communication, thoughtful service, and a little more joy at every step.",
    ],
    contact: [
      "We’re all ears",
      "Tell us what you’re dreaming up.",
      "Have a question about a service or need a hand getting started? Our team would love to hear from you.",
      "Email us at hello@bookkareabhi.com or call +91 98765 43210. We’re here Monday to Saturday, 10:00 AM–6:00 PM.",
    ],
    privacy: [
      "Privacy policy",
      "Your trust matters to us.",
      "We collect the information you provide when you create an account or request a booking, such as your name, email address, phone number, event date, and venue. We use this information to manage your account and help coordinate your booking.",
      "We do not sell your personal information. You can contact us to request access, correction, or deletion of your account data. This sample policy should be reviewed by your legal counsel before launch.",
    ],
    terms: [
      "Terms & conditions",
      "A few helpful things to know.",
      "Booking requests submitted through Book Kare Abhi are not confirmed reservations. Availability, final pricing, and service details must be confirmed by our team and the relevant service provider.",
      "Any deposits, cancellation terms, and service agreements will be shared before a booking is confirmed. This sample document should be reviewed by your legal counsel before launch.",
    ],
  };
  const [title, headline, first, second] = pages[type];
  return (
    <Container maxWidth="md" className="page-main prose-page">
      <Typography className="eyebrow">
        {type === "about"
          ? "THE HEART BEHIND THE PLANS"
          : type === "contact"
            ? "HERE WHEN YOU NEED US"
            : "LAST UPDATED: NOVEMBER 2026"}
      </Typography>
      <Typography className="section-title">{title}</Typography>
      <Typography variant="h5" className="prose-lead">
        {headline}
      </Typography>
      <Typography color="text.secondary">{first}</Typography>
      <Typography color="text.secondary">{second}</Typography>
      {type === "contact" && (
        <Button
          component={Link}
          to="/services"
          variant="contained"
          color="secondary"
          endIcon={<ArrowForward />}
        >
          Explore services
        </Button>
      )}
    </Container>
  );
}

function RoleGuard({ user, role, children }) {
  const location = useLocation();
  if (!user)
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  if (user.role !== role && !(role === "client" && user.role === "customer")) {
    return <Navigate to={roleHome(user.role)} replace />;
  }
  return children;
}

function NotFound() {
  return (
    <Container className="page-main not-found">
      <Typography className="eyebrow">A LITTLE DETOUR</Typography>
      <Typography className="section-title">This page wandered off.</Typography>
      <Typography color="text.secondary">
        Let’s get you back to the good stuff.
      </Typography>
      <Button
        component={Link}
        to="/"
        variant="contained"
        color="secondary"
        endIcon={<ArrowForward />}
      >
        Back to home
      </Button>
    </Container>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(
    Boolean(localStorage.getItem("bka-token")),
  );
  const location = useLocation();
  const panelRoute = ["/client", "/owner", "/admin"].some((route) =>
    location.pathname.startsWith(route),
  );
  useEffect(() => {
    if (!localStorage.getItem("bka-token")) return;
    api
      .get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem("bka-token"))
      .finally(() => setAuthLoading(false));
  }, []);
  const onLogin = (session) => {
    localStorage.setItem("bka-token", session.token);
    setUser(session.user);
  };
  const logout = () => {
    localStorage.removeItem("bka-token");
    setUser(null);
    toast.info("You’re signed out.");
  };
  if (authLoading) return <PageLoader />;
  return (
    <>
      {!panelRoute && <SiteHeader user={user} logout={logout} />}
      <Routes>
        <Route
          path="/"
          element={
            user ? <Navigate to={roleHome(user.role)} replace /> : <Home />
          }
        />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:slug" element={<ServiceDetail user={user} />} />
        <Route
          path="/book/:slug"
          element={
            <RoleGuard user={user} role="client">
              <BookingForm user={user} />
            </RoleGuard>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <RoleGuard user={user} role="client">
              <MyBookings user={user} />
            </RoleGuard>
          }
        />
        <Route
          path="/booking/:id"
          element={
            <RoleGuard user={user} role="client">
              <BookingDetails user={user} />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard"
          element={<Navigate to={roleHome(user?.role)} replace />}
        />
        <Route
          path="/client/*"
          element={
            <RoleGuard user={user} role="client">
              <ClientDashboard user={user} logout={logout} />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/*"
          element={
            <RoleGuard user={user} role="admin">
              <AdminDashboard user={user} logout={logout} />
            </RoleGuard>
          }
        />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={roleHome(user.role)} replace />
            ) : (
              <AuthPage mode="login" onLogin={onLogin} />
            )
          }
        />
        <Route
          path="/register"
          element={
            user ? (
              <Navigate to={roleHome(user.role)} replace />
            ) : (
              <AuthPage mode="register" onLogin={onLogin} />
            )
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/about" element={<StaticPage type="about" />} />
        <Route path="/contact" element={<StaticPage type="contact" />} />
        <Route path="/privacy" element={<StaticPage type="privacy" />} />
        <Route path="/terms" element={<StaticPage type="terms" />} />
        <Route
          path="/owner"
          element={
            <RoleGuard user={user} role="owner">
              <OwnerLayout user={user} logout={logout} />
            </RoleGuard>
          }
        >
          <Route index element={<OwnerOverview />} />
          <Route path="bookings" element={<OwnerBookings />} />
          <Route path="services" element={<OwnerServices />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!panelRoute && <SiteFooter />}
    </>
  );
}
