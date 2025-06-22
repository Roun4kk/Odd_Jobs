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

function BottomNavbar({ onPostClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unseenConversations } = useMessageContext();
  const { user } = useAuth();
  const [unseenNotifications, setUnseenNotifications] = useState(0);

  // --- Logic copied from Sidebar.jsx ---

  const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  // Join socket room
  useSocketRoomJoin(user?._id);

  // Fetch initial unseen notifications count
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

  // Handle real-time notifications via socket events
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

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-teal-500">
      <div className="flex items-center justify-around py-2">
        {/* Home Button */}
        <button
          onClick={() => navigate("/landing")}
          className={`flex flex-col items-center py-2 px-3 rounded transition ${
            isActive("/landing") ? "bg-gray-200 text-black" : "text-white hover:bg-teal-600"
          }`}
        >
          <Home size={24} />
        </button>

        {/* Search Button */}
        <button
          onClick={() => navigate("/jobSearch")}
          className={`flex flex-col items-center py-2 px-3 rounded transition ${
            isActive("/jobSearch") ? "bg-gray-200 text-black" : "text-white hover:bg-teal-600"
          }`}
        >
          <Search size={24} />
        </button>

        {/* Messages Button */}
        <button
          onClick={() => navigate("/messages")}
          className={`flex flex-col items-center py-2 px-3 rounded relative transition ${
            isActive("/messages") ? "bg-gray-200 text-black" : "text-white hover:bg-teal-600"
          }`}
        >
          <MessageCircle size={24} />
          {unseenConversations > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
              {unseenConversations}
            </span>
          )}
        </button>

        {/* Notifications Button - Updated with badge */}
        <button
          onClick={() => navigate("/Notifications")}
          className={`flex flex-col items-center py-2 px-3 rounded relative transition ${ // Added 'relative'
            isActive("/Notifications") ? "bg-gray-200 text-black" : "text-white hover:bg-teal-600"
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
          className={`flex flex-col items-center py-2 px-3 rounded transition ${
            isActive("/profile") ? "bg-gray-200 text-black" : "text-white hover:bg-teal-600"
          }`}
        >
          <User size={24} />
        </button>

        {/* Settings Button */}
        <button
          onClick={() => navigate("/settings")}
          className={`flex flex-col items-center py-2 px-3 rounded transition ${
            isActive("/settings") ? "bg-gray-200 text-black" : "text-white hover:bg-teal-600"
          }`}
        >
          <Settings size={24} />
        </button>
      </div>
    </div>
  );
}

export default BottomNavbar;