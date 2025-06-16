import { useEffect } from "react";
import useAuth from "./hooks/useAuth.jsx";
import Sidebar from "./Sidebar";
import logo from "./assets/logo/logo-transparent.png";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SearchSkills from "./components/searchSkills.jsx";


function Notifications() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Function to truncate job description
  const truncateDescription = (description, maxLength = 60) => {
    if (!description) return "";
    return description.length > maxLength
      ? description.substring(0, maxLength) + "..."
      : description;
  };

  // Mark notifications as seen
  const markNotificationsAsSeen = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/notifications/mark-seen`, {}, {
        withCredentials: true,
      });
      await refreshUser(); // Refresh user to update notifications
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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar (30%) */}
      <Sidebar user={user} />
      {/* Main Content (70%) */}
      <div className="w-[70%] h-full fixed right-0 top-0 overflow-y-scroll">
        <div className="flex min-h-screen">
          {/* Center */}
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

          {/* Right */}
          <div className="w-[43%] bg-white sticky top-0 h-screen border-l border-gray-200">
            <SearchSkills />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Notifications;