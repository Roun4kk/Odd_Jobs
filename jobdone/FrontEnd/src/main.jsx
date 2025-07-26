import { createRoot } from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./index.css";
import { AuthProvider } from "./hooks/useAuth.jsx";
import { MessageProvider } from "./messageContext.jsx";
import MainRouter from "./MainRouter.jsx";
import { ThemeProvider } from './ThemeContext.jsx';
import { SortByProvider } from "./SortByContext";


createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <AuthProvider>
      <MessageProvider>
        <SortByProvider>
          <Router>
            <MainRouter />
          </Router>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0f766e',
              color: '#e0fdfa',
              fontSize: '0.9rem',
              borderRadius: '0.5rem',
            },
            success: {
              iconTheme: {
                primary: '#2dd4bf',
                secondary: '#0f766e',
              },
            },
            error: {
              iconTheme: {
                primary: '#f87171',
                secondary: '#7f1d1d',
              },
              style: {
                background: '#7f1d1d',
                color: '#ffe4e6',
              },
            },
          }}
        />
        </SortByProvider>
      </MessageProvider>
    </AuthProvider>
  </ThemeProvider>
);