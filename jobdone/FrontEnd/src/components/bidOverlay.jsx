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
import BottomNavbar from "../bottomNavBar.jsx";
import { useTheme } from "../ThemeContext"; // Import useTheme

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
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const descriptionRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputContainerRef = useRef(null);
  const activeElementRef = useRef(null);
  const savedScrollPosition = useRef(0);
  const lastViewportHeight = useRef(0);
  const initialViewportHeight = useRef(0);
  const { theme } = useTheme(); // Get current theme

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const buttonStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
      : '#2dd4bf' // This is the hex code for teal-400
  };

  useEffect(() => {
    const el = descriptionRef.current;
    if (el && el.scrollHeight > el.clientHeight) {
      setIsTruncated(true);
    }
  }, [post.postDescription, showFullDescription]);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!isMobile || !visualViewport) return;

    // Store initial viewport height
    initialViewportHeight.current = visualViewport.height;
    lastViewportHeight.current = visualViewport.height;
    
    let userScrollPosition = 0;
    let inputFocused = false;
    let focusTimeout = null;
    let keyboardCheckInterval = null;

    const checkKeyboardState = () => {
      const currentHeight = visualViewport.height;
      const heightDifference = initialViewportHeight.current - currentHeight;
      const keyboardThreshold = 50;
      const shouldShowKeyboard = heightDifference > keyboardThreshold;
      
      // Only update if there's a significant change
      setIsKeyboardOpen(prev => {
        if (prev !== shouldShowKeyboard) {
          return shouldShowKeyboard;
        }
        return prev;
      });
    };

    const handleFocusIn = (e) => {
      const target = e.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        inputFocused = true;
        activeElementRef.current = target;
        
        // Clear any pending focus timeout
        if (focusTimeout) {
          clearTimeout(focusTimeout);
          focusTimeout = null;
        }
        
        if (scrollContainerRef.current) {
          userScrollPosition = scrollContainerRef.current.scrollTop;
          savedScrollPosition.current = userScrollPosition;
        }

        // Start checking keyboard state more frequently when input is focused
        if (keyboardCheckInterval) {
          clearInterval(keyboardCheckInterval);
        }
        keyboardCheckInterval = setInterval(checkKeyboardState, 100);

        setTimeout(() => {
          if (inputContainerRef.current && activeElementRef.current) {
            // Force keyboard to be detected as open when input is focused
            setIsKeyboardOpen(true);
            
            const inputRect = inputContainerRef.current.getBoundingClientRect();
            const safeArea = 20; 
            const availableHeight = visualViewport.height - safeArea;
            
            if (inputRect.bottom > availableHeight) {
              inputContainerRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end",
                inline: "nearest",
              });
            }
          }
        }, 200); 
      }
    };

    const handleFocusOut = (e) => {
      // Clear focus timeout if exists
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
      
      // Set a timeout to check if focus moved to another input
      focusTimeout = setTimeout(() => {
        const activeEl = document.activeElement;
        const isInputActive = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
        
        if (!isInputActive) {
          inputFocused = false;
          activeElementRef.current = null;
          
          // Clear the keyboard check interval
          if (keyboardCheckInterval) {
            clearInterval(keyboardCheckInterval);
            keyboardCheckInterval = null;
          }
          
          // Reset keyboard state only if no input is focused
          setTimeout(() => {
            if (!document.activeElement || 
                (document.activeElement.tagName !== "INPUT" && 
                 document.activeElement.tagName !== "TEXTAREA")) {
              setIsKeyboardOpen(false);
            }
          }, 150);
        }
      }, 150);
    };

    const handleViewportResize = () => {
      checkKeyboardState();
      
      const currentHeight = visualViewport.height;
      const heightChange = currentHeight - lastViewportHeight.current;

      if (Math.abs(heightChange) > 100) {
        if (heightChange < 0 && inputFocused) {
          
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
              
              setTimeout(() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = userScrollPosition;
                }
              }, 200);
            }
          }, 150);
          
        } else if (heightChange > 0) {
          
          setTimeout(() => {
            if (scrollContainerRef.current && !inputFocused) {
              scrollContainerRef.current.scrollTop = userScrollPosition;
            }
          }, 100);
        }
      }

      lastViewportHeight.current = currentHeight;
    };

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
      // Cleanup timeouts and intervals
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
      if (keyboardCheckInterval) {
        clearInterval(keyboardCheckInterval);
      }
      
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      visualViewport.removeEventListener("resize", handleViewportResize);
      
      if (scrollContainerRef.current) {
        scrollContainerRef.current.removeEventListener("scroll", handleScroll);
      }
    };
  }, [isMobile]);

  const handlePostSubmit = async () => {
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
      toast.success("Bid placed successfully!");
      const createdBid = newBidResponse.data.bid;
      const emitData = {
        postId: post._id,
        _id: createdBid._id,
        BidAmount: createdBid.BidAmount,
        BidText: createdBid.BidText,
        user: {
          _id: user._id,
          username: user.username,
          verified: user.verified || {},
          averageRating: user.averageRating,
          totalRating: user.totalRating
        }
      };
      socket.emit("newBid", emitData);

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
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col h-dvh">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <img
          src={post.user.userImage || "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"}
          alt="User"
          className="w-10 h-10 rounded-full object-cover border dark:border-gray-600"
        />
        <button
          onClick={() =>
            navigate(user._id === post.user._id ? `/profile` : `/profile/${post.user._id}`)
          }
          className="text-base font-semibold truncate dark:text-white"
        >
          {post.user.username}
        </button>
        {post.user.verified.email && post.user.verified.phoneNumber && (
          <BadgeCheck className="h-5 w-5 text-teal-400" />
        )}
        <button onClick={onClose} className="ml-auto">
          <X className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* Main Content Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <p
              ref={descriptionRef}
              className={`text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap ${
                showFullDescription ? "" : "line-clamp-4"
              }`}
            >
              {post.postDescription}
            </p>
            {isTruncated && (
              <button
                onClick={() => setShowFullDescription(prev => !prev)}
                className="text-sm mt-1 text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
              >
                {showFullDescription ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        </div>

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
      
      {/* Input Bar */}
      {post?.status === "open" && (
        <div
          ref={inputContainerRef}
          className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0 relative z-10"
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
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500"
              onChange={(e) => setBidAmount(e.target.value)}
              value={BidAmount}
              onFocus={(e) => {
                // Ensure keyboard state is set and container is visible
                setIsKeyboardOpen(true);
                setTimeout(() => {
                  if (inputContainerRef.current) {
                    inputContainerRef.current.scrollIntoView({ 
                      behavior: "smooth", 
                      block: "end",
                      inline: "nearest" 
                    });
                  }
                }, 150);
              }}
              style={{ fontSize: '16px' }}
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
                className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500"
                onChange={(e) => setBidText(e.target.value)}
                value={BidText}
                onFocus={(e) => {
                  // Ensure keyboard state is set and container is visible
                  setIsKeyboardOpen(true);
                  setTimeout(() => {
                    if (inputContainerRef.current) {
                      inputContainerRef.current.scrollIntoView({ 
                        behavior: "smooth", 
                        block: "end",
                        inline: "nearest" 
                      });
                    }
                  }, 150);
                }}
                style={{ fontSize: '16px' }}
              />
              <button
                onClick={handlePostSubmit}
                className=" text-white px-4 py-2 rounded-md hover:bg-teal-600 text-sm font-medium flex-shrink-0"
                style={buttonStyle}
              >
                Place
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add BottomNavbar - hide when keyboard is open */}
      {!isKeyboardOpen && <BottomNavbar isEmbedded />}
    </div>
  ) : (
    // Desktop layout
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center">
      {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="bg-white dark:bg-gray-900 w-full max-w-md h-full md:h-5/6 p-4 flex items-center shadow-lg overflow-hidden">
            <ImageSlider mediaUrls={post.mediaUrls} />
          </div>
        )}
      <div className="bg-white dark:bg-gray-800 w-full max-w-md h-full md:h-5/6 p-4 flex flex-col shadow-lg overflow-hidden">
        <div className="gap-2 mb-2 flex items-center">
          <img
            src={post.user.userImage || "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"}
            alt="User"
            className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-600 object-cover"
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
              className="text-lg font-semibold cursor-pointer dark:text-white"
            >
              {post.user.username}
            </h2>
          </button>
          {post.user.verified.email && post.user.verified.phoneNumber && (
            <BadgeCheck className="h-6 w-6 text-teal-400" />
          )}
          <button onClick={onClose} className="ml-auto">
            <X className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white cursor-pointer" />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="relative transform-gpu">
              <p
                ref={descriptionRef}
                className={`text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap transition-all duration-300 ${
                  showFullDescription ? "" : "line-clamp-4"
                }`}
              >
                {post.postDescription}
              </p>

              {isTruncated && (
                <button
                  onClick={() => setShowFullDescription(prev => !prev)}
                  className="text-sm mt-1 text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
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
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex-shrink-0">
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="  Bid"
                    autoComplete="off"
                    className="w-1/5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400"
                    onChange={(e) => setBidAmount(e.target.value)}
                    value={BidAmount}
                  />
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    autoComplete="off"
                    className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400"
                    onChange={(e) => setBidText(e.target.value)}
                    value={BidText}
                  />
                  <button
                    className=" text-white px-4 rounded-full hover:bg-teal-600 transition duration-200 cursor-pointer"
                    style={buttonStyle}
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