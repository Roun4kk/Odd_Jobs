import { useState } from "react";
import axios from "axios";
import useAuth from "../hooks/useAuth";

const NotificationToggle = ({ label, type, checked }) => {
  const { user, updateUser } = useAuth();
  const [isChecked, setIsChecked] = useState(!!checked);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const response = await axios.put(
        "/users/notifications",
        { type, enabled: !isChecked },
        { withCredentials: true }
      );
      updateUser({
        ...user,
        allowNotifications: {
          ...user.allowNotifications,
          [type]: !isChecked,
        },
      });
      setIsChecked(!isChecked);
    } catch (err) {
      console.error(`Failed to update ${type} notifications`, err);
      alert("Failed to update notification settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-between items-center">
      <span>{label}</span>
      <input
        type="checkbox"
        className="w-5 h-5 cursor-pointer accent-teal-500 "
        checked={isChecked}
        disabled={loading}
        onChange={handleToggle}
      />
    </div>
  );
};

export default NotificationToggle;