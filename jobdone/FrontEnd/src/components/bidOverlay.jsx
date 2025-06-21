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
import BottomNavbar from "../bottomNavBar.jsx";

function BidOverlay({ post, onClose, sortBy, setPosts, setActiveBidPost }) {
  const [refresh, setRefresh] = useState(false);
  const [BidText, setBidText] = useState("");
  const [BidAmount, setBidAmount] = useState("");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const { user, username, userId } = useAuth();
  const navigate = useNavigate();
  const [socketError, setSocketError] = useState(null);
  const isMobile = useIsMobile();
  useSocketRoomJoin(user?._id, setSocketError);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    
    // Mobile keyboard detection
    if (isMobile) {
      const handleResize = () => {
        // Detect if keyboard is visible by checking viewport height change
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const screenHeight = window.screen.height;
        const keyboardThreshold = screenHeight * 0.75;
        
        setIsKeyboardVisible(viewportHeight < keyboardThreshold);
      };

      // Modern viewport API
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleResize);
      } else {
        // Fallback for older browsers
        window.addEventListener('resize', handleResize);
      }

      return () => {
        document.body.style.overflow = "auto";
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleResize);
        } else {
          window.removeEventListener('resize', handleResize);
        }
      };
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobile]);

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

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-60 bg-black/50 flex flex-col">
        {/* Main Content Area */}
        <div 
          className={`bg-white flex-1 flex flex-col transition-all duration-300 ${
            isKeyboardVisible && inputFocused ? 'pb-0' : 'pb-20'
          }`}
          style={{
            maxHeight: isKeyboardVisible && inputFocused 
              ? `${window.visualViewport?.height || window.innerHeight}px`
              : 'calc(100vh - 5rem)'
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
            <img 
              src={post.user.userImage || "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"} 
              alt="User" 
              className="w-10 h-10 rounded-full border-2 border-gray-200 object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 
                  onClick={() => {
                    if (user._id === post.user._id) {
                      navigate(`/profile`); 
                    } else {
                      navigate(`/profile/${post.user._id}`); 
                    }
                  }} 
                  className="text-lg font-semibold cursor-pointer truncate"
                >
                  {post.user.username}
                </h2>
                {post.user.verified.email && post.user.verified.phoneNumber && (
                  <BadgeCheck className="h-5 w-5 text-teal-400 flex-shrink-0" />
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {/* Post Description */}
            <div className="p-4 border-b border-gray-100">
              <p className="text-gray-800 leading-relaxed">{post.postDescription}</p>
            </div>

            {/* Images */}
            {post.mediaUrls && post.mediaUrls.length > 0 && (
              <div className="border-b border-gray-100">
                <ImageSlider mediaUrls={post.mediaUrls} />
              </div>
            )}

            {/* Bid Section */}
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
        </div>

        {/* Input Bar - Fixed at bottom */}
        {post?.status === "open" && (
          <div 
            className={`bg-white border-t border-gray-200 transition-all duration-300 ${
              isKeyboardVisible && inputFocused 
                ? 'fixed bottom-0 left-0 right-0 z-50' 
                : 'relative'
            }`}
            style={{
              bottom: isKeyboardVisible && inputFocused 
                ? '0px' 
                : 'auto'
            }}
          >
            <div className="p-4 space-y-3">
              {/* Bid Amount Input */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bid Amount (₹{post.minimumBid} - ₹{post.maximumBid || '∞'})
                  </label>
                  <input 
                    type="number" 
                    placeholder="Enter your bid amount"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
                    onChange={(e) => setBidAmount(Number(e.target.value))}
                    value={BidAmount}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setTimeout(() => setInputFocused(false), 100)}
                  />
                </div>
              </div>

              {/* Comment Input */}
              <div className="flex items-end gap-3">
                <input
                  type="text"
                  placeholder="Add a comment (optional)..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  onChange={(e) => setBidText(e.target.value)}
                  value={BidText}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setTimeout(() => setInputFocused(false), 100)}
                />
                <button 
                  className="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={handlePostSubmit}
                  disabled={!BidAmount || BidAmount < post.minimumBid || (post.maximumBid && BidAmount > post.maximumBid)}
                >
                  Place Bid
                </button>
              </div>
            </div>
            {/* Safe area for home indicator on newer iPhones */}
            <div className="h-safe-area-inset-bottom" />
          </div>
        )}

        {/* Socket Error */}
        {socketError && (
          <div className="absolute top-20 left-4 right-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg z-50">
            Connection error: {socketError}. Please try refreshing the page or logging in again.
          </div>
        )}
      </div>
    );
  }

  // Desktop Layout (unchanged)
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