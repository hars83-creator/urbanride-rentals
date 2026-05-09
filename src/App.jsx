import { AnimatePresence, motion } from "framer-motion";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import ElectricBorder from "./components/ElectricBorder.jsx";

const tokenStorageKey = "urbanride-token";
const themeStorageKey = "urbanride-theme";

const sectionTransition = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

const featureCards = [
  {
    eyebrow: "Reservations",
    title: "Search, compare, and reserve in one smooth flow",
    copy: "Customers can filter by city, category, availability, and pricing without leaving the landing experience.",
  },
  {
    eyebrow: "Checkout",
    title: "UPI-first payment guidance built into the booking flow",
    copy: "Generate a payment payload instantly, share the QR, and confirm the booking once payment is received.",
  },
  {
    eyebrow: "Operations",
    title: "Staff tooling for vehicles, tickets, and journey status",
    copy: "Teams can move bookings, review support load, and keep fleet status accurate without switching tools.",
  },
];

const promoHighlights = [
  "Premium cars, bikes, scooters, and EVs",
  "Real-time pricing with tax and deposit breakdown",
  "Support desk and staff operations in the same system",
];

const defaultSupportDraft = {
  subject: "",
  priority: "medium",
  message: "",
};

const defaultReviewDraft = {
  bookingId: "",
  rating: "5",
  title: "",
  comment: "",
};

const defaultAdminVehicleDraft = {
  name: "",
  category: "SUV",
  city: "Bengaluru",
  fuel: "Petrol",
  transmission: "Automatic",
  seats: "5",
  pricePerDay: "",
  securityDeposit: "",
  mileage: "",
  range: "",
  badge: "",
  color: "aurora",
  description: "",
};

