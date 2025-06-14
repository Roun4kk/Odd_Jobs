import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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


createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <MessageProvider>
      <Router>
        <Routes>
          <Route path="/jobSearch" element={<JobSearch/>}/>
          <Route path="/messages" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/" element={<App />} />
          <Route path="/post/:postId" element={<PostPage />} />
          <Route path="/profile/:userId" element={<OtherProfile />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/editProfile" element={<EditProfile />} />
          <Route path="/settings" element={<Settings />}/>
        </Routes>
      </Router>
      </MessageProvider>
    </AuthProvider>
  </StrictMode>
);
