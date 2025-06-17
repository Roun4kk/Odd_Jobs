import { useEffect, useRef } from "react";
import axios from "axios";
import useAuth from "./hooks/useAuth.jsx";

function SettingsComp({ setUserLog, user }) { // Add updateUser prop
  const popoverRef = useRef(null);
  const { updateUser } = useAuth();
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setUserLog(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setUserLog]);

  const handleLogout = async () => {
    try {
      // STEP 1: Call backend logout endpoint
      console.log("=== LOGOUT DEBUG INFO ===");
      console.log("Current URL:", window.location.href);
      console.log("Cookies before logout:", document.cookie);
      console.log("Backend URL:", import.meta.env.VITE_API_BASE_URL);
      console.log("Calling backend logout...");
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/logout`, {}, { 
        withCredentials: true 
      });
      
      console.log("Backend logout response:", response.data);

      // STEP 2: Clear frontend storage
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
      window.location.replace("/");
      
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
      
      // Force redirect even if backend call failed
      window.location.replace("/");
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-50 z-50 left-15 bg-gray-200 text-black w-max shadow-lg shadow-white rounded-xl"
    >
      <div className="flex flex-col p-4">
        <button className="text-left hover:bg-gray-100 p-2 rounded-md cursor-pointer">
          Add an existing account
        </button>
        <button
          onClick={handleLogout}
          className="text-left hover:bg-gray-100 p-2 rounded-md text-black cursor-pointer"
        >
          Log out @{user?.email || "user not found"}
        </button>
      </div>
      <div className="absolute -bottom-2 left-1/2 w-4 h-4 bg-gray-200 rotate-45"></div>
    </div>
  );
}

export default SettingsComp;