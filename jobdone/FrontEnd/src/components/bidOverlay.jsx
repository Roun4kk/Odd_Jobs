import { useState, useEffect } from "react";
import {X , BadgeCheck} from "lucide-react";
import ImageSlider from "./ImageSlider";
import useAuth from "../hooks/useAuth.jsx";
import BidSection from "./bidSection";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import socket from "../socket.js";
import useSocketRoomJoin from "../hooks/socketRoomJoin.js";

function BidOverlay({ post, onClose, sortBy, setPosts , setActiveBidPost}) {
    const [refresh, setRefresh] = useState(false);
    const [BidText, setBidText] = useState("");
    const [BidAmount, setBidAmount] = useState("");
    const { user ,username , userId} = useAuth();
    const navigate = useNavigate();
    const [socketError, setSocketError] = useState(null);
    console.log("bidOverlaypost", post);
    useSocketRoomJoin(user?._id, setSocketError);   // ONE line
    useEffect(() => {
        document.body.style.overflow = "hidden";
    
        return () => {
          document.body.style.overflow = "auto";
        };
    }, []);
    const handlePostSubmit = async () => {
      if(BidAmount < post.minimumBid || ( post.maximumBid && BidAmount > post.maximumBid)){
        alert(`Bid out of bid range : ${post.minimumBid} to ${post.maximumBid}`);
        return;
      }
        try {
          const message = `${user.username} placed a new bid of ${BidAmount} on your job post:`
          await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/notify`, {
            userId: post.user._id,
            message: message,
            senderId: user._id,
            postId: post._id,
            type: "bid",
            postDescription : post.postDescription,
          } );

          await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts/bids`, {
                postId: post._id,
                BidText: (BidText || ""),
                BidAmount,
                username,
              });
              // In BidOverlay.jsx
          const newBid = {
            postId: post._id,
            BidText: BidText || "",
            BidAmount,
            user: {
              _id: userId,
              username: username,
              verified: user.verified || {},
              userImage: user.userImage
            }
          };

          socket.emit("newBid", newBid);  
          setRefresh((prev) => !prev);
          setBidText("");
            setBidAmount("");
        } catch (error) {
          console.error("Error posting comment:", error);
        }
      };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center">
        <div className="bg-white w-full max-w-md h-full md:h-5/6 p-4 flex items-center shadow-lg overflow-hidden">
            {post.mediaUrls && post.mediaUrls.length > 0 && (
              <ImageSlider mediaUrls={post.mediaUrls} />
            )}
        </div>
        <div className="bg-white w-full max-w-md h-full md:h-5/6 p-4 flex flex-col shadow-lg overflow-hidden">
        <div className="flex gap-2 mb-2 flex items-center">
        <img src={post.user.userImage || "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"} alt="User" className="w-12 h-12 rounded-full border-2 border-white object-cover"/>
          <button>
            <h2 onClick={() => {
                    if (user._id === post.user._id) {
                      navigate(`/profile`); 
                    } else {
                      navigate(`/profile/${post.user._id}`); 
                    }
                  }}className="text-lg font-semibold cursor-pointer">{post.user.username}</h2>
          </button>
          {post.user.verified.email && post.user.verified.phoneNumber && (
                  <BadgeCheck className="h-6 w-6 text-teal-400" />
                )}
          <button onClick={onClose} className="ml-auto">
            <X className="text-gray-600 hover:text-black cursor-pointer" />
          </button>
        </div>
        <p className="py-2">{post.postDescription}</p>
        <BidSection postId={post._id} sortBy={sortBy} refresh={refresh} currentUserId={userId} jobPosterId ={post.user._id} post ={post} setPosts = {setPosts} setRefresh ={setRefresh} setActiveBidPost ={setActiveBidPost} />

        {post?.status === "open" && (<div className="flex gap-2">
            <input 
            type="number" 
            placeholder="   Bid"
            className="w-1/5 border border-gray-300 rounded-full px-4 py-2 focus:outline-none no-spinner appearance-none"
            onChange={(e) => setBidAmount(Number(e.target.value))}
            value={BidAmount}
            />
          <input
            type="text"
            placeholder="Add a comment..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none"
            onChange={(e) => setBidText(e.target.value)}
            value={BidText}
          />
          <button className="bg-teal-400 text-white px-4 rounded-full hover:bg-teal-600 transition duration-200 cursor-pointer " onClick={handlePostSubmit}>Place</button>
        </div>)}
      </div>
      {socketError && (
            <div className="p-4 text-red-500">
              Connection error: {socketError}. Please try refreshing the page or logging in again.
            </div>
          )}
    </div>
  );
}

export default BidOverlay;