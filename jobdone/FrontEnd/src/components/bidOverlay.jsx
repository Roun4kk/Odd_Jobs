import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, BadgeCheck } from "lucide-react";
import ImageSlider from "./ImageSlider";
import useAuth from "../hooks/useAuth.jsx";
import BidSection from "./bidSection";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import socket from "../socket.js";
import useSocketRoomJoin from "../hooks/socketRoomJoin.js";
import useIsMobile from "../hooks/useIsMobile.js";
import toast from "react-hot-toast";

function BidOverlay({ post, onClose, sortBy, setActiveBidPost, setPost }) {
  const [refresh, setRefresh] = useState(false);
  const [BidText, setBidText] = useState("");
  const [BidAmount, setBidAmount] = useState("");
  const { user, username, userId } = useAuth();
  const navigate = useNavigate();
  const [socketError, setSocketError] = useState(null);
  useSocketRoomJoin(user?._id, setSocketError);
  const isMobile = useIsMobile();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const descriptionRef = useRef(null);
  const scrollContainerRef = useRef(null);
  // ✅ REMOVED: inputContainerRef and handleInputFocus are no longer needed.
  // The modern CSS layout with h-dvh and flexbox handles the keyboard appearance correctly.

  useEffect(() => {
    const el = descriptionRef.current;
    if (el && el.scrollHeight > el.clientHeight) {
      setIsTruncated(true);
    }
  }, [post.postDescription, showFullDescription]);

  useEffect(() => {
    // Scrolls to the bottom to show the latest bid
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [post.bids, refresh]);

  const handlePostSubmit = async () => {
    // ✅ 1. Validate input is a valid number
    const bidAmountNumber = parseFloat(BidAmount.trim().replace(/,/g, '')); // Handle commas
    if (isNaN(bidAmountNumber) || bidAmountNumber <= 0) {
      toast.error("Please enter a valid bid amount.");
      return;
    }
    
    // ✅ 2. Validate against bid range if it exists
    if (post.minimumBid && bidAmountNumber < post.minimumBid) {
         toast.error(`Bid must be at least ₹${post.minimumBid}`);
         return;
    }
    if (post.maximumBid && bidAmountNumber > post.maximumBid) {
        toast.error(`Bid cannot exceed ₹${post.maximumBid}`);
        return;
    }
    
    // ✅ 3. Capture inputs for optimistic UI and potential error recovery
    const originalBidAmount = BidAmount;
    const originalBidText = BidText;
    setBidText("");
    setBidAmount("");

    try {
      // Post the new bid
      const newBidResponse = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts/bids`, {
        postId: post._id,
        BidText: originalBidText || "",
        BidAmount: bidAmountNumber, // Send the validated number
        userId: userId
      }, { withCredentials: true });

      const createdBid = newBidResponse.data.bid;
      // Fetch the full, updated post object
      const updatedPostResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/post/${post._id}`, {
        withCredentials: true,
      });
      const updatedPost = updatedPostResponse.data;

      // Update local and global state
      setPost(updatedPost);
      window.dispatchEvent(new CustomEvent("jobdone-post-updated", { detail: updatedPost }));
      
      // Emit socket event for real-time updates for OTHER users
      socket.emit("newBid", newBidResponse.data);

      // Notify the job poster
      const message = `${user.username} placed a new bid of ₹${bidAmountNumber} on your job post:`;
      await axios.post(`${import.meta.env.VITE_API_BSE_URL}/api/notify`, {
        userId: post.user._id,
        message,
        senderId: user._id,
        postId: post._id,
        type: "bid",
        postDescription: post.postDescription,
        bidId: createdBid._id,
      }, { withCredentials: true });

    } catch (error) {
      console.error("Error posting bid:", error);
      toast.error("Failed to place bid.");
      // ✅ Revert input fields on error
      setBidAmount(originalBidAmount);
      setBidText(originalBidText);
    }
  };

  const overlayContent = isMobile ? (
    // ✅ Use h-dvh for dynamic viewport height to handle keyboard appearance
    <div className="fixed inset-0 z-50 bg-white flex flex-col h-dvh">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <img
          src={post.user.userImage || "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"}
          alt="User"
          className="w-10 h-10 rounded-full object-cover border"
        />
        <button
          onClick={() =>
            navigate(user._id === post.user._id ? `/profile` : `/profile/${post.user._id}`)
          }
          className="text-base font-semibold truncate"
        >
          {post.user.username}
        </button>
        {post.user.verified.email && post.user.verified.phoneNumber && (
          <BadgeCheck className="h-5 w-5 text-teal-400" />
        )}
        <button onClick={onClose} className="ml-auto">
          <X className="h-6 w-6 text-gray-600" />
        </button>
      </div>

      {/* Main content area that fills remaining space */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Scrollable Content Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          {/* Post Description */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <p
                ref={descriptionRef}
                className={`text-gray-800 leading-relaxed whitespace-pre-wrap ${
                  showFullDescription ? "" : "line-clamp-4"
                }`}
              >
                {post.postDescription}
              </p>
              {isTruncated && (
                <button
                  onClick={() => setShowFullDescription(prev => !prev)}
                  className="text-sm mt-1 text-teal-600 hover:underline cursor-pointer"
                >
                  {showFullDescription ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          </div>

          {/* Bid Section */}
          <div className="p-4">
            <BidSection
              postId={post._id}
              sortBy={sortBy}
              refresh={refresh}
              currentUserId={userId}
              jobPosterId={post.user._id}
              post={post}
              setPost={setPost}
              setRefresh={setRefresh}
              setActiveBidPost={setActiveBidPost}
            />
          </div>
        </div>
        
        {/* Input Bar, fixed to the bottom of the flex container */}
        {post?.status === "open" && (
          <div
            // ✅ REMOVED: ref={inputContainerRef}
            className="bg-white border-t border-gray-200 p-4 flex-shrink-0"
          >
            <div className="flex flex-col gap-3">
              <input
                // ✅ Changed to text type with decimal inputMode for better mobile UX
                type="text"
                inputMode="decimal"
                placeholder="Enter your bid amount"
                // ✅ REMOVED: onFocus={handleInputFocus}
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                onChange={(e) => setBidAmount(e.target.value)}
                value={BidAmount}
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add comment..."
                  // ✅ REMOVED: onFocus={handleInputFocus}
                  className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                  onChange={(e) => setBidText(e.target.value)}
                  value={BidText}
                />
                <button
                  onClick={handlePostSubmit}
                  className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600 text-sm font-medium"
                >
                  Place
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : (
    // Desktop layout (remains unchanged)
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center">
      {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="bg-white w-full max-w-md h-full md:h-5/6 p-4 flex items-center shadow-lg overflow-hidden">
            <ImageSlider mediaUrls={post.mediaUrls} />
          </div>
        )}
      <div className="bg-white w-full max-w-md h-full md:h-5/6 p-4 flex flex-col shadow-lg overflow-hidden">
        <div className="gap-2 mb-2 flex items-center">
          <img
            src={post.user.userImage || "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"}
            alt="User"
            className="w-12 h-12 rounded-full border-2 border-white object-cover"
          />
          <button>
            <h2
              onClick={() => {
                if (user._id === post.user._id) {
                  navigate(`/profile`);
                } else {
                  navigate(`/profile/${post.user._id}`);
                }
              }}
              className="text-lg font-semibold cursor-pointer"
            >
              {post.user.username}
            </h2>
          </button>
          {post.user.verified.email && post.user.verified.phoneNumber && (
            <BadgeCheck className="h-6 w-6 text-teal-400" />
          )}
          <button onClick={onClose} className="ml-auto">
            <X className="text-gray-600 hover:text-black cursor-pointer" />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="relative">
              <p
                ref={descriptionRef}
                className={`text-gray-800 leading-relaxed whitespace-pre-wrap transition-all duration-300 ${
                  showFullDescription ? "" : "line-clamp-4"
                }`}
              >
                {post.postDescription}
              </p>

              {isTruncated && (
                <button
                  onClick={() => setShowFullDescription(prev => !prev)}
                  className="text-sm mt-1 text-teal-600 hover:underline cursor-pointer"
                >
                  {showFullDescription ? "Show less" : "Read more"}
                </button>
              )}
            </div>
            <div className="pt-2">
              <BidSection
                postId={post._id}
                sortBy={sortBy}
                refresh={refresh}
                currentUserId={userId}
                jobPosterId={post.user._id}
                post={post}
                setPost={setPost}
                setRefresh={setRefresh}
                setActiveBidPost={setActiveBidPost}
              />
            </div>
          </div>
          {post?.status === "open" && (
            <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="  Bid"
                    className="w-1/5 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    onChange={(e) => setBidAmount(e.target.value)}
                    value={BidAmount}
                  />
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    onChange={(e) => setBidText(e.target.value)}
                    value={BidText}
                  />
                  <button
                    className="bg-teal-400 text-white px-4 rounded-full hover:bg-teal-600 transition duration-200 cursor-pointer"
                    onClick={handlePostSubmit}
                  >
                    Place
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(overlayContent, document.body);
}

export default BidOverlay;