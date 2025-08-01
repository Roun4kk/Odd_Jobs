import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const updateUser = (newUser) => {
    setUser(newUser);
  };

  const fetchUser = async () => {
    if (window.location.pathname === "/" || window.location.pathname === "/App") {
      console.log("⛔ Skipping /api/me on login page");
      setLoading(false);
      return;
    }

    try {
      console.log("🔄 Fetching user from /api/me...");
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/me`, {
        withCredentials: true,
      });
      console.log("✅ User fetched:", res.data);
      setUser(res.data);
    } catch (err) {
      console.error("❌ Error fetching user:", err.response?.data || err.message);
      setUser(null);
    }finally{
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        updateUser,
        refreshUser: fetchUser, // ✅ exposing fetchUser as refreshUser
        username: user?.username,
        email: user?.email,
        userId: user?._id,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default function useAuth() {
  return useContext(AuthContext);
}