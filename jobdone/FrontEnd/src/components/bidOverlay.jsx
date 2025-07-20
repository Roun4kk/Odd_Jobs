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
  const { user, userId } = useAuth();
  const navigate = useNavigate();
  const [socketError, setSocketError] = useState(null);
  useSocketRoomJoin(user?._id, setSocketError);
  const isMobile = useIsMobile();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const descriptionRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputContainerRef = useRef(null);
  const activeElementRef = useRef(null);
  const savedScrollPosition = useRef(0);
  const lastViewportHeight = useRef(0);

  useEffect(() => {
    const el = descriptionRef.current;
    if (el && el.scrollHeight > el.clientHeight) {
      setIsTruncated(true);
    }
  }, [post.postDescription, showFullDescription]);

  // ✅ IMPROVED: Enhanced mobile input handling with better scroll management
  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!isMobile || !visualViewport) return;

    // Initialize the last known height when the component mounts
    lastViewportHeight.current = visualViewport.height;
    
    // Store user's scroll position and keyboard state
    let userScrollPosition = 0;
    let isKeyboardOpen = false;
    let inputFocused = false;

    const handleFocusIn = (e) => {
      const target = e.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        inputFocused = true;
        activeElementRef.current = target;
        
        // Save current scroll position when input is focused
        if (scrollContainerRef.current) {
          userScrollPosition = scrollContainerRef.current.scrollTop;
        }

        // Wait for keyboard to appear, then adjust for full visibility
        setTimeout(() => {
          if (inputContainerRef.current && activeElementRef.current) {
            // Calculate if input is visible above keyboard + password suggestions
            const inputRect = inputContainerRef.current.getBoundingClientRect();
            const keyboardHeight = window.innerHeight - visualViewport.height;
            const passwordSuggestionsHeight = 44; // Approximate height of password suggestions
            const safeArea = 20; // Additional safe spacing
            const availableHeight = visualViewport.height - safeArea;
            
            // If input is obscured, ensure it's fully visible
            if (inputRect.bottom > availableHeight) {
              inputContainerRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end",
                inline: "nearest",
              });
            }
          }
        }, 300); // Give keyboard time to appear
      }
    };

    const handleFocusOut = (e) => {
      // Only clear if not refocusing on another input
      setTimeout(() => {
        if (!document.activeElement || 
            (document.activeElement.tagName !== "INPUT" && 
             document.activeElement.tagName !== "TEXTAREA")) {
          inputFocused = false;
          activeElementRef.current = null;
        }
      }, 100);
    };

    const handleViewportResize = () => {
      const currentHeight = visualViewport.height;
      const heightDifference = currentHeight - lastViewportHeight.current;
      const keyboardThreshold = 100;

      if (Math.abs(heightDifference) > keyboardThreshold) {
        if (heightDifference < 0 && inputFocused) {
          // Keyboard opening
          isKeyboardOpen = true;
          
          // Ensure input container is visible above keyboard + password suggestions
          setTimeout(() => {
            if (inputContainerRef.current && activeElementRef.current) {
              const inputRect = inputContainerRef.current.getBoundingClientRect();
              const passwordSuggestionsHeight = 44;
              const availableHeight = visualViewport.height - passwordSuggestionsHeight - 10;
              
              if (inputRect.bottom > availableHeight) {
                inputContainerRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "end",
                  inline: "nearest",
                });
              }
              
              // Restore main content scroll position after a brief delay
              setTimeout(() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = userScrollPosition;
                }
              }, 200);
            }
          }, 150);
          
        } else if (heightDifference > 0 && isKeyboardOpen) {
          // Keyboard closing - do NOT blur input, just restore scroll position
          isKeyboardOpen = false;
          
          // Restore scroll position without disrupting input focus
          setTimeout(() => {
            if (scrollContainerRef.current && !inputFocused) {
              scrollContainerRef.current.scrollTop = userScrollPosition;
            }
          }, 100);
        }
      }

      // Always update the last known height
      lastViewportHeight.current = currentHeight;
    };

    // Track user scroll to update saved position (only when not keyboard triggered)
    const handleScroll = () => {
      if (scrollContainerRef.current && !isKeyboardOpen) {
        userScrollPosition = scrollContainerRef.current.scrollTop;
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    visualViewport.addEventListener("resize", handleViewportResize);
    
    if (scrollContainerRef.current) {
      scrollContainerRef.current.addEventListener("scroll", handleScroll);
    }

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      visualViewport.removeEventListener("resize", handleViewportResize);
      
      if (scrollContainerRef.current) {
        scrollContainerRef.current.removeEventListener("scroll", handleScroll);
      }
    };
  }, [isMobile]);

  const handlePostSubmit = async () => {
    // Blur active input to hide keyboard on submission
    if (document.activeElement) document.activeElement.blur();

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

  // ✅ ENHANCED MOBILE LAYOUT with better input handling
  const overlayContent = isMobile ? (
    <div className="fixed inset-0 z-50 bg-white flex flex-col h-dvh">
      {/* Header: Fixed at top */}
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

      {/* Main Content Area: Scrollable content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
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
      
      {/* Input Bar (Footer): Enhanced for better visibility */}
      {post?.status === "open" && (
        <div
          ref={inputContainerRef}
          className="bg-white border-t border-gray-200 p-4 flex-shrink-0 relative z-10"
          style={{
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))'
          }}
        >
          <div className="flex flex-col gap-3">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              name="bid-amount"
              id="bid-amount-input"
              data-form-type="other"
              data-lpignore="true"
              data-1p-ignore="true"
              placeholder="Enter your bid amount"
              className="w-full border border-gray-300 rounded-md px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              onChange={(e) => setBidAmount(e.target.value)}
              value={BidAmount}
              onFocus={(e) => {
                setTimeout(() => {
                  e.target.scrollIntoView({ 
                    behavior: "smooth", 
                    block: "center",
                    inline: "nearest" 
                  });
                }, 100);
              }}
              style={{ fontSize: '16px' }} // Prevent zoom on iOS
            />
            <div className="flex gap-2">
              <input
                type="text"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                name="bid-comment"
                id="bid-comment-input"
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
                placeholder="Add comment..."
                className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                onChange={(e) => setBidText(e.target.value)}
                value={BidText}
                onFocus={(e) => {
                  setTimeout(() => {
                    e.target.scrollIntoView({ 
                      behavior: "smooth", 
                      block: "center",
                      inline: "nearest" 
                    });
                  }, 100);
                }}
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
              />
              <button
                onClick={handlePostSubmit}
                className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600 text-sm font-medium flex-shrink-0"
              >
                Place
              </button>
            </div>
          </div>
        </div>
      )}
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
            <div className="relative transform-gpu">
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
                    autoComplete="off"
                    className="w-1/5 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    onChange={(e) => setBidAmount(e.target.value)}
                    value={BidAmount}
                  />
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    autoComplete="off"
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