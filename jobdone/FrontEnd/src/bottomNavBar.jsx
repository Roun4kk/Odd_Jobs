import { useState, useEffect } from "react";
import {
  Home,
  Search,
  MessageCircle,
  User,
  Settings,
  Bell
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMessageContext } from "./hooks/useMessageContext";
import useAuth from "./hooks/useAuth";
import axios from "axios";
import socket from "./socket.js";
import useSocketRoomJoin from "./hooks/socketRoomJoin.js";
import { useTheme } from "./ThemeContext"; 

// 1. Accept 'isEmbedded' prop
function BottomNavbar({ isEmbedded }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unseenConversations } = useMessageContext();
  const { user } = useAuth();
  const [unseenNotifications, setUnseenNotifications] = useState(0);
  const { theme } = useTheme(); 

  // --- Logic copied from Sidebar.jsx ---
  const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };
  useSocketRoomJoin(user?._id);
  useEffect(() => {
    if (!user?._id || !isValidObjectId(user._id)) {
      return;
    }
    const fetchUnseenNotifications = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/notifications/unseen-count`, {
          withCredentials: true,
        });
        setUnseenNotifications(res.data.unseenCount);
      } catch (err) {
        console.error("Failed to fetch unseen notifications in BottomNavbar:", err.response?.data || err.message);
      }
    };
    fetchUnseenNotifications();
  }, [user]);
  useEffect(() => {
    socket.on("receiveNotification", (notification) => {
      if (!notification.seen) {
        setUnseenNotifications((prev) => prev + 1);
      }
    });
    socket.on("notificationsMarkedSeen", () => {
      setUnseenNotifications(0);
    });
    return () => {
      socket.off("receiveNotification");
      socket.off("notificationsMarkedSeen");
    };
  }, []);
  // --- End of logic from Sidebar.jsx ---

  const isActive = (path) => location.pathname === path;

  const navbarStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
      : '#2dd4bf' // This is the hex code for teal-400
  };

  // 2. Conditionally set classes based on 'isEmbedded' prop
  const containerClasses = isEmbedded
    ? "lg:hidden w-full border-t border-transparent dark:border-gray-700 flex-shrink-0"
    : "lg:hidden fixed bottom-0 left-0 right-0 border-t border-transparent dark:border-gray-700";

  return (
    <div 
      className={containerClasses} // 3. Use the conditional classes
      style={navbarStyle}
    >
      <div className="flex items-center justify-around py-2">
        {/* Home Button */}
        <button
          onClick={() => navigate("/landing")}
          className={`flex flex-col items-center py-2 px-3 rounded-md transition ${
            isActive("/landing") 
              ? "bg-gray-200 dark:bg-gray-700 text-black dark:text-white" 
              : "text-white dark:text-teal-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 hover:text-black dark:hover:text-white"
          }`}
        >
          <Home size={24} />
        </button>

        {/* Search Button */}
        <button
          onClick={() => navigate("/jobSearch")}
          className={`flex flex-col items-center py-2 px-3 rounded-md transition ${
            isActive("/jobSearch") 
              ? "bg-gray-200 dark:bg-gray-700 text-black dark:text-white" 
              : "text-white dark:text-teal-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 hover:text-black dark:hover:text-white"
          }`}
        >
          <Search size={24} />
        </button>

        {/* Messages Button */}
        <button
          onClick={() => navigate("/messages")}
          className={`relative flex flex-col items-center py-2 px-3 rounded-md transition ${
            isActive("/messages") 
              ? "bg-gray-200 dark:bg-gray-700 text-black dark:text-white" 
              : "text-white dark:text-teal-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 hover:text-black dark:hover:text-white"
          }`}
        >
          <MessageCircle size={24} />
          {unseenConversations > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
              {unseenConversations}
            </span>
          )}
        </button>

        {/* Notifications Button */}
        <button
          onClick={() => navigate("/notifications")}
          className={`relative flex flex-col items-center py-2 px-3 rounded-md transition ${
            isActive("/notifications")
              ? "bg-gray-200 dark:bg-gray-700 text-black dark:text-white" 
              : "text-white dark:text-teal-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 hover:text-black dark:hover:text-white"
          }`}
        >
          <Bell size={24} />
          {unseenNotifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
              {unseenNotifications}
            </span>
          )}
        </button>

        {/* Profile Button */}
        <button
          onClick={() => navigate("/profile")}
          className={`flex flex-col items-center py-2 px-3 rounded-md transition ${
            isActive("/profile") 
              ? "bg-gray-200 dark:bg-gray-700 text-black dark:text-white" 
              : "text-white dark:text-teal-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 hover:text-black dark:hover:text-white"
          }`}
        >
          <User size={24} />
        </button>

        {/* Settings Button */}
        <button
          onClick={() => navigate("/settings")}
          className={`flex flex-col items-center py-2 px-3 rounded-md transition ${
            isActive("/settings") 
              ? "bg-gray-200 dark:bg-gray-700 text-black dark:text-white" 
              : "text-white dark:text-teal-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 hover:text-black dark:hover:text-white"
          }`}
        >
          <Settings size={24} />
        </button>
      </div>
    </div>
  );
}

export default BottomNavbar;