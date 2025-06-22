import { useState, useEffect, useCallback } from "react";
import { X, BadgeCheck } from "lucide-react";
import ImageSlider from "./ImageSlider";
import useAuth from "../hooks/useAuth.jsx";
import BidSection from "./bidSection";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import socket from "../socket.js";
import useSocketRoomJoin from "../hooks/socketRoomJoin.js";
import useIsMobile from "../hooks/useIsMobile.js";

function BidOverlay({ post, onClose, sortBy, setPosts, setActiveBidPost }) {
  const [refresh, setRefresh] = useState(false);
  const [BidText, setBidText] = useState("");
  const [BidAmount, setBidAmount] = useState("");
  const { user, username, userId } = useAuth();
  const navigate = useNavigate();
  const [socketError, setSocketError] = useState(null);
  const isMobile = useIsMobile();
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const debounce = (func, delay) => {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
    };

    const handleResize = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const offset = Math.max(0, windowHeight - viewportHeight);
        setKeyboardOffset(offset);
      }
    };

    const debouncedHandler = debounce(handleResize, 50);
    const initialCheckTimeout = setTimeout(handleResize, 100);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", debouncedHandler);
    }

    return () => {
      document.body.style.overflow = "auto";
      clearTimeout(initialCheckTimeout);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", debouncedHandler);
      }
    };
  }, []);

  const handlePostSubmit = async () => {
    if (BidAmount < post.minimumBid || (post.maximumBid && BidAmount > post.maximumBid)) {
      alert(`Bid out of bid range : ₹${post.minimumBid} to ₹${post.maximumBid || '∞'}`);
      return;
    }
    try {
      const message = `${user.username} placed a new bid of ₹${BidAmount} on your job post:`;
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/notify`, {
        userId: post.user._id,
        message,
        senderId: user._id,
        postId: post._id,
        type: "bid",
        postDescription: post.postDescription,
      }, { withCredentials: true });

      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts/bids`, {
        postId: post._id,
        BidText: BidText || "",
        BidAmount,
        username,
      });

      const newBid = {
        postId: post._id,
        BidText: BidText || "",
        BidAmount,
        user: {
          _id: userId,
          username,
          verified: user.verified || {},
          userImage: user.userImage
        }
      };

      socket.emit("newBid", newBid);
      setRefresh(prev => !prev);
      setBidText("");
      setBidAmount("");
    } catch (error) {
      console.error("Error posting bid:", error);
    }
  };

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-60 bg-white flex flex-col" role="dialog" aria-labelledby="bid-overlay-header">
        {/* Header: Fixed at the top */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white shadow-sm flex-shrink-0" id="bid-overlay-header">
          <img
            src={post.user.userImage || "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"}
            alt={`Profile of ${post.user.username}`}
            className="w-10 h-10 rounded-full object-cover border border-gray-300"
          />
          <button
            onClick={() => navigate(user._id === post.user._id ? `/profile` : `/profile/${post.user._id}`)}
            className="text-base font-semibold text-gray-900 truncate flex-1"
            aria-label={`View profile of ${post.user.username}`}
          >
            {post.user.username}
          </button>
          {post.user.verified.email && post.user.verified.phoneNumber && (
            <BadgeCheck className="h-5 w-5 text-teal-500" aria-label="Verified user" />
          )}
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100" aria-label="Close overlay">
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingBottom: `${keyboardOffset + 16}px` }}>
          <div className="p-4 border-b border-gray-100">
            <p className="text-gray-800 leading-relaxed text-base" aria-label="Post description">
              {post.postDescription}
            </p>
          </div>
          <div className="p-4">
            <BidSection
              postId={post._id}
              sortBy={sortBy}
              refresh={refresh}
              currentUserId={userId}
              jobPosterId={post.user._id}
              post={post}
              setPosts={setPosts}
              setRefresh={setRefresh}
              setActiveBidPost={setActiveBidPost}
            />
          </div>
        </div>

        {/* Input Bar: Fixed at bottom */}
        {post?.status === "open" && (
          <div
            className="bg-white border-t border-gray-200 p-3 flex-shrink-0"
            style={{ transform: `translateY(-${keyboardOffset}px)`, transition: "transform 0.2s ease-in-out" }}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label htmlFor="bid-amount" className="text-sm font-medium text-gray-700 sr-only">
                  Bid Amount (₹{post.minimumBid} - ₹{post.maximumBid || '∞'})
                </label>
                <input
                  id="bid-amount"
                  type="number"
                  placeholder="Enter your bid amount"
                  className="w-full border border-gray-300 rounded-md px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  value={BidAmount}
                  aria-required="true"
                  aria-label="Bid amount input"
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="bid-comment" className="text-sm font-medium text-gray-700 sr-only">
                  Add a comment
                </label>
                <input
                  id="bid-comment"
                  type="text"
                  placeholder="Add comment..."
                  className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  onChange={(e) => setBidText(e.target.value)}
                  value={BidText}
                  aria-label="Comment input"
                />
                <button
                  onClick={handlePostSubmit}
                  className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-teal-300 disabled:cursor-not-allowed"
                  disabled={!BidAmount || BidAmount < post.minimumBid || (post.maximumBid && BidAmount > post.maximumBid)}
                  aria-label="Place bid"
                >
                  Place
                </button>
              </div>
            </div>
          </div>
        )}

        {socketError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm absolute bottom-16 left-4 right-4 rounded-md" role="alert">
            {socketError}. Please try refreshing the page or logging in again.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center">
      <div className="bg-white w-full max-w-md h-full md:h-5/6 p-4 flex items-center shadow-lg overflow-hidden">
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <ImageSlider mediaUrls={post.mediaUrls} />
        )}
      </div>
      <div className="bg-white w-full max-w-md h-full md:h-5/6 p-4 flex flex-col shadow-lg overflow-hidden">
        <div className="flex gap-2 mb-2 flex items-center">
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
            <BadgeCheck className="h-6 w-6 text-teal-500" />
          )}
          <button onClick={onClose} className="ml-auto">
            <X className="text-gray-600 hover:text-black cursor-pointer" />
          </button>
        </div>
        <p className="py-2">{post.postDescription}</p>
        <BidSection
          postId={post._id}
          sortBy={sortBy}
          refresh={refresh}
          currentUserId={userId}
          jobPosterId={post.user._id}
          post={post}
          setPosts={setPosts}
          setRefresh={setRefresh}
          setActiveBidPost={setActiveBidPost}
        />
        {post?.status === "open" && (
          <div className="flex gap-2">
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
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none"
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
        )}
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