function requestJson(path, { method = "GET", token = "", body, headers = {}, signal } = {}) {
  const requestHeaders = new Headers(headers);

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let payload = body;

  if (body && typeof body !== "string" && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  }

  return fetch(path, {
    method,
    headers: requestHeaders,
    body: payload,
    signal,
  }).then(async (response) => {
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
      const message = typeof data === "string" ? data : data?.error || "Request failed.";
      throw new Error(message);
    }

    return data;
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatShortDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function nextDateWindow() {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);
  start.setDate(today.getDate() + 1);
  end.setDate(today.getDate() + 3);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function defaultFilters() {
  return {
    search: "",
    category: "",
    city: "",
    fuel: "",
    seatsMin: "",
    availableFrom: "",
    availableTo: "",
    sort: "featured",
  };
}

function buildBookingDraft(vehicle) {
  const dates = nextDateWindow();
  return {
    vehicleId: vehicle.id,
    startDate: dates.startDate,
    endDate: dates.endDate,
    pickupLocation: `${vehicle.city} Central Hub`,
    dropoffLocation: `${vehicle.city} Central Hub`,
    couponCode: "",
    addOnCodes: [],
  };
}

function statusTone(status) {
  if (["confirmed", "active", "paid", "resolved", "available", "featured"].includes(status)) {
    return "is-success";
  }

  if (["pending-payment", "pending", "open", "maintenance"].includes(status)) {
    return "is-warning";
  }

  if (["cancelled", "high"].includes(status)) {
    return "is-danger";
  }

  return "is-neutral";
}

function Modal({ open, title, eyebrow, onClose, wide = false, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="modal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button className="modal-backdrop" type="button" onClick={onClose} aria-label="Close modal" />
          <motion.div
            className={`modal-card ${wide ? "is-wide" : ""}`}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="modal-head">
              <div>
                <p className="section-eyebrow">{eyebrow}</p>
                <h3>{title}</h3>
              </div>
              <button className="icon-button" type="button" onClick={onClose}>
                Close
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SectionHeader({ eyebrow, title, copy, action }) {
  return (
    <div className="section-header">
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <div className="section-header-meta">
        {copy ? <p>{copy}</p> : null}
        {action}
      </div>
    </div>
  );
}

function EmptyState({ title, copy, action }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{copy}</p>
      {action}
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem(themeStorageKey);
    if (stored) {
      return stored;
    }

    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  const [token, setToken] = useState(() => localStorage.getItem(tokenStorageKey) || "");
  const [bootstrap, setBootstrap] = useState(null);
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [paymentContext, setPaymentContext] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const deferredFilters = useDeferredValue(filters);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authDraft, setAuthDraft] = useState({ name: "", phone: "", email: "", password: "" });
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingVehicleId, setBookingVehicleId] = useState("");
  const [bookingDraft, setBookingDraft] = useState(null);
  const [quotePreview, setQuotePreview] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDraft, setReviewDraft] = useState(defaultReviewDraft);
  const [supportDraft, setSupportDraft] = useState(defaultSupportDraft);
  const [adminVehicleDraft, setAdminVehicleDraft] = useState(defaultAdminVehicleDraft);
  const [pendingVehicleIdAfterAuth, setPendingVehicleIdAfterAuth] = useState("");
  const [busyState, setBusyState] = useState({
    auth: false,
    booking: false,
    quote: false,
    support: false,
    review: false,
    adminVehicle: false,
  });
  const [toasts, setToasts] = useState([]);

  const isAdmin = user?.role === "admin";
  const staffConfigured = Boolean(bootstrap?.staffAccessConfigured);
  const selectedVehicle = useMemo(() => {
    return bootstrap?.vehicles?.find((vehicle) => vehicle.id === bookingVehicleId) || vehicles.find((vehicle) => vehicle.id === bookingVehicleId) || null;
  }, [bookingVehicleId, bootstrap?.vehicles, vehicles]);

  const allowedAddOns = useMemo(() => {
    if (!selectedVehicle) {
      return [];
    }

    return addOns.filter((item) => selectedVehicle.addOnsAllowed?.includes(item.code));
  }, [addOns, selectedVehicle]);

  function saveToken(nextToken) {
    setToken(nextToken);
    if (nextToken) {
      localStorage.setItem(tokenStorageKey, nextToken);
    } else {
      localStorage.removeItem(tokenStorageKey);
    }
  }

  function showToast(message) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3200);
  }

  function getVehicleById(vehicleId) {
    return vehicles.find((vehicle) => vehicle.id === vehicleId) || bootstrap?.vehicles?.find((vehicle) => vehicle.id === vehicleId) || null;
  }

  function getBookingById(bookingId) {
    return bookings.find((booking) => booking.id === bookingId) || admin?.bookings?.find((booking) => booking.id === bookingId) || null;
  }

  function hasReviewForBooking(bookingId) {
    return reviews.some((review) => review.bookingId === bookingId);
  }

  async function loadPaymentContext(targetToken = token, bookingId, rerender = true) {
    const payload = await requestJson(`/api/bookings/${bookingId}/payment/qr`, {
      token: targetToken,
    });
    startTransition(() => {
      setPaymentContext(payload);
    });

    if (rerender) {
      document.getElementById("journeys")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function loadPrivateData(targetToken = token, targetRole = user?.role) {
    const requests = [
      requestJson("/api/bookings", { token: targetToken }),
      requestJson("/api/tickets", { token: targetToken }),
    ];

    if (targetRole === "admin") {
      requests.push(requestJson("/api/admin/dashboard", { token: targetToken }));
    }

    const [bookingsPayload, ticketsPayload, adminPayload] = await Promise.all(requests);

    startTransition(() => {
      setBookings(bookingsPayload.bookings || []);
      setTickets(ticketsPayload.tickets || []);
      setAdmin(adminPayload || null);
    });

    const pendingBooking = (bookingsPayload.bookings || []).find((booking) => booking.paymentStatus !== "paid");
    if (pendingBooking) {
      await loadPaymentContext(targetToken, pendingBooking.id, false);
    } else {
      startTransition(() => {
        setPaymentContext(null);
      });
    }
  }

  async function bootstrapApp(targetToken = token) {
    const payload = await requestJson("/api/bootstrap", { token: targetToken });

    startTransition(() => {
      setBootstrap(payload);
      setUser(payload.user);
      setPromotions(payload.promotions || []);
      setAddOns(payload.addOns || []);
      setReviews(payload.reviews || []);
      setVehicles(payload.vehicles || []);
    });

    if (payload.user) {
      await loadPrivateData(targetToken, payload.user.role);
    } else {
      startTransition(() => {
        setBookings([]);
        setTickets([]);
        setAdmin(null);
        setPaymentContext(null);
      });
    }
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    bootstrapApp().catch((error) => {
      showToast(error.message);
    });
  }, []);

  useEffect(() => {
    if (!bootstrap) {
      return undefined;
    }

    const controller = new AbortController();
    const params = new URLSearchParams();

    Object.entries(deferredFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    requestJson(`/api/vehicles${params.toString() ? `?${params.toString()}` : ""}`, {
      signal: controller.signal,
    })
      .then((payload) => {
        startTransition(() => {
          setVehicles(payload.vehicles || []);
        });
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          showToast(error.message);
        }
      });

    return () => controller.abort();
  }, [bootstrap, deferredFilters]);

  function openAuth(mode = "login") {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  function openBooking(vehicleId) {
    const vehicle = getVehicleById(vehicleId);
    if (!vehicle) {
      return;
    }

    setBookingVehicleId(vehicle.id);
    setBookingDraft(buildBookingDraft(vehicle));
    setQuotePreview(null);
    setBookingOpen(true);
  }

  async function submitAuth(event) {
    event.preventDefault();
    setBusyState((current) => ({ ...current, auth: true }));

    try {
      if (authMode === "register") {
        const payload = await requestJson("/api/register", {
          method: "POST",
          body: authDraft,
        });

        saveToken(payload.token);
        startTransition(() => {
          setUser(payload.user);
          setAuthOpen(false);
          setAuthDraft({ name: "", phone: "", email: "", password: "" });
        });
        showToast(`Welcome to UrbanRide, ${payload.user.name}.`);
        await bootstrapApp(payload.token);
      } else {
        const payload = await requestJson("/api/login", {
          method: "POST",
          body: { email: authDraft.email, password: authDraft.password },
        });

        saveToken(payload.token);
        startTransition(() => {
          setUser(payload.user);
          setAuthOpen(false);
          setAuthDraft({ name: "", phone: "", email: "", password: "" });
        });
        showToast(`Welcome back, ${payload.user.name}.`);
        await bootstrapApp(payload.token);
      }

      if (pendingVehicleIdAfterAuth) {
        openBooking(pendingVehicleIdAfterAuth);
        setPendingVehicleIdAfterAuth("");
      }
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusyState((current) => ({ ...current, auth: false }));
    }
  }

  async function logout() {
    try {
      await requestJson("/api/logout", {
        method: "POST",
        token,
      });
    } catch {
      // Ignore logout errors and clear local state.
    }

    saveToken("");
    startTransition(() => {
      setUser(null);
      setBookings([]);
      setTickets([]);
      setAdmin(null);
      setPaymentContext(null);
    });
    showToast("Signed out.");
    await bootstrapApp("");
  }

  async function previewQuote() {
    if (!bookingDraft) {
      return;
    }

    setBusyState((current) => ({ ...current, quote: true }));
    try {
      const payload = await requestJson("/api/quote", {
        method: "POST",
        body: bookingDraft,
      });
      setQuotePreview(payload.quote);
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusyState((current) => ({ ...current, quote: false }));
    }
  }

  async function submitBooking(event) {
    event.preventDefault();
    if (!bookingDraft) {
      return;
    }

    if (!user) {
      setBookingOpen(false);
      setPendingVehicleIdAfterAuth(bookingDraft.vehicleId);
      openAuth("login");
      showToast("Sign in to continue with booking.");
      return;
    }

    setBusyState((current) => ({ ...current, booking: true }));
    try {
      const payload = await requestJson("/api/bookings", {
        method: "POST",
        token,
        body: bookingDraft,
      });

      setBookingOpen(false);
      setQuotePreview(null);
      showToast("Booking created. Complete payment to confirm the reservation.");
      await bootstrapApp(token);
      await loadPaymentContext(token, payload.booking.id);
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusyState((current) => ({ ...current, booking: false }));
    }
  }

  async function cancelBooking(bookingId) {
    try {
      await requestJson(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        token,
        body: { status: "cancelled" },
      });
      showToast("Booking cancelled.");
      await bootstrapApp(token);
    } catch (error) {
      showToast(error.message);
    }
  }

  async function confirmPayment(bookingId) {
    try {
      await requestJson(`/api/bookings/${bookingId}/payment/confirm`, {
        method: "POST",
        token,
      });
      showToast("Payment confirmed.");
      await bootstrapApp(token);
      await loadPaymentContext(token, bookingId);
    } catch (error) {
      showToast(error.message);
    }
  }

  async function downloadInvoice(bookingId) {
    try {
      const invoiceText = await requestJson(`/api/bookings/${bookingId}/invoice`, {
        token,
      });
      const blob = new Blob([invoiceText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${bookingId}-invoice.txt`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast(error.message);
    }
  }

  async function submitReview(event) {
    event.preventDefault();
    setBusyState((current) => ({ ...current, review: true }));

    try {
      await requestJson("/api/reviews", {
        method: "POST",
        token,
        body: {
          ...reviewDraft,
          rating: Number(reviewDraft.rating),
        },
      });
      setReviewOpen(false);
      setReviewDraft(defaultReviewDraft);
      showToast("Thanks for sharing your feedback.");
      await bootstrapApp(token);
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusyState((current) => ({ ...current, review: false }));
    }
  }

  async function submitSupportTicket(event) {
    event.preventDefault();

    if (!user) {
      openAuth("login");
      showToast("Sign in to raise a support request.");
      return;
    }

    setBusyState((current) => ({ ...current, support: true }));
    try {
      await requestJson("/api/tickets", {
        method: "POST",
        token,
        body: supportDraft,
      });
      setSupportDraft(defaultSupportDraft);
      showToast("Support ticket submitted.");
      await bootstrapApp(token);
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusyState((current) => ({ ...current, support: false }));
    }
  }

  async function submitAdminVehicle(event) {
    event.preventDefault();
    setBusyState((current) => ({ ...current, adminVehicle: true }));

    try {
      await requestJson("/api/vehicles", {
        method: "POST",
        token,
        body: {
          ...adminVehicleDraft,
          seats: Number(adminVehicleDraft.seats),
          pricePerDay: Number(adminVehicleDraft.pricePerDay),
          securityDeposit: Number(adminVehicleDraft.securityDeposit),
          addOnsAllowed: addOns.map((item) => item.code),
          features: ["Connected navigation", "Premium support", "Fleet maintained"],
        },
      });

      setAdminVehicleDraft(defaultAdminVehicleDraft);
      showToast("Vehicle added to the live fleet.");
      await bootstrapApp(token);
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusyState((current) => ({ ...current, adminVehicle: false }));
    }
  }

  async function updateAdminBookingStatus(bookingId, status) {
    try {
      await requestJson(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        token,
        body: { status },
      });
      showToast(`Booking moved to ${status}.`);
      await bootstrapApp(token);
    } catch (error) {
      showToast(error.message);
    }
  }

  async function updateTicketStatus(ticketId, status) {
    try {
      await requestJson(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        token,
        body: { status },
      });
      showToast(`Ticket marked ${status}.`);
      await bootstrapApp(token);
    } catch (error) {
      showToast(error.message);
    }
  }

  async function updateVehicleStatus(vehicleId, status) {
    try {
      await requestJson(`/api/vehicles/${vehicleId}`, {
        method: "PUT",
        token,
        body: { status },
      });
      showToast(`Vehicle moved to ${status}.`);
      await bootstrapApp(token);
    } catch (error) {
      showToast(error.message);
    }
  }

  const pendingBooking = useMemo(() => {
    return bookings.find((booking) => booking.paymentStatus !== "paid") || null;
  }, [bookings]);

  return (
    <div className="app-shell">
      <div className="background-veil" />

      <motion.header
        className="navbar-shell"
        initial={{ y: -28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="navbar glass-surface">
          <a className="brand" href="#hero">
            <span className="brand-mark">UR</span>
            <span>
              <strong>UrbanRide Rentals</strong>
              <small>Premium mobility operations</small>
            </span>
          </a>

          <nav className="nav-links">
            <a href="#fleet">Fleet</a>
            <a href="#journeys">Bookings</a>
            <a href="#support">Support</a>
            <a href="#admin">Staff</a>
          </nav>

          <div className="nav-actions">
            <button
              className="icon-button"
              type="button"
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            {user ? (
              <button className="button ghost" type="button" onClick={logout}>
                Logout
              </button>
            ) : (
              <button className="button ghost" type="button" onClick={() => openAuth("login")}>
                Sign in
              </button>
            )}
          </div>
        </div>
      </motion.header>

      <main className="page-shell">
        <section className="hero-grid" id="hero">
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="section-eyebrow">Premium fleet SaaS</p>
            <h1>Run a modern rental storefront with premium UX, live bookings, and UPI-ready checkout.</h1>
            <p className="hero-copy-text">
              UrbanRide combines public booking journeys, payment instructions, support operations, and staff tools in
              a polished interface designed for modern mobility brands.
            </p>

            <div className="hero-actions">
              <button className="button primary" type="button" onClick={() => document.getElementById("fleet")?.scrollIntoView({ behavior: "smooth" })}>
                Explore fleet
              </button>
              <button className="button secondary" type="button" onClick={() => openAuth("register")}>
                Create account
              </button>
              <button className="button ghost" type="button" onClick={() => openAuth("login")}>
                Staff sign in
              </button>
            </div>

            <div className="hero-chips">
              {promoHighlights.map((item) => (
                <span key={item} className="chip">
                  {item}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="hero-board-shell"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <ElectricBorder
              color={theme === "dark" ? "#7df9ff" : "#0057ff"}
              speed={0.9}
              chaos={0.08}
              borderRadius={30}
              className="hero-electric-border"
            >
              <div className="hero-board glass-surface elevated">
                <div className="hero-board-header">
                  <div>
                    <p className="section-eyebrow">Live control layer</p>
                    <h3>Reservations, support, and staff ops in one surface</h3>
                  </div>
                  <span className={`pill ${staffConfigured ? "is-success" : "is-warning"}`}>
                    {staffConfigured ? "Staff access ready" : "Add staff env vars"}
                  </span>
                </div>

                <div className="kpi-grid">
                  <motion.div whileHover={{ y: -4 }} className="kpi-card">
                    <strong>{bootstrap?.stats?.totalVehicles ?? "--"}</strong>
                    <span>Live vehicles</span>
                  </motion.div>
                  <motion.div whileHover={{ y: -4 }} className="kpi-card">
                    <strong>{bootstrap?.stats?.activeCities ?? "--"}</strong>
                    <span>Cities covered</span>
                  </motion.div>
                  <motion.div whileHover={{ y: -4 }} className="kpi-card">
                    <strong>{bootstrap?.stats?.completedBookings ?? "--"}</strong>
                    <span>Journeys completed</span>
                  </motion.div>
                  <motion.div whileHover={{ y: -4 }} className="kpi-card">
                    <strong>{bootstrap?.stats?.averageRating ?? "--"}</strong>
                    <span>Average rating</span>
                  </motion.div>
                </div>

                <div className="hero-board-foot">
                  <div>
                    <p>Payment rail</p>
                    <strong>{bootstrap?.company?.upiId || "UPI configured on server"}</strong>
                  </div>
                  <div>
                    <p>Support desk</p>
                    <strong>{bootstrap?.company?.supportEmail || "support@yourdomain.com"}</strong>
                  </div>
                </div>
              </div>
            </ElectricBorder>
          </motion.div>
        </section>

        <motion.section className="stats-grid" {...sectionTransition}>
          {[
            { value: bootstrap?.stats?.totalVehicles ?? "--", label: "fleet listings in circulation" },
            { value: bootstrap?.stats?.activeCities ?? "--", label: "service cities in the current network" },
            { value: bootstrap?.stats?.completedBookings ?? "--", label: "confirmed journeys already processed" },
            { value: bootstrap?.stats?.averageRating ?? "--", label: "average satisfaction across recent reviews" },
          ].map((item) => (
            <motion.article key={item.label} className="glass-surface stat-card" whileHover={{ y: -6 }}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </motion.article>
          ))}
        </motion.section>

        <motion.section className="section-block" {...sectionTransition}>
          <SectionHeader
            eyebrow="Platform design"
            title="A premium mobility experience for customers and operators"
            copy="The interface pairs glassmorphism, strong hierarchy, and operational clarity so the storefront feels aspirational while remaining practical."
          />

          <div className="feature-grid">
            {featureCards.map((feature, index) => (
              <motion.article
                key={feature.title}
                className="glass-surface feature-card"
                whileHover={{ y: -8, scale: 1.01 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <span className="feature-index">0{index + 1}</span>
                <p className="section-eyebrow">{feature.eyebrow}</p>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section className="section-block" id="fleet" {...sectionTransition}>
          <SectionHeader
            eyebrow="Fleet marketplace"
            title="Browse the available fleet"
            copy="Filter by city, category, fuel, seating, and date availability to narrow the perfect vehicle."
            action={
              <button className="button ghost" type="button" onClick={() => setFilters(defaultFilters())}>
                Reset filters
              </button>
            }
          />

          <div className="glass-surface filter-panel">
            <label className="field">
              <span>Search</span>
              <input
                type="text"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="SUV, electric, airport..."
              />
            </label>
            <label className="field">
              <span>Category</span>
              <select
                value={filters.category}
                onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
              >
                <option value="">All categories</option>
                <option value="SUV">SUV</option>
                <option value="Adventure">Adventure</option>
                <option value="Sedan">Sedan</option>
                <option value="Electric">Electric</option>
                <option value="Scooter">Scooter</option>
                <option value="Bike">Bike</option>
              </select>
            </label>
            <label className="field">
              <span>City</span>
              <select
                value={filters.city}
                onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))}
              >
                <option value="">All cities</option>
                {(bootstrap?.company?.cityCoverage || []).map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Fuel</span>
              <select
                value={filters.fuel}
                onChange={(event) => setFilters((current) => ({ ...current, fuel: event.target.value }))}
              >
                <option value="">Any fuel</option>
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Electric">Electric</option>
              </select>
            </label>
            <label className="field">
              <span>Seats</span>
              <select
                value={filters.seatsMin}
                onChange={(event) => setFilters((current) => ({ ...current, seatsMin: event.target.value }))}
              >
                <option value="">Any</option>
                <option value="2">2+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
                <option value="7">7+</option>
              </select>
            </label>
            <label className="field">
              <span>Available from</span>
              <input
                type="date"
                value={filters.availableFrom}
                onChange={(event) => setFilters((current) => ({ ...current, availableFrom: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Available to</span>
              <input
                type="date"
                value={filters.availableTo}
                onChange={(event) => setFilters((current) => ({ ...current, availableTo: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Sort by</span>
              <select
                value={filters.sort}
                onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="rating">Top rated</option>
              </select>
            </label>
          </div>

          <div className="vehicle-grid">
            {vehicles.length ? (
              vehicles.map((vehicle) => (
                <motion.article
                  key={vehicle.id}
                  className={`glass-surface vehicle-card tone-${vehicle.color || "aurora"}`}
                  whileHover={{ y: -10, rotateX: 2 }}
                  transition={{ type: "spring", stiffness: 240, damping: 18 }}
                >
                  <div className="vehicle-card-top">
                    <div>
                      <span className={`pill ${vehicle.featured ? "is-success" : "is-neutral"}`}>{vehicle.badge}</span>
                      <h3>{vehicle.name}</h3>
                      <p>
                        {vehicle.category} · {vehicle.city}
                      </p>
                    </div>
                    <div className="rating-chip">{vehicle.rating} / 5</div>
                  </div>
                  <p className="vehicle-description">{vehicle.description}</p>
                  <div className="pill-row">
                    <span className="chip">{vehicle.transmission}</span>
                    <span className="chip">{vehicle.fuel}</span>
                    <span className="chip">{vehicle.seats} seats</span>
                    <span className="chip">{vehicle.mileage}</span>
                  </div>
                  <div className="pill-row subtle-row">
                    {(vehicle.features || []).slice(0, 3).map((feature) => (
                      <span key={feature} className="subtle-pill">
                        {feature}
                      </span>
                    ))}
                  </div>
                  <div className="vehicle-card-footer">
                    <div>
                      <strong>{formatCurrency(vehicle.pricePerDay)}</strong>
                      <span>per day · deposit {formatCurrency(vehicle.securityDeposit)}</span>
                    </div>
                    <button
                      className={`button ${vehicle.status === "maintenance" ? "ghost" : "primary"}`}
                      type="button"
                      onClick={() => {
                        if (!user) {
                          setPendingVehicleIdAfterAuth(vehicle.id);
                          openAuth("login");
                          showToast("Sign in to begin the booking.");
                          return;
                        }
                        openBooking(vehicle.id);
                      }}
                      disabled={vehicle.status === "maintenance"}
                    >
                      {vehicle.status === "maintenance" ? "In maintenance" : "Book now"}
                    </button>
                  </div>
                </motion.article>
              ))
            ) : (
              <EmptyState
                title="No vehicles match the current filters."
                copy="Try widening the city, availability window, or category to reveal more inventory."
              />
            )}
          </div>
        </motion.section>

        <motion.section className="section-block" id="journeys" {...sectionTransition}>
          <SectionHeader
            eyebrow="Customer workspace"
            title={user ? `Welcome back, ${user.name}` : "Track bookings, payments, and trip history"}
            copy={
              user
                ? "Use this workspace to manage active reservations, invoices, payment status, and feedback."
                : "Sign in to manage upcoming rentals, payment confirmations, and trip history."
            }
          />

          <div className="workspace-grid">
            <div className="glass-surface stack-panel">
              <div className="panel-head">
                <div>
                  <p className="section-eyebrow">Bookings</p>
                  <h3>Active reservations</h3>
                </div>
                {user ? (
                  <button className="button ghost" type="button" onClick={() => bootstrapApp(token)}>
                    Refresh
                  </button>
                ) : null}
              </div>

              <div className="stack-list">
                {user ? (
                  bookings.length ? (
                    bookings.map((booking) => (
                      <motion.article key={booking.id} className="list-card" whileHover={{ y: -4 }}>
                        <div className="list-card-head">
                          <div>
                            <h4>{booking.vehicle?.name || "Vehicle booking"}</h4>
                            <p>
                              {formatShortDate(booking.startDate)} - {formatShortDate(booking.endDate)} · {booking.pickupLocation}
                            </p>
                          </div>
                          <div className="pill-row">
                            <span className={`pill ${statusTone(booking.status)}`}>{booking.status}</span>
                            <span className={`pill ${statusTone(booking.paymentStatus)}`}>{booking.paymentStatus}</span>
                          </div>
                        </div>
                        <div className="list-card-body">
                          <span>Total {formatCurrency(booking.quote?.grandTotal)}</span>
                          <span>Created {formatDateTime(booking.createdAt)}</span>
                        </div>
                        <div className="action-row">
                          {booking.paymentStatus !== "paid" ? (
                            <button className="button primary" type="button" onClick={() => loadPaymentContext(token, booking.id)}>
                              Open payment
                            </button>
                          ) : null}
                          {["pending-payment", "confirmed"].includes(booking.status) ? (
                            <button className="button ghost" type="button" onClick={() => cancelBooking(booking.id)}>
                              Cancel
                            </button>
                          ) : null}
                          {booking.paymentStatus === "paid" ? (
                            <button className="button ghost" type="button" onClick={() => downloadInvoice(booking.id)}>
                              Invoice
                            </button>
                          ) : null}
                          {booking.status === "completed" && !hasReviewForBooking(booking.id) ? (
                            <button
                              className="button ghost"
                              type="button"
                              onClick={() => {
                                setReviewDraft({ ...defaultReviewDraft, bookingId: booking.id });
                                setReviewOpen(true);
                              }}
                            >
                              Review
                            </button>
                          ) : null}
                        </div>
                      </motion.article>
                    ))
                  ) : (
                    <EmptyState
                      title="No bookings yet."
                      copy="Once you reserve a vehicle, your upcoming trips, invoices, and payment status will appear here."
                    />
                  )
                ) : (
                  <EmptyState
                    title="Account access required."
                    copy="Create an account or sign in to see reservations, invoices, and journey updates."
                    action={
                      <button className="button primary" type="button" onClick={() => openAuth("login")}>
                        Sign in
                      </button>
                    }
                  />
                )}
              </div>
            </div>

            <div className="stack-panel">
              {paymentContext ? (
                <ElectricBorder
                  color={theme === "dark" ? "#8dfcf0" : "#4f46e5"}
                  speed={1.15}
                  chaos={0.1}
                  borderRadius={28}
                >
                  <div className="glass-surface payment-panel">
                    <div className="panel-head">
                      <div>
                        <p className="section-eyebrow">Payment rail</p>
                        <h3>{getBookingById(paymentContext.bookingId)?.vehicle?.name || "Booking payment"}</h3>
                      </div>
                      <span className={`pill ${statusTone(getBookingById(paymentContext.bookingId)?.paymentStatus || "pending")}`}>
                        {getBookingById(paymentContext.bookingId)?.paymentStatus || "pending"}
                      </span>
                    </div>

                    <div className="payment-grid">
                      <div className="qr-card">
                        <img src={paymentContext.qrImageUrl} alt="UPI payment QR code" />
                      </div>
                      <div className="payment-details">
                        <div>
                          <p className="meta-label">Amount</p>
                          <h4>{formatCurrency(paymentContext.amount)}</h4>
                        </div>
                        <div>
                          <p className="meta-label">UPI ID</p>
                          <p>{paymentContext.upiId}</p>
                        </div>
                        <div>
                          <p className="meta-label">Payment payload</p>
                          <code>{paymentContext.qrPayload}</code>
                        </div>
                        <p className="payment-note">
                          Complete the payment from any UPI app, then confirm it here to move the booking from pending to confirmed.
                        </p>
                        <div className="action-row">
                          {getBookingById(paymentContext.bookingId)?.paymentStatus !== "paid" ? (
                            <button className="button primary" type="button" onClick={() => confirmPayment(paymentContext.bookingId)}>
                              I have paid
                            </button>
                          ) : null}
                          <button className="button ghost" type="button" onClick={() => downloadInvoice(paymentContext.bookingId)}>
                            Download invoice
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </ElectricBorder>
              ) : (
                <div className="glass-surface stack-panel">
                  <div className="panel-head">
                    <div>
                      <p className="section-eyebrow">Payment rail</p>
                      <h3>Ready when your next booking is created</h3>
                    </div>
                  </div>
                  <EmptyState
                    title={pendingBooking ? "Choose a booking to continue payment." : "No pending payments right now."}
                    copy="A booking with pending payment will generate a QR instruction card here for a cleaner checkout experience."
                  />
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section className="section-block" {...sectionTransition}>
          <SectionHeader
            eyebrow="Customer voice"
            title="Recent customer feedback"
            copy="Public trust indicators stay close to the booking flow, reinforcing service quality and clarity."
          />

          <div className="review-grid">
            {reviews.slice(0, 6).map((review) => (
              <motion.article key={review.id} className="glass-surface review-card" whileHover={{ y: -6 }}>
                <div className="review-card-head">
                  <div>
                    <p className="section-eyebrow">{review.vehicleName}</p>
                    <h3>{review.title}</h3>
                  </div>
                  <div className="rating-chip">{`${"★".repeat(Number(review.rating || 5))}`}</div>
                </div>
                <p>{review.comment}</p>
                <div className="review-meta">
                  <span>{review.customerName}</span>
                  <span>{formatShortDate(review.createdAt)}</span>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section className="section-block" id="support" {...sectionTransition}>
          <SectionHeader
            eyebrow="Operations workspace"
            title="Support and staff tooling"
            copy="Raise tickets, monitor service quality, and let staff coordinate live fleet and booking changes in the same interface."
          />

          <div className="support-admin-grid">
            <div className="glass-surface stack-panel">
              <div className="panel-head">
                <div>
                  <p className="section-eyebrow">Support desk</p>
                  <h3>Customer support tickets</h3>
                </div>
              </div>

              <form className="form-grid compact-form" onSubmit={submitSupportTicket}>
                <label className="field">
                  <span>Subject</span>
                  <input
                    type="text"
                    value={supportDraft.subject}
                    onChange={(event) => setSupportDraft((current) => ({ ...current, subject: event.target.value }))}
                    placeholder="Need to shift pickup time"
                    disabled={!user}
                  />
                </label>
                <label className="field">
                  <span>Priority</span>
                  <select
                    value={supportDraft.priority}
                    onChange={(event) => setSupportDraft((current) => ({ ...current, priority: event.target.value }))}
                    disabled={!user}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label className="field field-full">
                  <span>Message</span>
                  <textarea
                    rows="4"
                    value={supportDraft.message}
                    onChange={(event) => setSupportDraft((current) => ({ ...current, message: event.target.value }))}
                    placeholder="Tell support exactly what needs attention."
                    disabled={!user}
                  />
                </label>
                <div className="form-actions field-full">
                  <button className="button primary" type="submit" disabled={!user || busyState.support}>
                    {busyState.support ? "Submitting..." : "Raise ticket"}
                  </button>
                </div>
              </form>

              <div className="stack-list">
                {user ? (
                  tickets.length ? (
                    tickets.map((ticket) => (
                      <motion.article key={ticket.id} className="list-card" whileHover={{ y: -4 }}>
                        <div className="list-card-head">
                          <div>
                            <h4>{ticket.subject}</h4>
                            <p>{ticket.message}</p>
                          </div>
                          <div className="pill-row">
                            <span className={`pill ${statusTone(ticket.priority)}`}>{ticket.priority}</span>
                            <span className={`pill ${statusTone(ticket.status)}`}>{ticket.status}</span>
                          </div>
                        </div>
                        <div className="list-card-body">
                          <span>Updated {formatDateTime(ticket.updatedAt)}</span>
                          {ticket.notes ? <span>Staff note: {ticket.notes}</span> : null}
                        </div>
                      </motion.article>
                    ))
                  ) : (
                    <EmptyState
                      title="No support tickets yet."
                      copy="Your service requests will appear here once you raise them."
                    />
                  )
                ) : (
                  <EmptyState
                    title="Sign in to contact support."
                    copy="Support history is tied to your account so your team can follow up with context."
                  />
                )}
              </div>
            </div>

            <div className="stack-panel" id="admin">
              {isAdmin && admin ? (
                <div className="admin-stack">
                  <div className="glass-surface stack-panel">
                    <div className="panel-head">
                      <div>
                        <p className="section-eyebrow">Staff console</p>
                        <h3>Operational metrics</h3>
                      </div>
                      <button className="button ghost" type="button" onClick={() => bootstrapApp(token)}>
                        Refresh
                      </button>
                    </div>
                    <div className="admin-metrics">
                      {[
                        { label: "Paid booking volume", value: formatCurrency(admin.stats.monthlyRevenue) },
                        { label: "Pending payments", value: admin.stats.pendingPayments },
                        { label: "Active trips", value: admin.stats.activeBookings },
                        { label: "Utilization", value: `${admin.stats.utilization}%` },
                      ].map((metric) => (
                        <motion.div key={metric.label} className="metric-card" whileHover={{ y: -4 }}>
                          <strong>{metric.value}</strong>
                          <span>{metric.label}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="admin-columns">
                    <div className="glass-surface stack-panel">
                      <div className="panel-head">
                        <div>
                          <p className="section-eyebrow">Bookings queue</p>
                          <h3>Recent bookings</h3>
                        </div>
                      </div>
                      <div className="stack-list">
                        {admin.bookings.map((booking) => (
                          <motion.article key={booking.id} className="list-card" whileHover={{ y: -4 }}>
                            <div className="list-card-head">
                              <div>
                                <h4>{booking.vehicle?.name || booking.id}</h4>
                                <p>{booking.customer?.name || "Customer"}</p>
                              </div>
                              <div className="pill-row">
                                <span className={`pill ${statusTone(booking.status)}`}>{booking.status}</span>
                                <span className={`pill ${statusTone(booking.paymentStatus)}`}>{booking.paymentStatus}</span>
                              </div>
                            </div>
                            <div className="list-card-body">
                              <span>
                                {formatShortDate(booking.startDate)} - {formatShortDate(booking.endDate)}
                              </span>
                              <span>{formatCurrency(booking.quote?.grandTotal)}</span>
                            </div>
                            <div className="action-row">
                              {booking.status === "confirmed" ? (
                                <button className="button ghost" type="button" onClick={() => updateAdminBookingStatus(booking.id, "active")}>
                                  Mark active
                                </button>
                              ) : null}
                              {booking.status === "active" ? (
                                <button className="button ghost" type="button" onClick={() => updateAdminBookingStatus(booking.id, "completed")}>
                                  Mark complete
                                </button>
                              ) : null}
                              {["pending-payment", "confirmed"].includes(booking.status) ? (
                                <button className="button ghost" type="button" onClick={() => updateAdminBookingStatus(booking.id, "cancelled")}>
                                  Cancel
                                </button>
                              ) : null}
                            </div>
                          </motion.article>
                        ))}
                      </div>
                    </div>

                    <div className="glass-surface stack-panel">
                      <div className="panel-head">
                        <div>
                          <p className="section-eyebrow">Support queue</p>
                          <h3>Live ticket board</h3>
                        </div>
                      </div>
                      <div className="stack-list">
                        {admin.tickets.map((ticket) => (
                          <motion.article key={ticket.id} className="list-card" whileHover={{ y: -4 }}>
                            <div className="list-card-head">
                              <div>
                                <h4>{ticket.subject}</h4>
                                <p>{ticket.customer?.name || "Customer"} · {ticket.message}</p>
                              </div>
                              <div className="pill-row">
                                <span className={`pill ${statusTone(ticket.priority)}`}>{ticket.priority}</span>
                                <span className={`pill ${statusTone(ticket.status)}`}>{ticket.status}</span>
                              </div>
                            </div>
                            <div className="action-row">
                              {ticket.status !== "resolved" ? (
                                <button className="button ghost" type="button" onClick={() => updateTicketStatus(ticket.id, "resolved")}>
                                  Resolve
                                </button>
                              ) : null}
                              <button className="button ghost" type="button" onClick={() => updateTicketStatus(ticket.id, "open")}>
                                Reopen
                              </button>
                            </div>
                          </motion.article>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="admin-columns">
                    <div className="glass-surface stack-panel">
                      <div className="panel-head">
                        <div>
                          <p className="section-eyebrow">Fleet status</p>
                          <h3>Vehicle readiness</h3>
                        </div>
                      </div>
                      <div className="stack-list">
                        {admin.vehicles.map((vehicle) => (
                          <motion.article key={vehicle.id} className="list-card" whileHover={{ y: -4 }}>
                            <div className="list-card-head">
                              <div>
                                <h4>{vehicle.name}</h4>
                                <p>
                                  {vehicle.city} · {vehicle.category} · {formatCurrency(vehicle.pricePerDay)}/day
                                </p>
                              </div>
                              <span className={`pill ${statusTone(vehicle.status)}`}>{vehicle.status}</span>
                            </div>
                            <div className="action-row">
                              <button
                                className="button ghost"
                                type="button"
                                onClick={() =>
                                  updateVehicleStatus(
                                    vehicle.id,
                                    vehicle.status === "available" ? "maintenance" : "available"
                                  )
                                }
                              >
                                {vehicle.status === "available" ? "Send to maintenance" : "Mark available"}
                              </button>
                            </div>
                          </motion.article>
                        ))}
                      </div>
                    </div>

                    <div className="glass-surface stack-panel">
                      <div className="panel-head">
                        <div>
                          <p className="section-eyebrow">Add inventory</p>
                          <h3>Publish a new vehicle</h3>
                        </div>
                      </div>
                      <form className="form-grid compact-form" onSubmit={submitAdminVehicle}>
                        <label className="field">
                          <span>Name</span>
                          <input
                            type="text"
                            value={adminVehicleDraft.name}
                            onChange={(event) => setAdminVehicleDraft((current) => ({ ...current, name: event.target.value }))}
                            placeholder="Kia Seltos HTX"
                            required
                          />
                        </label>
                        <label className="field">
                          <span>Category</span>
                          <input
                            type="text"
                            value={adminVehicleDraft.category}
                            onChange={(event) => setAdminVehicleDraft((current) => ({ ...current, category: event.target.value }))}
                            required
                          />
                        </label>
                        <label className="field">
                          <span>City</span>
                          <input
                            type="text"
                            value={adminVehicleDraft.city}
                            onChange={(event) => setAdminVehicleDraft((current) => ({ ...current, city: event.target.value }))}
                            required
                          />
                        </label>
                        <label className="field">
                          <span>Fuel</span>
                          <input
                            type="text"
                            value={adminVehicleDraft.fuel}
                            onChange={(event) => setAdminVehicleDraft((current) => ({ ...current, fuel: event.target.value }))}
                            required
                          />
                        </label>
                        <label className="field">
                          <span>Transmission</span>
                          <input
                            type="text"
                            value={adminVehicleDraft.transmission}
                            onChange={(event) => setAdminVehicleDraft((current) => ({ ...current, transmission: event.target.value }))}
                            required
                          />
                        </label>
                        <label className="field">
                          <span>Seats</span>
                          <input
                            type="number"
                            min="2"
                            value={adminVehicleDraft.seats}
                            onChange={(event) => setAdminVehicleDraft((current) => ({ ...current, seats: event.target.value }))}
                            required
                          />
                        </label>
                        <label className="field">
                          <span>Price / day</span>
                          <input
                            type="number"
                            min="500"
                            value={adminVehicleDraft.pricePerDay}
                            onChange={(event) => setAdminVehicleDraft((current) => ({ ...current, pricePerDay: event.target.value }))}
                            required
                          />
                        </label>
                        <label className="field">
                          <span>Deposit</span>
                          <input
                            type="number"
                            min="1000"
                            value={adminVehicleDraft.securityDeposit}
                            onChange={(event) => setAdminVehicleDraft((current) => ({ ...current, securityDeposit: event.target.value }))}
                            required
                          />
                        </label>
                        <label className="field field-full">
                          <span>Description</span>
                          <textarea
                            rows="4"
                            value={adminVehicleDraft.description}
                            onChange={(event) => setAdminVehicleDraft((current) => ({ ...current, description: event.target.value }))}
                            placeholder="Describe the vehicle and its best use case."
                          />
                        </label>
                        <div className="form-actions field-full">
                          <button className="button primary" type="submit" disabled={busyState.adminVehicle}>
                            {busyState.adminVehicle ? "Publishing..." : "Add vehicle"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-surface stack-panel">
                  <div className="panel-head">
                    <div>
                      <p className="section-eyebrow">Staff console</p>
                      <h3>Protected operational controls</h3>
                    </div>
                  </div>
                  <EmptyState
                    title={staffConfigured ? "Authorized staff sign-in required." : "Staff access is not configured yet."}
                    copy={
                      staffConfigured
                        ? "Use the operations account configured on the server to manage fleet status, payments, and tickets."
                        : "Set ADMIN_EMAIL and ADMIN_PASSWORD on the server, then sign in to unlock booking and fleet operations."
                    }
                    action={
                      <button className="button primary" type="button" onClick={() => openAuth("login")}>
                        Staff sign in
                      </button>
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </motion.section>
      </main>

      <footer className="footer">
        <div>
          <strong>UrbanRide Rentals</strong>
          <p>
            Premium fleet storefront, payment guidance, support workflows, and staff operations from one modern control surface.
          </p>
        </div>
        <div className="footer-meta">
          <span>{user ? `Signed in as ${user.name} (${user.role})` : "Not signed in"}</span>
          <span>{bootstrap?.company?.supportEmail || "support@urbanride-rentals.com"}</span>
        </div>
      </footer>

      <Modal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        eyebrow="Account access"
        title={authMode === "login" ? "Sign in to continue" : "Create your UrbanRide account"}
      >
        <div className="tab-strip">
          <button
            className={`tab-button ${authMode === "login" ? "is-active" : ""}`}
            type="button"
            onClick={() => setAuthMode("login")}
          >
            Login
          </button>
          <button
            className={`tab-button ${authMode === "register" ? "is-active" : ""}`}
            type="button"
            onClick={() => setAuthMode("register")}
          >
            Register
          </button>
        </div>

        <form className="form-grid modal-form" onSubmit={submitAuth}>
          {authMode === "register" ? (
            <>
              <label className="field">
                <span>Name</span>
                <input
                  type="text"
                  value={authDraft.name}
                  onChange={(event) => setAuthDraft((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  type="tel"
                  value={authDraft.phone}
                  onChange={(event) => setAuthDraft((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
            </>
          ) : null}
          <label className="field field-full">
            <span>Email</span>
            <input
              type="email"
              value={authDraft.email}
              onChange={(event) => setAuthDraft((current) => ({ ...current, email: event.target.value }))}
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="field field-full">
            <span>Password</span>
            <input
              type="password"
              value={authDraft.password}
              onChange={(event) => setAuthDraft((current) => ({ ...current, password: event.target.value }))}
              placeholder="••••••••"
              required
            />
          </label>
          <div className="form-actions field-full">
            <button className="button primary" type="submit" disabled={busyState.auth}>
              {busyState.auth ? "Please wait..." : authMode === "login" ? "Sign in" : "Create account"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        eyebrow="Reservation workspace"
        title={selectedVehicle ? `Reserve ${selectedVehicle.name}` : "Create booking"}
        wide
      >
        {selectedVehicle && bookingDraft ? (
          <form className="booking-layout" onSubmit={submitBooking}>
            <div className="form-grid">
              <label className="field">
                <span>Start date</span>
                <input
                  type="date"
                  value={bookingDraft.startDate}
                  onChange={(event) => setBookingDraft((current) => ({ ...current, startDate: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>End date</span>
                <input
                  type="date"
                  value={bookingDraft.endDate}
                  onChange={(event) => setBookingDraft((current) => ({ ...current, endDate: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>Pickup</span>
                <input
                  type="text"
                  value={bookingDraft.pickupLocation}
                  onChange={(event) => setBookingDraft((current) => ({ ...current, pickupLocation: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>Dropoff</span>
                <input
                  type="text"
                  value={bookingDraft.dropoffLocation}
                  onChange={(event) => setBookingDraft((current) => ({ ...current, dropoffLocation: event.target.value }))}
                  required
                />
              </label>
              <label className="field field-full">
                <span>Coupon code</span>
                <input
                  type="text"
                  value={bookingDraft.couponCode}
                  onChange={(event) => setBookingDraft((current) => ({ ...current, couponCode: event.target.value }))}
                  placeholder="SAVE10"
                />
              </label>

              <div className="field field-full">
                <span>Add-ons</span>
                <div className="addon-grid">
                  {allowedAddOns.map((item) => {
                    const checked = bookingDraft.addOnCodes.includes(item.code);
                    return (
                      <label key={item.code} className={`addon-card ${checked ? "is-selected" : ""}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setBookingDraft((current) => ({
                              ...current,
                              addOnCodes: checked
                                ? current.addOnCodes.filter((code) => code !== item.code)
                                : [...current.addOnCodes, item.code],
                            }))
                          }
                        />
                        <span>
                          <strong>{item.label}</strong>
                          <small>
                            {item.description} · {formatCurrency(item.unitPrice)} {item.billing === "perDay" ? "/ day" : "flat"}
                          </small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="quote-surface">
              <div className="panel-head">
                <div>
                  <p className="section-eyebrow">Quote preview</p>
                  <h3>Live rental summary</h3>
                </div>
                <button className="button ghost" type="button" onClick={previewQuote} disabled={busyState.quote}>
                  {busyState.quote ? "Calculating..." : "Preview total"}
                </button>
              </div>

              {quotePreview ? (
                <div className="quote-breakdown">
                  <div className="quote-row">
                    <span>Rental days</span>
                    <strong>{quotePreview.rentalDays}</strong>
                  </div>
                  <div className="quote-row">
                    <span>Base rent</span>
                    <strong>{formatCurrency(quotePreview.baseAmount)}</strong>
                  </div>
                  <div className="quote-row">
                    <span>Add-ons</span>
                    <strong>{formatCurrency(quotePreview.addOnsAmount)}</strong>
                  </div>
                  <div className="quote-row">
                    <span>Service fee</span>
                    <strong>{formatCurrency(quotePreview.serviceFee)}</strong>
                  </div>
                  <div className="quote-row">
                    <span>Discount</span>
                    <strong>{formatCurrency(quotePreview.discount)}</strong>
                  </div>
                  <div className="quote-row">
                    <span>Tax</span>
                    <strong>{formatCurrency(quotePreview.tax)}</strong>
                  </div>
                  <div className="quote-row">
                    <span>Refundable deposit</span>
                    <strong>{formatCurrency(quotePreview.securityDeposit)}</strong>
                  </div>
                  <div className="quote-row total">
                    <span>Grand total</span>
                    <strong>{formatCurrency(quotePreview.grandTotal)}</strong>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Preview the pricing before confirming."
                  copy="Generate a live quote to review base rent, add-ons, tax, and the refundable deposit."
                />
              )}

              <div className="form-actions">
                <button className="button primary" type="submit" disabled={busyState.booking}>
                  {busyState.booking ? "Creating booking..." : "Book now"}
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        eyebrow="Trip review"
        title="Share your rental experience"
      >
        <form className="form-grid modal-form" onSubmit={submitReview}>
          <label className="field">
            <span>Rating</span>
            <select
              value={reviewDraft.rating}
              onChange={(event) => setReviewDraft((current) => ({ ...current, rating: event.target.value }))}
            >
              <option value="5">5 stars</option>
              <option value="4">4 stars</option>
              <option value="3">3 stars</option>
              <option value="2">2 stars</option>
              <option value="1">1 star</option>
            </select>
          </label>
          <label className="field field-full">
            <span>Title</span>
            <input
              type="text"
              value={reviewDraft.title}
              onChange={(event) => setReviewDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="What stood out?"
            />
          </label>
          <label className="field field-full">
            <span>Comment</span>
            <textarea
              rows="4"
              value={reviewDraft.comment}
              onChange={(event) => setReviewDraft((current) => ({ ...current, comment: event.target.value }))}
              placeholder="Describe the pickup, vehicle quality, and overall trip."
            />
          </label>
          <div className="form-actions field-full">
            <button className="button primary" type="submit" disabled={busyState.review}>
              {busyState.review ? "Publishing..." : "Publish review"}
            </button>
          </div>
        </form>
      </Modal>

      <div className="toast-region">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              className="toast"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
