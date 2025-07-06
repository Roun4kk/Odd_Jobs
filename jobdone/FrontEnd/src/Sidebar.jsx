import { Home, Search, MessageCircle, User, Settings, Bell , Briefcase } from "lucide-react";
import { useState, useEffect , useRef } from "react";
import { useNavigate } from "react-router-dom";
import SettingsComp from "./accounts";
import logo from "./assets/logo/logo-jobddone.svg";
import axios from "axios";
import socket from "./socket.js"; 
import { useMessageContext } from "./hooks/useMessageContext.js";
import useSocketRoomJoin from "./hooks/socketRoomJoin.js";
import { useLocation } from "react-router-dom";


function Sidebar({ user }) {
  const navigate = useNavigate();
  const [userLog, setUserLog] = useState(false);
  const [unseenNotifications, setUnseenNotifications] = useState(0);
  const { unseenConversations, unseenMessages } = useMessageContext();
  const location = useLocation();
  const profileBtnRef = useRef(null);
  const isActive = (path) => location.pathname === path;

  const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };
  useSocketRoomJoin(user?._id)
  // Fetch unseen notifications count
  useEffect(() => {
    if (!user?._id || !isValidObjectId(user._id)) {
      return;
    }
    const fetchUnseenNotifications = async () => {
      try {
        const notificationsRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/notifications/unseen-count`, {
          withCredentials: true,
        });
        setUnseenNotifications(notificationsRes.data.unseenCount);
        console.log("Fetched unseen notifications:", notificationsRes.data.unseenCount);
      } catch (err) {
        console.error("Failed to fetch unseen notifications in Sidebar:", err.response?.data || err.message);
      }
    };
    fetchUnseenNotifications();
  }, [user]);

  // Handle notifications socket events
  useEffect(() => {
    socket.on("receiveNotification", (notification) => {
      if (!notification.seen) {
        setUnseenNotifications((prev) => {
          const newCount = prev + 1;
          console.log("New notification received, count:", newCount);
          return newCount;
        });
      }
    });

    socket.on("notificationsMarkedSeen", () => {
      setUnseenNotifications(0);
      console.log("Notifications marked as seen, count reset to 0");
    });

    return () => {
      socket.off("receiveNotification");
      socket.off("notificationsMarkedSeen");
    };
  }, []);

  return (
    <div className="w-[30%] flex flex-col items-start justify-center gap-6 bg-teal-400 border-r border-gray-300 h-full fixed left-0 top-0">
      <div className="ml-6 mt-6 mb-2 w-full max-w-60 h-20 overflow-hidden">
        <img
          src={logo}
          alt="JobDone Logo"
          className="w-full h-full object-cover object-center"
        />
      </div>

      <button
        onClick={() => navigate("/landing")}
        className={`ml-8 flex items-center gap-2 px-6 py-2 rounded-md transition cursor-pointer ${
          isActive("/landing") ? "bg-gray-200 text-black" : "text-white hover:bg-gray-200 hover:text-black"
        }`}
      >
        <Home className="h-6 w-6" /> Home
      </button>
      <button onClick={() => navigate("/jobSearch")}
        className={`ml-8 flex items-center gap-2 px-6 py-2 rounded-md transition cursor-pointer ${
          isActive("/jobSearch") ? "bg-gray-200 text-black" : "text-white hover:bg-gray-200 hover:text-black"
        }`}
      >
        <Search className="h-6 w-6" /> Job Search
      </button>
      <button
        onClick={() => navigate("/messages")}
        className={`ml-8 flex items-center gap-2 px-6 py-2 rounded-md transition cursor-pointer relative ${
          isActive("/messages") ? "bg-gray-200 text-black" : "text-white hover:bg-gray-200 hover:text-black"
        }`}
      >
        <MessageCircle className="h-6 w-6" /> Messages
        {unseenConversations > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unseenConversations}
          </span>
        )}
      </button>
      <button
        onClick={() => navigate("/notifications")}
        className={`ml-8 flex items-center gap-2 px-6 py-2 rounded-md transition cursor-pointer ${
          isActive("/notifications") ? "bg-gray-200 text-black" : "text-white hover:bg-gray-200 hover:text-black"
        }`}
      >
        <Bell className="h-6 w-6" /> Notifications
        {unseenNotifications > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unseenNotifications}
          </span>
        )}
      </button>
      <button
        onClick={() => navigate("/profile")}
        className={`ml-8 flex items-center gap-2 px-6 py-2 rounded-md transition cursor-pointer ${
          isActive("/profile") ? "bg-gray-200 text-black" : "text-white hover:bg-gray-200 hover:text-black"
        }`}
      >
        <User className="h-6 w-6" /> Profile
      </button>
      <button
        onClick={() => navigate("/settings")}
        className={`ml-8 flex items-center gap-2 px-6 py-2 rounded-md transition cursor-pointer ${
          isActive("/settings") ? "bg-gray-200 text-black" : "text-white hover:bg-gray-200 hover:text-black"
        }`}
      >
        <Settings className="h-6 w-6" /> Settings
      </button>
      <div className="ml-8 relative">
        <button
          ref={profileBtnRef}
          onClick={() => setUserLog(prev => !prev)}
          className="flex items-start px-6 py-2 justify-center rounded-md hover:bg-gray-200 transition cursor-pointer group"
        >
          <img
            src={
              user?.userImage ||
              "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"
            }
            alt="User"
            className="w-12 h-12 rounded-full border-2 border-white object-cover"
          />
          <div className="ml-2 flex flex-col items-start justify-center">
            <p className="text-white group-hover:text-black">
              {user?.username || "User not found"}
            </p>
            <p className="text-white group-hover:text-black">
              {user?.email || "User not found"}
            </p>
          </div>
        </button>
        {userLog && <SettingsComp setUserLog={setUserLog} user={user} triggerRef={profileBtnRef}/>}
      </div>
    </div>
  );
}

export default Sidebar;