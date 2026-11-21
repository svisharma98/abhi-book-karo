import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Paper, Stack, Typography
} from "@mui/material";
import { Groups, Logout, Shield, Storefront } from "@mui/icons-material";
import { toast } from "react-toastify";
import "./admin.css";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bka-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function AdminDashboard({ user, logout }) {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryResponse, usersResponse] = await Promise.all([
        api.get("/users/summary"), api.get("/users")
      ]);
      setSummary(summaryResponse.data);
      setUsers(usersResponse.data.users);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load the admin dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cards = summary ? [
    { label: "Total accounts", value: summary.users.total || 0, icon: <Groups /> },
    { label: "Clients", value: summary.users.clients || 0, icon: <Storefront /> },
    { label: "Owners", value: summary.users.owners || 0, icon: <Shield /> },
    { label: "Booking requests", value: summary.bookings.total || 0, icon: <Groups /> }
  ] : [];

  return <Box className="admin-panel">
    <header className="admin-header">
      <Box><Typography className="admin-brand-kicker">BOOK KARE ABHI</Typography><Typography variant="h6">Administration</Typography></Box>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box className="admin-header-user"><Typography>{user.name}</Typography><Typography variant="caption">System administrator</Typography></Box>
        <Button onClick={() => { logout(); toast.info("You’re signed out."); }} startIcon={<Logout />}>Sign out</Button>
      </Stack>
    </header>
    <main className="admin-content">
      <Box className="admin-page-title">
        <Box><Typography className="admin-brand-kicker">ADMIN CONSOLE</Typography><Typography variant="h4">Platform dashboard</Typography><Typography color="text.secondary">Account overview and all registered users.</Typography></Box>
        <Chip label="ADMIN" icon={<Shield />} />
      </Box>
      {error ? <Alert severity="error" action={<Button onClick={load}>Retry</Button>}>{error}</Alert> : <>
        <div className="admin-metrics">
          {cards.map((card) => <Paper key={card.label} elevation={0}><span>{card.icon}</span><Typography>{card.label}</Typography><strong>{loading ? "—" : card.value}</strong></Paper>)}
        </div>
        <Paper className="admin-user-panel" elevation={0}>
          <Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="h6">All users</Typography><Typography color="text.secondary">Client, owner, and admin accounts</Typography></Box><Chip label={loading ? "Loading" : `${users.length} accounts`} /></Stack>
          {loading ? <Box className="admin-loading"><CircularProgress size={26} /></Box> : <div className="admin-table-scroll">
            <table><thead><tr><th>User</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th></tr></thead><tbody>
              {users.map((account) => <tr key={account.id}>
                <td><Stack direction="row" alignItems="center" spacing={1.2}><Avatar>{account.name?.[0]}</Avatar><strong>{account.name}</strong></Stack></td>
                <td>{account.email}</td><td>{account.phone || "—"}</td>
                <td><Chip size="small" label={account.role} className={`admin-role role-${account.role}`} /></td>
                <td>{new Date(account.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
              </tr>)}
              {!users.length && <tr><td colSpan="5">No users are registered yet.</td></tr>}
            </tbody></table>
          </div>}
        </Paper>
      </>}
    </main>
  </Box>;
}
