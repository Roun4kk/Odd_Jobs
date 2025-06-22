import { useState, useEffect, useCallback } from "react"; // 1. Import useCallback
import { X, BadgeCheck } from "lucide-react";
import ImageSlider from "./ImageSlider";
import useAuth from "../hooks/useAuth.jsx";
import BidSection from "./bidSection";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import socket from "../socket.js";
import useSocketRoomJoin from "../hooks/socketRoomJoin.js";
import useIsMobile from "../hooks/useIsMobile.js";
import  toast  from "react-hot-toast";

function BidOverlay({ post, onClose, sortBy, setPosts, setActiveBidPost }) {
  const [refresh, setRefresh] = useState(false);
  const [BidText, setBidText] = useState("");
  const [BidAmount, setBidAmount] = useState("");
  const { user, username, userId } = useAuth();
  const navigate = useNavigate();
  const [socketError, setSocketError] = useState(null);
  const isMobile = useIsMobile();
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  useSocketRoomJoin(user?._id, setSocketError);

  // 2. More robust useEffect for handling the mobile keyboard
  useEffect(() => {
    document.body.style.overflow = "hidden";

    // A simple debounce function to prevent rapid-fire event handling
    const debounce = (func, delay) => {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
        }, delay);
      };
    };

    const handleResize = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const offset = windowHeight - viewportHeight;
        setKeyboardOffset(offset > 0 ? offset : 0);
      }
    };

    const debouncedHandler = debounce(handleResize, 50);

    // Delay the initial check slightly to avoid race conditions on mount
    const initialCheckTimeout = setTimeout(() => {
        handleResize();
    }, 100);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", debouncedHandler);
    }

    // Cleanup function
    return () => {
      document.body.style.overflow = "auto";
      clearTimeout(initialCheckTimeout);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", debouncedHandler);
      }
    };
  }, []); // Empty dependency array is correct here as it manages its own lifecycle

    const handlePostSubmit = async () => {
    if (BidAmount < post.minimumBid || (post.maximumBid && BidAmount > post.maximumBid)) {
      toast.error(`Bid out of bid range : ${post.minimumBid} to ${post.maximumBid}`);
      return;
    }
    try {
      const message = `${user.username} placed a new bid of ${BidAmount} on your job post:`;
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
        userId: userId
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
      console.error("Error posting comment:", error);
    }
  };

if (isMobile) {
    // This layout uses pure CSS flexbox to adapt to the keyboard.
    // No JavaScript for keyboard detection is needed.
    return (
      <div className="fixed inset-0 z-60 bg-white">
        <div className="flex flex-col h-full">

          {/* 1. Header: Stays fixed at the top */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 flex-shrink-0">
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

          {/* 2. Scrollable Content Area */}
          {/* This is the key: It takes up the remaining space and scrolls.
              'flex-1' makes it grow and shrink.
              'min-h-0' is crucial to allow it to shrink properly in flexbox. */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-4 border-b border-gray-100">
              <p className="text-gray-800 leading-relaxed">{post.postDescription}</p>
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

          {/* 3. Input Bar: Stays fixed at the bottom */}
          {post?.status === "open" && (
            <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
              <div className="flex flex-col gap-3">
                <input
                  type="number"
                  placeholder="Enter your bid amount"
                  className="w-full border border-gray-300 rounded-md px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  value={BidAmount}
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add comment..."
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
    );
  }

  // ✅ Desktop Layout (Unchanged)
  return (
    // ... Desktop JSX is unchanged
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center">
      <div className="bg-white w-full max-w-md h-full md:h-5/6 p-4 flex items-center shadow-lg overflow-hidden">
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <ImageSlider mediaUrls={post.mediaUrls} />
        )}
      </div>
      <div className="bg-white w-full max-w-md h-full md:h-5/6 p-4 flex flex-col shadow-lg overflow--hidden">
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
            <BadgeCheck className="h-6 w-6 text-teal-400" />
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
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none"
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