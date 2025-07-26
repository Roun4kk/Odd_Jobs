import { useEffect, useRef } from "react";
import axios from "axios";
import useAuth from "./hooks/useAuth.jsx";
import { useNavigate } from "react-router-dom";
import { useTheme } from "./ThemeContext.jsx" ; // Adjust path if needed
import { Sun, Moon } from 'lucide-react';

function SettingsComp({ setUserLog, user, triggerRef }) {
  const { theme, toggleTheme } = useTheme();
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
      
      // Preserve theme preference
      const theme = localStorage.getItem("theme");
      localStorage.clear();
      if (theme) {
        localStorage.setItem("theme", theme);
      }
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
      
      // Preserve theme preference
      const theme = localStorage.getItem("theme");
      localStorage.clear();
      if (theme) {
        localStorage.setItem("theme", theme);
      }
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
      className="absolute bottom-[100%] mb-2 z-50 left-1/2 -translate-x-1/2 bg-gray-200 dark:bg-gray-800 text-black dark:text-white w-max shadow-lg shadow-white dark:shadow-gray-900 rounded-xl"
    >
      <div className="flex flex-col p-4">
        <button
          onClick={handleLogout}
          className="text-left hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-md text-black dark:text-white cursor-pointer"
        >
          Log out @{user?.username || "user not found"}
        </button>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-6 py-2 rounded-md transition text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {theme === 'light' ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
          <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
      </div>
    </div>
  );
}

export default SettingsComp;