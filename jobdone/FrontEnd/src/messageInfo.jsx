import axios from "axios";
import { useEffect, useRef , useState} from "react";
import useAuth from "./hooks/useAuth.jsx";
import { X } from "lucide-react";

function MessageComp({setComp , fetchMessages , userId}) { 
    const popoverRef = useRef(null);
    const [deleteComp , setDeleteComp] = useState(false);
    const [reportComp , setReportComp] = useState(false);
    const [reportText , setReportText] = useState("");
    const { user , updateUser} = useAuth();

  const handleBlock = async (userId) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/block/${userId}`, null, {
        withCredentials: true,
      });
      updateUser ((prevUser) => ({
        ...prevUser,
        blockedUsers: [...(prevUser.blockedUsers || []), userId],
      }));
    } catch (err) {
      console.error("Failed to block user:", err);
    }
  };

  const handleUnblock = async (userId) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/unblock/${userId}`, null, {
      withCredentials: true,
    });
      updateUser((prevUser) => ({
        ...prevUser,
        blockedUsers: prevUser.blockedUsers.filter((id) => id !== userId),
      }));
    } catch (err) {
      console.error("Failed to unblock user:", err);
    }
  };

  const handleDelete = async (userId) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/conversation/${userId}`, {
        withCredentials: true,
      });
      
      fetchMessages(userId);
      setDeleteComp(false);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const handleSendReport = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/report/${userId}`, {
        text: reportText,
      }, {
        withCredentials: true,
      });

      setReportText("");
      setReportComp(false);
    } catch (err) {
      console.error("Failed to send report:", err);
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute top-16 z-50 right-6 bg-gray-200 dark:bg-gray-800 text-black dark:text-white w-max shadow-lg shadow-white dark:shadow-black/20 rounded-xl"
    >   
        <div className="absolute -top-2 right-3 w-4 h-4 bg-gray-200 dark:bg-gray-800 rotate-45"></div>
      <div className="flex flex-col p-4">
        <button onClick = {() => {setReportComp(true)}}className="text-left hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-md cursor-pointer">
          Report
        </button>
        <button onClick = {() => {user?.blockedUsers?.includes(userId) ? handleUnblock(userId) : handleBlock(userId)}}className="text-left hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-md text-black dark:text-white cursor-pointer">
          {user?.blockedUsers?.includes(userId) ? "Unblock User" : "Block User"}
        </button>
        <button onClick= {() => {setDeleteComp(true)}} className="text-left hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-md text-black dark:text-white cursor-pointer">
          Delete Messages
        </button>
      </div>
      {deleteComp &&
        (<div className="fixed inset-0 z-100 bg-black/50 flex justify-center items-center">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm p-5 rounded-xl shadow-xl relative">
            <div className="flex justify-center items-center mb-3">
              <h2 className="text-lg font-semibold dark:text-white">Delete Messages Permanently?</h2>
            </div>
            <div className="space-y-3">
              <button onClick={() => handleDelete(userId)}
                className="w-full flex justify-center items-center text-red-600 dark:text-red-400 gap-2 px-4 py-2 rounded-md border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteComp(false)}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 rounded-md border dark:border-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>)
      }
      {reportComp &&
        (<div className="fixed inset-0 z-100 bg-black/50 flex justify-center items-center">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm p-5 rounded-xl shadow-xl relative">
            <div className="relative flex items-center justify-center mb-3">
              <h2 className="text-lg font-semibold dark:text-white">Report</h2>
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
                placeholder={"Please provide a reason for reporting this user (optional)"}
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
        </div>)
      }
    </div>
  );
}

export default MessageComp;