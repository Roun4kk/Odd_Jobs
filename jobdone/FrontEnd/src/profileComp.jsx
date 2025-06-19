import axios from "axios";
import { useEffect, useRef , useState} from "react";
import useAuth from "./hooks/useAuth.jsx";
import { X } from "lucide-react";

function ProfileComp({setComp , userId}) { 
    const popoverRef = useRef(null);
    const [reportComp , setReportComp] = useState(false);
    const [reportText , setReportText] = useState("");
    const { user , updateUser} = useAuth();

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setComp(false);
      }
    };

    const handleScroll = () => {
      setComp(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleScroll, true); // `true` to capture scroll on children too

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [setComp]);


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


  const handleSendReport = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/report/${userId}`, {
        text: reportText,
      }, {
        withCredentials: true,
      });

      setReportText("");
      setReportComp(false);
      setComp(false);
    } catch (err) {
      console.error("Failed to send report:", err);
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute top-22 z-50 right-46 bg-gray-200 text-black w-max shadow-lg shadow-white rounded-xl"
    >   
        <div className="absolute -top-2 right-3 w-4 h-4 bg-gray-200 rotate-45"></div>
      <div className="flex flex-col p-4">
        <button onClick = {() => {setReportComp(true)}}className="text-left hover:bg-gray-100 p-2 rounded-md cursor-pointer">
          Report
        </button>
        <button onClick = {() => {user?.blockedUsers?.includes(userId) ? handleUnblock(userId) : handleBlock(userId)}}className="text-left hover:bg-gray-100 p-2 rounded-md text-black cursor-pointer">
          {user?.blockedUsers?.includes(userId) ? "Unblock User" : "Block User"}
        </button>
      </div>
      {reportComp &&
        (<div className="fixed inset-0 z-100 bg-black/50 flex justify-center items-center">
          <div className="bg-white w-full max-w-sm p-5 rounded-xl shadow-xl relative">
            <div className="relative flex items-center justify-center mb-3">
              <h2 className="text-lg font-semibold">Report</h2>
              <button
                onClick={() => setReportComp(false)}
                className="absolute right-0"
              >
                <X className="w-5 h-5 text-gray-600 hover:text-black cursor-pointer" />
              </button>
            </div>
            <div className="space-y-3">
              <textarea
                className="w-full mt-4 p-2 border rounded-md resize-none h-24 focus:outline-none"
                placeholder={"Please provide a reason for reporting this user (optional)"}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
              />
              <button
                onClick={handleSendReport}
                className="w-full flex justify-centeritems-center gap-2 px-4 py-2 rounded-md border hover:bg-gray-100 cursor-pointer transition-colors duration-200"
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

export default ProfileComp;