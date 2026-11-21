import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Website/website.css";
import App from "./Website/App.jsx";

const theme = createTheme({
  palette: { primary: { main: "#101b35" }, secondary: { main: "#d5a64a" }, background: { default: "#f5f6fa" } },
  typography: { fontFamily: "'DM Sans', sans-serif", button: { textTransform: "none", fontWeight: 600 } },
  shape: { borderRadius: 14 },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 10, padding: "10px 18px", boxShadow: "none" } } },
    MuiTextField: { defaultProps: { fullWidth: true, size: "small" } },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 16 } } }
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
        <ToastContainer position="bottom-right" autoClose={3500} />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
