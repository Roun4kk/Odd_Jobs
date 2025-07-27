import { useEffect, useState } from "react";
import useAuth from "./hooks/useAuth.jsx";
import Sidebar from "./Sidebar";
import logo from "./assets/logo/logo-transparent.png";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SearchSkills from "./components/searchSkills.jsx";
import useIsMobile from "./hooks/useIsMobile.js";
import BottomNavBar from "./bottomNavBar.jsx";
import { useTheme } from "./ThemeContext"; // Import useTheme

function Notifications() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { theme } = useTheme(); // Get current theme
  const [hasToken, setHasToken] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const truncateDescription = (description, maxLength = 60) => {
    if (!description) return "";
    return description.length > maxLength
      ? description.substring(0, maxLength) + "..."
      : description;
  };
  const headingStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
      : '#f0fdfa' // This is the hex code for teal-400
  };
  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/notifications`, {
        withCredentials: true,
      });
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err.response?.data || err.message);
    }
  };

  const markNotificationsAsSeen = async () => {
    try {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/notifications/mark-seen`,
        {},
        { withCredentials: true }
      );
      await refreshUser();
    } catch (err) {
      console.error("Failed to mark notifications as seen:", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    if (user?._id) {
      refreshUser();
      markNotificationsAsSeen();
      fetchNotifications();
    }
  }, [user?._id]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/");
      } else {
        setHasToken(true);
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <img src={logo} alt="Loading..." className="w-40 h-40 animate-pulse" />
      </div>
    );
  }

  // -- ✅ UPDATED Mobile layout rendering --
  if (isMobile) {
    return (
      <>
        <div className="w-full fixed top-0 left-0 z-40 h-16 border-b border-gray-200 dark:border-gray-700 py-4 shadow-sm" style={headingStyle}>
          <h2 className="text-2xl font-semibold text-center text-teal-800 dark:text-teal-400">Notifications</h2>
        </div>

        <div className="min-h-screen bg-white dark:bg-gray-900 px-4 pt-20 pb-20">
          {notifications.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center mt-8">No notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif, index) => (
                <button
                  key={index}
                  onClick={() => navigate(`/post/${notif.postId}`)}
                  className="w-full p-3 rounded-xl shadow-sm text-left bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
                >
                  <div className="flex gap-3 items-start">
                    {/* Sender Image */}
                    <img
                      src={notif.sender?.userImage || "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"}
                      alt="sender"
                      className="w-10 h-10 rounded-full object-cover mt-1 flex-shrink-0"
                    />

                    {/* Text Content - now mirroring the desktop structure */}
                    <div className="flex-1 min-w-0"> {/* min-w-0 is crucial for text wrapping in flexbox */}
                      <p className="text-sm dark:text-gray-200">
                        <span
                          className="font-medium text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation(); 
                            navigate(`/profile/${notif.sender?._id}`);
                          }}
                        >
                          {notif.sender?.username}
                        </span>{" "}
                        
                        {notif.type === "bid" && `placed a bid of ₹${notif.bidAmount}`}
                        {notif.type === "comment" && `commented: "${notif.commentText || notif.bidText || ""}"`}
                        {notif.type === "Reply" && `replied: "${notif.commentText || notif.bidText || ""}"`}
                        {notif.type === "Hired" && `has hired you with a pay of ₹${notif.bidAmount}`}

                        {notif.postDescription && (
                          <span className="font-normal text-gray-700 dark:text-gray-300">
                            {notif.type === "Hired" ? " for the job:" : " on the job post:"} "{truncateDescription(notif.postDescription)}"
                          </span>
                        )}
                      </p>

                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {hasToken && (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-md border-t border-gray-200 dark:border-gray-700">
                <BottomNavBar />
            </div>
        )}
      </>
    );
  }

  // -- Desktop layout remains the same --
  return (
    <div className="flex h-screen overflow-hidden dark:bg-gray-900">
      <Sidebar user={user} />
      <div className="w-[70%] h-full fixed right-0 top-0 overflow-y-scroll">
        <div className="flex min-h-screen">
          <div className="w-[57%] flex flex-col items-center gap-6 pt-7 pb-2 border-r border-gray-300 dark:border-gray-700 transform-gpu">
            <h2 className="text-2xl font-semibold dark:text-teal-400">Notifications</h2>
            {notifications.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No notifications yet.</p>
            ) : (
              notifications.map((notif, index) => (
                <button
                  key={index}
                  onClick={() => navigate(`/post/${notif.postId}`)}
                  className="w-11/12 p-4 rounded-xl shadow-sm text-left bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
                >
                  <div className="flex gap-3 items-start">
                    {/* Sender Image */}
                    <img
                      src={notif.sender?.userImage || "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"}
                      alt="sender"
                      className="w-10 h-10 rounded-full object-cover mt-1"
                    />

                    {/* Text Content */}
                    <div className="flex-1">
                      <p className="text-sm dark:text-gray-200">
                        <span
                          className="font-medium text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation(); 
                            navigate(`/profile/${notif.sender?._id}`);
                          }}
                        >
                          {notif.sender?.username}
                        </span>{" "}
                        {notif.type === "bid" && (
                          <>
                            placed a bid of ₹{notif.bidAmount}
                          </>
                        )}

                        {notif.type === "comment" && (
                          <>
                            commented:{" "}
                            <span >
                              "{notif.commentText || notif.bidText || ""}"
                            </span>
                          </>
                        )}

                        {notif.type === "Reply" && (
                          <>
                            replied:{" "}
                            <span>
                              "{notif.commentText || notif.bidText || ""}"
                            </span>
                          </>
                        )}

                        {notif.type === "Hired" && (
                          <>
                            has hired you with a pay of ₹{notif.bidAmount}
                          </>
                        )}

                        {notif.postDescription && (
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {notif.type === "Hired" ? " for the job :" : " on the job post:"} "{truncateDescription(notif.postDescription)}"
                          </span>
                        )}
                      </p>

                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="w-[43%] bg-white dark:bg-gray-800 sticky top-0 h-screen border-l border-gray-200 dark:border-gray-700">
            <SearchSkills />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Notifications;