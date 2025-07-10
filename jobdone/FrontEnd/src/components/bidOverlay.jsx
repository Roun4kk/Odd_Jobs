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
  const inputContainerRef = useRef(null);
  const bidAmountInputRef = useRef(null);
  const bidTextInputRef = useRef(null);

  // Instagram-style keyboard handling states
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [activeInput, setActiveInput] = useState(null);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    const el = descriptionRef.current;
    if (el && el.scrollHeight > el.clientHeight) {
      setIsTruncated(true);
    }
  }, [post.postDescription, showFullDescription]);

  // Instagram-style keyboard detection and handling
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = viewportHeight - currentHeight;
      
      if (heightDiff > 150) { // Keyboard is likely visible
        setKeyboardHeight(heightDiff);
        setIsKeyboardVisible(true);
      } else {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
        setActiveInput(null);
      }
    };

    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const heightDiff = viewportHeight - window.visualViewport.height;
        if (heightDiff > 150) {
          setKeyboardHeight(heightDiff);
          setIsKeyboardVisible(true);
        } else {
          setKeyboardHeight(0);
          setIsKeyboardVisible(false);
          setActiveInput(null);
        }
      }
    };

    // Store initial viewport height
    setViewportHeight(window.innerHeight);

    // Add event listeners
    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
    };
  }, [isMobile, viewportHeight]);

  // Auto-scroll to active input when keyboard appears
  useEffect(() => {
    if (isKeyboardVisible && activeInput && isMobile) {
      const timeout = setTimeout(() => {
        const inputElement = activeInput === 'amount' ? bidAmountInputRef.current : bidTextInputRef.current;
        if (inputElement && inputContainerRef.current) {
          // Scroll the input container into view
          inputContainerRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'end'
          });
        }
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [isKeyboardVisible, activeInput, isMobile]);

  // Scroll to bottom when new bids are added
  useEffect(() => {
    if (scrollContainerRef.current && !isKeyboardVisible) {
      const timeout = setTimeout(() => {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [post.bids, refresh, isKeyboardVisible]);

  const handleInputFocus = (inputType) => {
    setActiveInput(inputType);
    
    // Small delay to ensure keyboard animation starts
    setTimeout(() => {
      if (inputContainerRef.current) {
        inputContainerRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end'
        });
      }
    }, 150);
  };

  const handleInputBlur = () => {
    // Don't immediately clear active input to avoid jumps
    setTimeout(() => {
      if (document.activeElement?.tagName !== 'INPUT') {
        setActiveInput(null);
      }
    }, 100);
  };

  const handlePostSubmit = async () => {
    const bidAmountNumber = parseFloat(BidAmount.trim());
    if (isNaN(bidAmountNumber) || bidAmountNumber <= 0) {
      toast.error("Please enter a valid bid amount.");
      return;
    }
    
    if (bidAmountNumber < post.minimumBid || (post.maximumBid && bidAmountNumber > post.maximumBid)) {
      toast.error(`Bid out of bid range : ${post.minimumBid} to ${post.maximumBid}`);
      return;
    }
    
    const originalBidAmount = BidAmount;
    const originalBidText = BidText;
    setBidText("");
    setBidAmount("");

    // Blur inputs to hide keyboard
    if (bidAmountInputRef.current) bidAmountInputRef.current.blur();
    if (bidTextInputRef.current) bidTextInputRef.current.blur();

    try {
      const newBidResponse = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts/bids`, {
        postId: post._id,
        BidText: originalBidText || "",
        BidAmount: bidAmountNumber,
        userId: userId
      }, { withCredentials: true });

      const createdBid = newBidResponse.data.bid;
      const updatedPostResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/post/${post._id}`, {
        withCredentials: true,
      });
      const updatedPost = updatedPostResponse.data;

      setPost(updatedPost);
      window.dispatchEvent(new CustomEvent("jobdone-post-updated", { detail: updatedPost }));
      
      socket.emit("newBid", newBidResponse.data);

      const message = `${user.username} placed a new bid of ${bidAmountNumber} on your job post:`;
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/notify`, {
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
      setBidAmount(originalBidAmount);
      setBidText(originalBidText);
    }
  };

  const overlayContent = isMobile ? (
    <div 
      className="fixed inset-0 z-50 bg-white flex flex-col"
      style={{ 
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden'
      }}
    >
      {/* Header - Fixed */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white flex-shrink-0 relative z-10">
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

      {/* Content Area - Scrollable */}
      <div 
        className="flex-1 flex flex-col min-h-0 relative"
        style={{
          paddingBottom: isKeyboardVisible ? 0 : 0,
          transition: 'padding-bottom 0.3s ease-out'
        }}
      >
        {/* Scrollable Content */}
        <div 
          ref={scrollContainerRef} 
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{
            paddingBottom: isKeyboardVisible ? 20 : 80,
            transition: 'padding-bottom 0.3s ease-out'
          }}
        >
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
          <div className="p-4 pb-6">
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

        {/* Input Bar - Fixed at bottom */}
        {post?.status === "open" && (
          <div
            ref={inputContainerRef}
            className="bg-white border-t border-gray-200 flex-shrink-0 relative z-10"
            style={{
              position: 'fixed',
              bottom: isKeyboardVisible ? keyboardHeight - 10 : 0,
              left: 0,
              right: 0,
              padding: '16px',
              transition: 'bottom 0.3s ease-out, transform 0.3s ease-out',
              transform: isKeyboardVisible ? 'translateY(0)' : 'translateY(0)',
              boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
            }}
          >
            <div className="flex flex-col gap-3">
              <input
                ref={bidAmountInputRef}
                type="text"
                inputMode="decimal"
                placeholder="Enter your bid amount"
                className="w-full border border-gray-300 rounded-md px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                onChange={(e) => setBidAmount(e.target.value)}
                value={BidAmount}
                onFocus={() => handleInputFocus('amount')}
                onBlur={handleInputBlur}
                style={{ fontSize: '16px' }} // Prevents zoom on iOS
              />
              <div className="flex gap-2">
                <input
                  ref={bidTextInputRef}
                  type="text"
                  placeholder="Add comment..."
                  className="flex-1 border border-gray-300 rounded-md px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  onChange={(e) => setBidText(e.target.value)}
                  value={BidText}
                  onFocus={() => handleInputFocus('text')}
                  onBlur={handleInputBlur}
                  style={{ fontSize: '16px' }} // Prevents zoom on iOS
                />
                <button
                  onClick={handlePostSubmit}
                  className="bg-teal-500 text-white px-6 py-3 rounded-md hover:bg-teal-600 text-sm font-medium transition-colors"
                  disabled={!BidAmount.trim()}
                  style={{
                    opacity: BidAmount.trim() ? 1 : 0.6
                  }}
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
    // Desktop layout (unchanged)
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