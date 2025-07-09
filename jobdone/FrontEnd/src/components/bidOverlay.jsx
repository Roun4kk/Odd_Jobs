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
  // ✅ Create a ref for the entire input container
  const inputContainerRef = useRef(null);
  
  useEffect(() => {
    const el = descriptionRef.current;
    if (el && el.scrollHeight > el.clientHeight) {
      setIsTruncated(true);
    }
  }, [post.postDescription, showFullDescription]);

  useEffect(() => {
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [post.bids, refresh]);

  // ✅ Updated focus handler to scroll the CONTAINER into view
  const handleInputFocus = () => {
    setTimeout(() => {
      // Check if the ref is attached to an element
      if (inputContainerRef.current) {
        inputContainerRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end", 
        });
      }
    }, 150);
  };

  const handlePostSubmit = async () => {
    if (BidAmount < post.minimumBid || (post.maximumBid && BidAmount > post.maximumBid)) {
      toast.error(`Bid out of bid range : ${post.minimumBid} to ${post.maximumBid}`);
      return;
    }
    
    const bidAmountValue = BidAmount; // Capture before clearing
    setBidText("");
    setBidAmount("");

    try {
      // 1. Post the new bid
      // Step 1: Post the new bid
      const newBidResponse = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts/bids`, {
        postId: post._id,
        BidText: BidText || "",
        BidAmount: bidAmountValue,
        userId: userId
      }, { withCredentials: true });

      const createdBid = newBidResponse.data.bid;
      // 2. The server should ideally return the full, updated post object.
      // If it doesn't, we need to fetch it again. Let's assume we need to fetch it.
      const updatedPostResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/post/${post._id}`, {
        withCredentials: true,
      });
      const updatedPost = updatedPostResponse.data;

      // 3. Update the local state in BidOverlayPage via the setPost prop
      setPost(updatedPost);

      // 4. Dispatch the global event so JobFeed can hear about the update
      window.dispatchEvent(new CustomEvent("jobdone-post-updated", { detail: updatedPost }));
      
      // 5. Emit socket event for real-time updates for OTHER users
      // The newBidResponse.data should contain the newly created bid object with user details
      socket.emit("newBid", newBidResponse.data);

      // 6. Notify the job poster
      const message = `${user.username} placed a new bid of ${bidAmountValue} on your job post:`;
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/notify`, {
        userId: post.user._id,
        message,
        senderId: user._id,
        postId: post._id,
        type: "bid",
        postDescription: post.postDescription,
        bidId: createdBid._id, // ✅ send it to store in job poster's notification
      }, { withCredentials: true });

      setRefresh(prev => !prev); // Keep this for re-rendering bidSection

    } catch (error) {
      console.error("Error posting bid:", error);
      toast.error("Failed to place bid.");
      // Optional: Revert input fields on error
      setBidAmount(bidAmountValue);
    }
  };

  const overlayContent = isMobile ? (
    <div className="fixed inset-0 z-50 bg-white flex flex-col h-full">
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

      {/* Main content area */}
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
              setRefresh={setRefresh}
              setActiveBidPost={setActiveBidPost}
            />
          </div>
        </div>
        
        {/* Input Bar */}
        {post?.status === "open" && (
          // ✅ Attach the ref to the container div
          <div
            ref={inputContainerRef}
            className="bg-white border-t border-gray-200 p-4 flex-shrink-0"
          >
            <div className="flex flex-col gap-3">
              <input
                type="number"
                placeholder="Enter your bid amount"
                onFocus={handleInputFocus}
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                onChange={(e) => setBidAmount(Number(e.target.value))}
                value={BidAmount}
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add comment..."
                  onFocus={handleInputFocus}
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
    // Desktop layout remains unchanged
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
                setPosts={setPost}
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
                    type="number"
                    placeholder="  Bid"
                    className="w-1/5 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 no-spinner appearance-none"
                    onChange={(e) => setBidAmount(Number(e.target.value))}
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