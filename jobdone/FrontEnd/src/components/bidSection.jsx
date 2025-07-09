import { useState, useEffect } from "react";
import {BadgeCheck  , Handshake , MoreVertical , X , Star} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.jsx";
import socket from "../socket.js";
import useSocketRoomJoin from "../hooks/socketRoomJoin.js";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";

function BidSection({ postId, refresh, sortBy, currentUserId, jobPosterId , post , setRefresh , setActiveBidPost}) {
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
        // Ensure the full user object is included
        const normalizedBid = {
          _id: bidData._id, // Make sure to handle _id if sent from socket
          BidAmount: bidData.BidAmount,
          BidText: bidData.BidText,
          user: bidData.user
        };
        
        setBids((prev) => {
          const updated = [...prev, normalizedBid];

          // Re-apply sorting logic
          if (sortBy === "rating") {
            updated.sort((a, b) => (b.user.averageRating || 0) - (a.user.averageRating || 0));
          } else if (sortBy === "1") {
            updated.sort((a, b) => a.BidAmount - b.BidAmount);
          } else {
            updated.sort((a, b) => b.BidAmount - a.BidAmount);
          }

          return updated;
        });

      }
    };
    socket.on("receiveNewBid", handleNewBid);

    return () => {
      socket.off("receiveNewBid", handleNewBid);
    };
  }, [post, sortBy]); // Added sortBy to dependencies
  
  const handleDelete = async () =>{
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/posts/bids`, {
        data: {
          postId,
          bidId: selectedBid._id // pass the _id of the bid directly
        }
    })
    setBids((prevBids) => prevBids.filter(bid => bid._id !== selectedBid._id));
    toast.success("Bid deleted!!");
    setBidComp(false);
    } catch (error) {
      console.error("Failed to delete bid:", error);
      toast.error("Failed to delete bid.");
    }
  }

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
        postDescription : post.postDescription,
      },
      {
        withCredentials: true
      } );

      // Propagate state update
      const updatedPost = {
        ...post,
        winningBidId: selectedBid._id,
        selectedWinner: pendingWinner,
        status: "winnerSelected",
      };

      // Update local state in parent BidOverlayPage
      if (setActiveBidPost) {
          setActiveBidPost(updatedPost); 
      }
      
      // Dispatch global event for other components like JobFeed
      window.dispatchEvent(new CustomEvent("jobdone-post-updated", { detail: updatedPost }));

      setRefresh(prev => !prev);
      setConfirmWinner(false);
    } catch (err) {
      console.error("Error selecting winner:", err);
      toast.error("Failed to select winner.");
    }
  }

  // ✅ CORRECTED Loading State: Removed h-screen and other layout-breaking classes.
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="w-8 h-8 border-4 border-teal-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  // ✅ CORRECTED Main Return: Removed flex-1 and overflow-y-auto. This is now a simple container.
  return (
    <div className="w-full">
      {/* Bids List */}
      <div className="space-y-2">
        {bids.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
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
               <div key={bid._id || index} className={`p-3 rounded-xl shadow-sm ${isWinner ? "bg-teal-400 border border-teal-400" : "bg-gray-100"}`}>
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-sm text-gray-700 flex items-center gap-1">
                    <span className="font-semibold text-black">{bid.BidAmount}₹ bid by{" "}</span>
                    <button disabled={shouldBlur}
                      onClick={() => {
                        if (user._id === bid.user._id) {
                          navigate(`/profile`); 
                        } else {
                          navigate(`/profile/${bid.user._id}`); 
                        }
                      }}
                      className={`font-semibold text-black cursor-pointer ${shouldBlur ? "blur-sm" : ""}`}
                    >
                      {shouldBlur ? "anonymous" : `@${bid.user.username}`}
                    </button>
                    {bid.user.verified?.email && bid.user.verified?.phoneNumber && (
                      <BadgeCheck className="h-5 w-5 text-teal-400 ml-1" />
                    )}
                  </p>
                  {typeof bid.user.totalRating === 'number' && bid.user.totalRating > 0 && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Star
                        className="w-4 h-4 text-yellow-400"
                        fill="#facc15"
                      />
                      <span className="font-medium">{bid.user.averageRating?.toFixed(1) || "0.0"}</span>
                      <span className="text-gray-400">({bid.user.totalRating})</span>
                    </div>
                  )}

                  <div className="ml-auto justify-between">
                    {user?._id === jobPosterId && post.status !== "winnerSelected" && !post.winningBidId && (<button onClick={() => {
                        setPendingWinner(bid.user._id);
                        setConfirmWinner(true);
                        setSelectedBid(bid);
                      }} className=" p-1 rounded-full hover:bg-gray-200 transition-colors duration-200 cursor-pointer">
                      <Handshake className="w-6 h-6 text-teal-400 " />
                    </button>)}
                    <button onClick = {() => {setBidComp(true), setSelectedBid(bid)}}className={` p-1 rounded-full ${isWinner? "hover:bg-teal-500 " :"hover:bg-gray-200 "}transition-colors duration-200 cursor-pointer`}>
                      <MoreVertical className= {`w-6 h-6 ${isWinner ? "text-white" : "text-gray-400"}`} />
                    </button>
                  </div>
                </div>
                <p className="text-gray-800">{bid.BidText}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Modals are rendered via portal, they don't affect layout */}
      {bidComp && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-sm p-5 rounded-xl shadow-xl relative">
    
            <button onClick={() => {setOpenReport(true) , setBidComp(false)}} className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-red-500 text-red-600 hover:bg-red-50 transition cursor-pointer">
              Report
            </button>

            {(jobPosterId===user._id || selectedBid?.user?._id === user._id) && selectedBid?._id?.toString() !== post?.winningBidId?.toString() && (<button onClick = {() => handleDelete()}className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-red-500 text-red-600 hover:bg-gray-100 transition cursor-pointer">
              Delete
            </button>)}

            <button
              onClick={() => setBidComp(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-gray-500 text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
      {openReport && createPortal(
          <div className="fixed inset-0 z-100 bg-black/50 flex justify-center items-center">
            <div className="bg-white w-full max-w-sm p-5 rounded-xl shadow-xl relative">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Report Post</h2>
                <button onClick={() => {setOpenReport(false) }}>
                  <X className="w-5 h-5 text-gray-600 hover:text-black cursor-pointer" />
                </button>
              </div>
              <textarea
                className="w-full mt-4 p-2 border rounded-md resize-none h-24 focus:outline-none"
                placeholder={"Please provide a reason for reporting this post (optional)"}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
              />
              <button
                onClick={() => { handleSendReport()}}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 rounded-md border hover:bg-gray-100 cursor-pointer transition-colors duration-200"
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
        <div className="bg-white p-4 rounded shadow-md w-[300px] text-center">
          <p className="mb-4 font-semibold">
            Are you sure you want to hire this bidder ?
            <br />
            <span className="text-sm text-red-500">You can't undo this action.</span>
          </p>
          <div className="flex justify-around">
            <button
              onClick={handleSelectWinner}
              className="bg-teal-600 text-white px-4 py-1 rounded cursor-pointer"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmWinner(false)}
              className="bg-gray-300 text-black px-4 py-1 rounded cursor-pointer"
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