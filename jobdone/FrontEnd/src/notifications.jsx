import { useEffect } from "react";
import useAuth from "./hooks/useAuth.jsx";
import Sidebar from "./Sidebar";
import logo from "./assets/logo/logo-transparent.png";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SearchSkills from "./components/searchSkills.jsx";
import useIsMobile from "./hooks/useIsMobile.js";
import BottomNavBar from "./bottomNavBar.jsx";

function Notifications() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const truncateDescription = (description, maxLength = 60) => {
    if (!description) return "";
    return description.length > maxLength
      ? description.substring(0, maxLength) + "..."
      : description;
  };

  const markNotificationsAsSeen = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/notifications/mark-seen`, {}, {
        withCredentials: true,
      });
      await refreshUser();
    } catch (err) {
      console.error("Failed to mark notifications as seen:", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    if (user?._id) {
      refreshUser();
      markNotificationsAsSeen();
    }
  }, [user?._id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <img src={logo} alt="Loading..." className="w-40 h-40 animate-pulse" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-white px-4 pt-4 pb-20">
        <h2 className="text-xl font-semibold mb-4 text-center">Notifications</h2>
        {user?.notifications?.length === 0 ? (
          <p className="text-gray-500 text-center">No notifications yet.</p>
        ) : (
          <div className="space-y-3">
            {user.notifications.map((notif, index) => (
              <button
                key={index}
                onClick={() => navigate(`/post/${notif.postId}`)}
                className="w-full p-4 rounded-xl shadow-sm text-left bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
              >
                <p className="text-sm">
                  <span className="font-medium text-teal-600">{notif.type.toUpperCase()}</span> - {notif.message}
                  {notif.postDescription && (
                    <span className="font-medium text-gray-700"> "{truncateDescription(notif.postDescription)}"</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notif.createdAt).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        )}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-md">
          <BottomNavBar />
        </div>
      </div>
    );
  }

  // Desktop UI (unchanged)
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <div className="w-[70%] h-full fixed right-0 top-0 overflow-y-scroll">
        <div className="flex min-h-screen">
          <div className="w-[57%] flex flex-col items-center gap-6 pt-10 border-r border-gray-300">
            <h2 className="text-2xl font-semibold mb-4">Notifications</h2>
            {user?.notifications?.length === 0 ? (
              <p className="text-gray-500">No notifications yet.</p>
            ) : (
              user.notifications.map((notif, index) => (
                <button
                  key={index}
                  onClick={() => navigate(`/post/${notif.postId}`)}
                  className="w-11/12 p-4 rounded-xl shadow-sm text-left bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
                >
                  <p className="text-sm">
                    <span className="font-medium text-teal-600">
                      {notif.type.toUpperCase()}
                    </span>{" "}
                    - {notif.message}
                    {notif.postDescription && (
                      <span className="font-medium text-gray-700">
                        "{truncateDescription(notif.postDescription)}"
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
          <div className="w-[43%] bg-white sticky top-0 h-screen border-l border-gray-200">
            <SearchSkills />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Notifications;