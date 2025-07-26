// File: MainRouter.jsx
import { Routes, Route, useLocation } from "react-router-dom";
import BidOverlayPage from "./BidOverlayPage";
import App from "./App.jsx";
import Landing from "./landing.jsx";
import Profile from "./profile.jsx";
import OtherProfile from './otherProfile.jsx';
import Messages from "./messages.jsx";
import PostPage from "./postPage.jsx";
import Notifications from "./notifications.jsx";
import EditProfile from "./editProfile.jsx";
import Settings from "./settings.jsx";
import JobSearch from "./jobSearch.jsx";
import ScrollToTop from "./components/scrollToTop.jsx"; 

function MainRouter() {
  const location = useLocation();
  const state = location.state;
  const backgroundLocation = state?.backgroundLocation;

  return (
    <>
    <ScrollToTop />
      <Routes location={backgroundLocation || location}>
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

      {backgroundLocation && (
        <Routes>
          <Route path="/bid/:postId" element={<BidOverlayPage />} />
        </Routes>
      )}
    </>
  );
}

export default MainRouter;