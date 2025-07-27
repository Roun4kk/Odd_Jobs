import axios from "axios";
import { useEffect, useRef, useState } from "react";
import useAuth from "./hooks/useAuth.jsx";
import { X } from "lucide-react";

function ProfileComp({ setComp, userId, triggerRef }) {
  const popoverRef = useRef(null);
  const [reportComp, setReportComp] = useState(false);
  const [reportText, setReportText] = useState("");
  const { user, updateUser } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event) => {
      // If the report modal is open, do nothing.
      if (reportComp) return;

      // Close only if the click is outside BOTH the popover AND the trigger button.
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setComp(false);
      }
    };

    const handleScroll = () => {
      if (popoverRef.current) {
        setComp(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [setComp, triggerRef, reportComp]);

  const handleBlock = async (userId) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/block/${userId}`,
        null,
        {
          withCredentials: true,
        }
      );
      updateUser((prevUser) => ({
        ...prevUser,
        blockedUsers: [...(prevUser.blockedUsers || []), userId],
      }));
    } catch (err) {
      console.error("Failed to block user:", err);
    }
    setComp(false);
  };

  const handleUnblock = async (userId) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/unblock/${userId}`,
        null,
        {
          withCredentials: true,
        }
      );
      updateUser((prevUser) => ({
        ...prevUser,
        blockedUsers: prevUser.blockedUsers.filter((id) => id !== userId),
      }));
    } catch (err) {
      console.error("Failed to unblock user:", err);
    }
    setComp(false);
  };

  const handleSendReport = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/report/${userId}`,
        {
          text: reportText,
        },
        {
          withCredentials: true,
        }
      );
      setReportText("");
      setReportComp(false);
      setComp(false);
    } catch (err) {
      console.error("Failed to send report:", err);
    }
  };

  return (
    <>
      <div
        ref={popoverRef}
        className="absolute top-full right-0 mt-2 z-50 bg-gray-200 dark:bg-gray-800 text-black dark:text-white w-max max-w-xs shadow-lg shadow-white dark:shadow-black/20 rounded-xl"
      >
        <div className="absolute -top-2 right-3 w-4 h-4 bg-gray-200 dark:bg-gray-800 rotate-45"></div>
        <div className="flex flex-col p-2">
          <button
            onClick={() => setReportComp(true)}
            className="text-left hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-md cursor-pointer whitespace-nowrap"
          >
            Report User
          </button>
          <button
            onClick={() => {
              user?.blockedUsers?.includes(userId)
                ? handleUnblock(userId)
                : handleBlock(userId);
            }}
            className="text-left hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-md text-black dark:text-white cursor-pointer whitespace-nowrap"
          >
            {user?.blockedUsers?.includes(userId)
              ? "Unblock User"
              : "Block User"}
          </button>
        </div>
      </div>
      {reportComp && (
        <div className="fixed inset-0 z-100 bg-black/50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm p-5 rounded-xl shadow-xl relative">
            <div className="relative flex items-center justify-center mb-3">
              <h2 className="text-lg font-semibold dark:text-white">
                Report User
              </h2>
              <button
                onClick={() => setReportComp(false)}
                className="absolute right-0"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white cursor-pointer" />
              </button>
            </div>
            <div className="space-y-3">
              <textarea
                className="w-full mt-4 p-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md resize-none h-24 focus:outline-none"
                placeholder="Please provide a reason for reporting this user (optional)"
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
              />
              <button
                onClick={handleSendReport}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 rounded-md border dark:border-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProfileComp;