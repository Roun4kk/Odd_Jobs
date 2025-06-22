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

function BottomNavbar({ onPostClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unseenConversations } = useMessageContext();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-teal-500">
      <div className="flex items-center justify-around py-2">
        <button
          onClick={() => navigate("/landing")}
          className={`flex flex-col items-center py-2 px-3 rounded transition ${
            isActive("/landing") ? "bg-gray-200 text-black" : "text-white hover:bg-teal-600"
          }`}
        >
          <Home size={24} />
        </button>

        <button
          onClick={() => navigate("/jobSearch")}
          className={`flex flex-col items-center py-2 px-3 rounded transition ${
            isActive("/jobSearch") ? "bg-gray-200 text-black" : "text-white hover:bg-teal-600"
          }`}
        >
          <Search size={24} />
        </button>

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

        <button
          onClick={() => navigate("/Notifications")}
          className={`flex flex-col items-center py-2 px-3 rounded transition ${
            isActive("/Notifications") ? "bg-gray-200 text-black" : "text-white hover:bg-teal-600"
          }`}
        >
          <Bell size={24} />
        </button>

        <button
          onClick={() => navigate("/profile")}
          className={`flex flex-col items-center py-2 px-3 rounded transition ${
            isActive("/profile") ? "bg-gray-200 text-black" : "text-white hover:bg-teal-600"
          }`}
        >
          <User size={24} />
        </button>

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