import { useEffect, useRef } from "react";
import axios from "axios";
import useAuth from "./hooks/useAuth.jsx";
import { useNavigate } from "react-router-dom";

function SettingsComp({ setUserLog, user, triggerRef }) {
  const popoverRef = useRef(null);
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setUserLog(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setUserLog, triggerRef]);

  const handleLogout = async () => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/logout`, {}, { 
        withCredentials: true 
      });
      
      localStorage.clear();
      sessionStorage.clear();

      // STEP 3: Clear auth context/state
      if (updateUser) {
        updateUser(null);
      }

      // STEP 4: Clear any frontend cookies as backup
      const cookies = document.cookie.split(";");
      cookies.forEach((cookie) => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        if (name) {
          // Clear with different combinations
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.localhost`;
        }
      });

      console.log("Redirecting to login...");
      
      // STEP 5: Force redirect (use replace to prevent back navigation)
      navigate("/");
      
    } catch (error) {
      console.error("Logout error:", error);
      
      // Fallback: Clear everything and redirect anyway
      localStorage.clear();
      sessionStorage.clear();
      
      if (updateUser) {
        updateUser(null);
      }
      
      // Try to clear cookies anyway
      document.cookie.split(";").forEach((cookie) => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
        }
      });
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-[100%] mb-2 z-50 left-1/2 -translate-x-1/2 bg-gray-200 text-black w-max shadow-lg shadow-white rounded-xl"
    >
      <div className="flex flex-col p-4">
        <button
          onClick={handleLogout}
          className="text-left hover:bg-gray-100 p-2 rounded-md text-black cursor-pointer"
        >
          Log out @{user?.username || "user not found"}
        </button>
      </div>
    </div>
  );
}

export default SettingsComp;