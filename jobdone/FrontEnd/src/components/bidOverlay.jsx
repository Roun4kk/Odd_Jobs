import { useState, useEffect } from "react";
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
  useSocketRoomJoin(user?._id, setSocketError);

  const [overlayHeight, setOverlayHeight] = useState('calc(100vh - 4rem)');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const vh = currentHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // Detect keyboard by comparing current height with initial viewport height
      const heightDifference = viewportHeight - currentHeight;
      const keyboardThreshold = 150; // Adjust this value as needed
      
      if (heightDifference > keyboardThreshold) {
        setIsKeyboardOpen(true);
        setOverlayHeight(`${currentHeight}px`);
      } else {
        setIsKeyboardOpen(false);
        setOverlayHeight('calc(var(--vh, 1vh) * 100 - 4rem)');
        setViewportHeight(currentHeight);
      }
    };

    // Initial call
    handleResize();
    setViewportHeight(window.innerHeight);

    // Listen for resize events (e.g., keyboard show/hide)
    window.addEventListener('resize', handleResize);

    // Additional listeners for better keyboard detection on iOS
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      window.addEventListener('focusin', () => {
        setTimeout(() => {
          setIsKeyboardOpen(true);
        }, 300);
      });
      
      window.addEventListener('focusout', () => {
        setTimeout(() => {
          setIsKeyboardOpen(false);
        }, 300);
      });
    }

    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener('resize', handleResize);
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        window.removeEventListener('focusin', () => {});
        window.removeEventListener('focusout', () => {});
      }
    };
  }, [viewportHeight]);

  const handlePostSubmit = async () => {
    if (BidAmount < post.minimumBid || (post.maximumBid && BidAmount > post.maximumBid)) {
      alert(`Bid out of bid range : ${post.minimumBid} to ${post.maximumBid}`);
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
      console.error("Error posting comment:", error);
    }
  };

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex justify-center">
        <div 
          className="flex flex-col overflow-hidden relative w-full max-w-full" 
          style={{ 
            height: isKeyboardOpen ? '100vh' : overlayHeight, 
            maxWidth: '100vw' 
          }}
        >
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b border-gray-100">
              {/* User info with close button in same line */}
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={post.user.userImage || "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"}
                  alt="User"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <button
                  onClick={() =>
                    navigate(user._id === post.user._id ? `/profile` : `/profile/${post.user._id}`)
                  }
                  className="text-base font-semibold"
                >
                  {post.user.username}
                </button>
                {post.user.verified.email && post.user.verified.phoneNumber && (
                  <BadgeCheck className="h-4 w-4 text-teal-400" />
                )}
                <button onClick={onClose} className="ml-auto p-2">
                  <X className="text-gray-600 hover:text-black w-6 h-6" />
                </button>
              </div>
              
              {/* Post description */}
              <p className="text-gray-700 text-sm leading-relaxed">{post.postDescription}</p>
            </div>

            {/* Bid section with padding to prevent overlap with input bar */}
            <div className="px-4 py-2 flex-1" style={{ paddingBottom: isKeyboardOpen ? '80px' : '70px' }}>
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

          {/* Bid input section - Fixed at bottom, above keyboard */}
          {post?.status === "open" && (
            <div 
              className="w-full p-2 bg-white border-t border-gray-200 z-50"
              style={{
                position: 'fixed',
                bottom: isKeyboardOpen ? '0' : 'env(safe-area-inset-bottom, 0px)',
                left: '0',
                right: '0',
                transform: isKeyboardOpen ? 'translateY(0)' : 'none',
                transition: 'all 0.3s ease-in-out'
              }}
            >
              <div className="w-full max-w-full flex gap-2 items-center flex-nowrap overflow-x-hidden">
                <input
                  type="number"
                  placeholder="Bid"
                  className="w-1/6 border border-gray-300 rounded-full px-2 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 flex-shrink-0"
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  value={BidAmount}
                  inputMode="numeric"
                />
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="flex-1 border border-gray-300 rounded-full px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 min-w-0"
                  onChange={(e) => setBidText(e.target.value)}
                  value={BidText}
                />
                <button
                  onClick={handlePostSubmit}
                  className="bg-teal-500 text-white px-3 py-2 rounded-full hover:bg-teal-600 transition text-sm flex-shrink-0"
                  style={{ minWidth: '50px' }}
                >
                  Place
                </button>
              </div>
            </div>
          )}

          {/* Socket error display */}
          {socketError && (
            <div 
              className="absolute left-0 right-0 p-4 text-red-500 text-sm border-t border-red-200 bg-red-50"
              style={{ bottom: isKeyboardOpen ? '80px' : '70px' }}
            >
              Connection error: {socketError}. Please try refreshing the page or logging in again.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Original Desktop UI Restored
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
            }} className="text-lg font-semibold cursor-pointer">{post.user.username}</h2>
          </button>
          {post.user.verified.email && post.user.verified.phoneNumber && (
            <BadgeCheck className="h-6 w-6 text-teal-400" />
          )}
          <button onClick={onClose} className="ml-auto">
            <X className="text-gray-600 hover:text-black cursor-pointer" />
          </button>
        </div>
        <p className="py-2">{post.postDescription}</p>
        <BidSection postId={post._id} sortBy={sortBy} refresh={refresh} currentUserId={userId} jobPosterId={post.user._id} post={post} setPosts={setPosts} setRefresh={setRefresh} setActiveBidPost={setActiveBidPost} />
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
            <button className="bg-teal-400 text-white px-4 rounded-full hover:bg-teal-600 transition duration-200 cursor-pointer" onClick={handlePostSubmit}>Place</button>
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