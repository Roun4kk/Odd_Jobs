import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast"; // ✅ import toast
import "./index.css";
import App from "./App.jsx";
import Landing from "./landing.jsx";
import Profile from "./profile.jsx";
import OtherProfile from './otherProfile.jsx';
import Messages from "./messages.jsx";
import PostPage from "./postPage.jsx";
import Notifications from "./notifications.jsx";
import EditProfile from "./editProfile.jsx";
import { AuthProvider } from "./hooks/useAuth.jsx";
import Settings from "./settings.jsx";
import { MessageProvider } from "./messageContext.jsx";
import JobSearch from "./jobSearch.jsx";
import BidOverlayPage from "./BidOverlayPage.jsx";

createRoot(document.getElementById("root")).render(
    <AuthProvider>
      <MessageProvider>
        <Router>
          <Routes>
            <Route path="/jobSearch" element={<JobSearch />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/" element={<App />} />
            <Route path="/post/:postId" element={<PostPage />} />
            <Route path="/profile/:userId" element={<OtherProfile />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/editProfile" element={<EditProfile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/bid/:postId" element={<BidOverlayPage />} />
          </Routes>
        </Router>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0f766e', // teal-700
              color: '#e0fdfa',      // cyan-100
              fontSize: '0.9rem',
              borderRadius: '0.5rem',
            },
            success: {
              iconTheme: {
                primary: '#2dd4bf',   // teal-400
                secondary: '#0f766e', // teal-700
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
      </MessageProvider>
    </AuthProvider>
);
