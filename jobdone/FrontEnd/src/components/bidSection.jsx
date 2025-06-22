import { useState, useEffect } from "react";
import {BadgeCheck  , Handshake , MoreVertical , X , Star} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.jsx";
import socket from "../socket.js";
import useSocketRoomJoin from "../hooks/socketRoomJoin.js";

function BidSection({ postId, refresh, sortBy, currentUserId, jobPosterId , post , setPosts , setRefresh , setActiveBidPost}) {
  const [bids, setBids] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [socketError, setSocketError] = useState(null);
  useSocketRoomJoin(user?._id, setSocketError);   // ONE line
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
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/posts/bids`, { params: { postId, sortBy , currentUserId} });
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
          BidAmount: bidData.BidAmount,
          BidText: bidData.BidText,
          user: bidData.user
        };
        
        setBids((prev) => {
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

      }
    };
    socket.on("receiveNewBid", handleNewBid);

    return () => {
      socket.off("receiveNewBid", handleNewBid);
    };
  }, [post ]);
  
  const handleDelete = async () =>{
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/posts/bids`, {
      data: {
        postId: postId,
        userId: selectedBid.user._id,
        BidAmount: selectedBid.BidAmount,
      }
    })
    setBids((prevBids) =>
      prevBids.filter(
        (bid) =>
          bid.user._id !== selectedBid.user._id ||
          bid.BidAmount !== selectedBid.BidAmount
      )
    );
    setBidComp(false);
    } catch (error) {
      console.error("Failed to send report:", err);
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
      alert("Report sent successfully!");
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
              setPosts(prevPosts =>
                prevPosts.map(p =>
                  p._id === postId
                    ? {
                        ...p,
                        winningBidId: selectedBid._id,
                        selectedWinner: pendingWinner,
                        status: "winnerSelected",
                      }
                    : p
                ));
              setActiveBidPost(prev => ({
                ...prev,
                winningBidId: selectedBid._id,
                selectedWinner: pendingWinner,
                status: "winnerSelected",
              }));

              setRefresh(prev => !prev);
              setConfirmWinner(false);
            } catch (err) {
              console.error("Error selecting winner:", err);
              alert("Failed to select winner.");
            }
          }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-12 h-12 border-4 border-teal-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto space-y-2 mb-4">
      {bids.map((bid, index) => {
        const shouldBlur = !(
          currentUserId === jobPosterId || 
          currentUserId === bid.user._id
        );
        const isWinner = post?.winningBidId?.toString() === bid._id?.toString() ;

        return (
           <div key={index} className={`p-3 rounded-xl shadow-sm ${isWinner ? "bg-teal-400 border border-teal-400" : "bg-gray-100"}`}>
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
      })}
      {socketError && (
            <div className="p-4 text-red-500">
              Connection error: {socketError}. Please try refreshing the page or logging in again.
            </div>
          )}
      {bidComp && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex justify-center items-center">
          <div className="bg-white w-full max-w-md h-full md:h-auto p-6 rounded-lg shadow-lg flex flex-col gap-4">
    
            <button onClick={() => {setOpenReport(true) , setBidComp(false)}} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-red-500 text-red-600 hover:bg-red-50 transition cursor-pointer">
              Report
            </button>

            {jobPosterId===user._id && selectedBid?._id?.toString() !== post?.winningBidId?.toString() && (<button onClick = {() => handleDelete()}className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-red-500 text-red-600 hover:bg-gray-100 transition cursor-pointer">
              Delete
            </button>)}

            <button
              onClick={() => setBidComp(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-gray-500 text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {openReport && (
          <div className="fixed inset-0 z-100 bg-black/50 flex justify-center items-center">
            <div className="bg-white w-full max-w-sm p-5 rounded-xl shadow-xl relative">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Report Post</h2>
                <button onClick={() => {setOpenReport(false) , onClose()}}>
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
          </div>
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
