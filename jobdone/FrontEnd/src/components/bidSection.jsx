import { useState, useEffect } from "react";
import {BadgeCheck  , Handshake , MoreVertical , X , Star} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.jsx";
import socket from "../socket.js";
import useSocketRoomJoin from "../hooks/socketRoomJoin.js";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import {useTheme} from "../ThemeContext.jsx"; // Import useTheme

function BidSection({ postId, refresh, sortBy, currentUserId, jobPosterId , post , setRefresh , setPost, setActiveBidPost}) {
  const [bids, setBids] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [socketError, setSocketError] = useState(null);
  useSocketRoomJoin(user?._id, setSocketError);
  const [bidComp , setBidComp] = useState(false);
  const [selectedBid , setSelectedBid] = useState(null);
  const [openReport , setOpenReport] = useState(false);
  const [reportText , setReportText] = useState("");
  const [confirmWinner, setConfirmWinner] = useState(false);
  const [pendingWinner, setPendingWinner] = useState(null);
  const { theme } = useTheme(); // Get current theme

  const buttonStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
      : '#2dd4bf' // This is the hex code for teal-400
  };

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/posts/bids`,
          {
            params: { postId, sortBy },
            withCredentials: true
          }
        );
        setBids(response.data || []);
      } catch (error) {
        console.error("Error fetching post:", error);
        if (error.response) {
          console.error("Response error:", error.response.data);
        } else if (error.request) {
          console.error("Request error:", error.request);
        } else {
          console.error("Error message:", error.message);
        }
      }
      setLoading(false);
    };
    fetchPost();
  }, [refresh, sortBy, post]);

  useEffect(() => {
    const handleNewBid = (bidData) => {
      if (bidData.postId === postId) {
        const normalizedBid = {
          _id: bidData._id || bidData.bid?._id || `temp_${Date.now()}`,
          BidAmount: bidData.BidAmount || bidData.bid?.BidAmount || 0,
          BidText: bidData.BidText || bidData.bid?.BidText || "",
          user: bidData.user || bidData.bid?.user || { username: "Unknown" }
        };

        setBids((prev) => {
          const existingBid = prev.find(bid => bid._id === normalizedBid._id);
          if (existingBid) {
            console.log("🔄 Duplicate bid found, skipping");
            return prev;
          }
          
          const updated = [...prev, normalizedBid];
          if (sortBy === "rating") {
            updated.sort((a, b) => (b.user.averageRating || 0) - (a.user.averageRating || 0));
          } else if (sortBy === "1") {
            updated.sort((a, b) => a.BidAmount - b.BidAmount);
          } else {
            updated.sort((a, b) => b.BidAmount - a.BidAmount);
          }
          return updated;
        });
      } else {
        console.log("❌ Post IDs don't match");
        console.log("Expected:", postId, "Received:", bidData.postId);
      }
    };
    
    socket.on("receiveNewBid", handleNewBid);

    return () => {
      socket.off("receiveNewBid", handleNewBid);
    };
  }, [postId, sortBy]); 

  const handleDelete = async () => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/posts/bids`, {
        data: { postId, bidId: selectedBid._id },
        withCredentials: true,
      });

      const updatedPostResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/post/${postId}`, {
        withCredentials: true,
      });
      const updatedPost = updatedPostResponse.data;

      setPost(updatedPost);

      setBids((prevBids) => prevBids.filter((bid) => bid._id !== selectedBid._id));

      toast.success("Bid deleted!");
      setBidComp(false);
    } catch (error) {
      console.error("Failed to delete bid:", error);
      toast.error("Failed to delete bid.");
    }
  };

  const handleSendReport = async () =>{
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/report/${selectedBid.user._id}`, {
        text: reportText,
        postId: postId,
        bidId: selectedBid._id,
      }, {
        withCredentials: true,
      });

      setReportText("");
      setOpenReport(false);
      toast.success("Report sent successfully!");
    } catch (err) {
      console.error("Failed to send report:", err);
    }
  }
  const handleSelectWinner = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/posts/select-winner`, {
        postId,
        userId: pendingWinner,
        bidId: selectedBid._id,
      });
      const message = `Congratulations! You have been hired with a pay of ₹${selectedBid.BidAmount} for the job : `;
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/notify`, {
        userId: selectedBid.user._id,
        message: message,
        senderId: user._id,
        postId: post._id,
        type: "Hired",
        bidId: selectedBid._id,
        postDescription : post.postDescription,
      },
      {
        withCredentials: true
      } );

      const updatedPost = {
        ...post,
        winningBidId: selectedBid._id,
        selectedWinner: pendingWinner,
        status: "winnerSelected",
      };

      if (setActiveBidPost) {
          setActiveBidPost(updatedPost); 
      }
      
      window.dispatchEvent(new CustomEvent("jobdone-post-updated", { detail: updatedPost }));

      setRefresh(prev => !prev);
      setConfirmWinner(false);
    } catch (err) {
      console.error("Error selecting winner:", err);
      toast.error("Failed to select winner.");
    }
  }

  if (loading) {
    return (
        <div className="p-4 space-y-3 flex-1 overflow-y-auto animate-pulse">
           {[...Array(3)].map((_, i) => (
             <div key={i} className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700/50 space-y-2">
               <div className="flex items-center gap-2">
                 <div className="w-4/6 h-4 bg-gray-300 dark:bg-gray-600 rounded" />
                 <div className="w-10 h-4 bg-gray-300 dark:bg-gray-600 rounded ml-auto" />
               </div>
               <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-5/6" />
             </div>
           ))}
         </div>
    );
  }

  return (
    <div className="w-full" style={{ scrollBehavior: 'auto' }}>
      {/* Bids List */}
      <div className="space-y-2">
        {bids.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            No bids yet. Be the first to place a bid!
          </div>
        ) : (
          bids.map((bid, index) => {
            const shouldBlur = !(
              currentUserId === jobPosterId || 
              currentUserId === bid.user._id
            );
            const isWinner = post?.winningBidId?.toString() === bid._id?.toString() ;

            return (
              <div key={bid._id || index} className={`p-3 rounded-xl shadow-sm ${isWinner ? "bg-teal-400 dark:bg-teal-500/80 border border-teal-400" : "bg-gray-100 dark:bg-gray-800"} transform-gpu`}>
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <span className={`font-semibold ${isWinner ? 'text-white' : 'text-black dark:text-white'}`}>{bid.BidAmount}₹ bid by{" "}</span>
                    <button disabled={shouldBlur}
                      onClick={() => {
                        if (user._id === bid.user._id) {
                          navigate(`/profile`); 
                        } else {
                          navigate(`/profile/${bid.user._id}`); 
                        }
                      }}
                      className={`font-semibold ${isWinner ? 'text-white' : 'text-black dark:text-white'} cursor-pointer ${shouldBlur ? "blur-sm" : ""} max-w-[100px] truncate`}
                    >
                      {shouldBlur ? "anonymous" : `@${bid.user.username}`}
                    </button>
                    {bid.user.verified?.email && bid.user.verified?.phoneNumber && (
                      <BadgeCheck className="h-5 w-5 text-teal-400 ml-1" />
                    )}
                  </p>
                  {typeof bid.user.totalRating === 'number' && bid.user.totalRating > 0 && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                      <Star
                        className="w-4 h-4 text-yellow-400"
                        fill="#facc15"
                      />
                      <span className="font-medium">{bid.user.averageRating?.toFixed(1) || "0.0"}</span>
                      <span className="text-gray-400 dark:text-gray-500">({bid.user.totalRating})</span>
                    </div>
                  )}

                  <div className="ml-auto justify-between">
                    {user?._id === jobPosterId && post.status !== "winnerSelected" && !post.winningBidId && (<button onClick={() => {
                        setPendingWinner(bid.user._id);
                        setConfirmWinner(true);
                        setSelectedBid(bid);
                      }} className=" p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer">
                      <Handshake className="w-6 h-6 text-teal-400 " />
                    </button>)}
                    <button onClick = {() => {setBidComp(true), setSelectedBid(bid)}}className={` p-1 rounded-full ${isWinner? "hover:bg-teal-500 " :"hover:bg-gray-200 dark:hover:bg-gray-700"}transition-colors duration-200 cursor-pointer`}>
                      <MoreVertical className= {`w-6 h-6 ${isWinner ? "text-white" : "text-gray-400 dark:text-gray-300"}`} />
                    </button>
                  </div>
                </div>
                <p className={`text-gray-800 ${isWinner ? 'text-white' : 'dark:text-gray-200'}`}>{bid.BidText}</p>
              </div>
            );
          })
        )}
      </div>

      {bidComp && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm p-5 rounded-xl shadow-xl relative">
    
            <button onClick={() => {setOpenReport(true) , setBidComp(false)}} className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-red-500 text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 hover:bg-red-50 transition cursor-pointer">
              Report
            </button>

            {(jobPosterId===user._id || selectedBid?.user?._id === user._id) && selectedBid?._id?.toString() !== post?.winningBidId?.toString() && (<button onClick = {() => handleDelete()}className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-red-500 text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 hover:bg-red-50 transition cursor-pointer">
              Delete
            </button>)}

            <button
              onClick={() => setBidComp(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-gray-500 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
      {openReport && createPortal(
          <div className="fixed inset-0 z-100 bg-black/50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm p-5 rounded-xl shadow-xl relative">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold dark:text-white">Report Post</h2>
                <button onClick={() => {setOpenReport(false) }}>
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white cursor-pointer" />
                </button>
              </div>
              <textarea
                className="w-full mt-4 p-2 border dark:border-gray-600 rounded-md resize-none h-24 focus:outline-none dark:bg-gray-700 dark:text-white"
                placeholder={"Please provide a reason for reporting this post (optional)"}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
              />
              <button
                onClick={() => { handleSendReport()}}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 rounded-md border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200 dark:text-white"
              >
                Send Report
              </button>
            </div>
          </div>,
          document.body
        )
      }
    {confirmWinner && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-100">
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-md w-[300px] text-center">
          <p className="mb-4 font-semibold dark:text-white">
            Are you sure you want to hire this bidder ?
            <br />
            <span className="text-sm text-red-500 dark:text-red-400">You can't undo this action.</span>
          </p>
          <div className="flex justify-around">
            <button
              onClick={handleSelectWinner}
              className=" text-white px-4 py-1 rounded cursor-pointer"
              style={buttonStyle}
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmWinner(false)}
              className="bg-gray-300 dark:bg-gray-600 text-black dark:text-white px-4 py-1 rounded cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

export default BidSection;