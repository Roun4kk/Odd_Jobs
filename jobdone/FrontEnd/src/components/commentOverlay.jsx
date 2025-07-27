import { X, BadgeCheck } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { createPortal } from "react-dom";
import CommentSection from "./commentSection";
import useAuth from "../hooks/useAuth.jsx";
import ImageSlider from "./ImageSlider";
import { useNavigate } from "react-router-dom";
import useIsMobile from "../hooks/useIsMobile.js";
import useSocketRoomJoin from "../hooks/socketRoomJoin.js";
import socket from "../socket.js";
import toast from "react-hot-toast";
import BottomNavbar from "../bottomNavBar.jsx";
import { useTheme } from "../ThemeContext"; // Import useTheme

function CommentOverlay({ post, onClose }) {
  const [refresh, setRefresh] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const { username, user } = useAuth();
  const [replyingTo, setReplyingTo] = useState("");
  const navigate = useNavigate();
  const [replyUserId, setReplyUserId] = useState("");
  const isMobile = useIsMobile();
  const [socketError, setSocketError] = useState(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false); // Add keyboard state
  const descriptionRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputContainerRef = useRef(null);
  const activeElementRef = useRef(null);
  const savedScrollPosition = useRef(0);
  const lastViewportHeight = useRef(0);
  const initialViewportHeight = useRef(0); // Store initial height
  const { theme } = useTheme(); // Get current theme

  const buttonStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
      : '#2dd4bf' // This is the hex code for teal-400
  };

  useSocketRoomJoin(user?._id, setSocketError);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  useEffect(() => {
    const el = descriptionRef.current;
    if (el && el.scrollHeight > el.clientHeight) {
      setIsTruncated(true);
    }
  }, [post.postDescription, showFullDescription]);

  // Enhanced keyboard handling logic
  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!isMobile || !visualViewport) return;

    // Store initial viewport height
    initialViewportHeight.current = visualViewport.height;
    lastViewportHeight.current = visualViewport.height;

    const handleFocusIn = (e) => {
      const target = e.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        activeElementRef.current = target;
        if (scrollContainerRef.current) {
          savedScrollPosition.current = scrollContainerRef.current.scrollTop;
        }
      }
    };

    const handleFocusOut = () => {
      activeElementRef.current = null;
      // Reset keyboard state when focus is lost
      setTimeout(() => {
        if (!activeElementRef.current) {
          setIsKeyboardOpen(false);
        }
      }, 100);
    };

    const handleViewportResize = () => {
      const currentHeight = visualViewport.height;
      const heightDifference = initialViewportHeight.current - currentHeight;
      
      // More sensitive keyboard detection - consider keyboard open if height reduced by more than 50px
      const keyboardThreshold = 50;
      const isKeyboardCurrentlyOpen = heightDifference > keyboardThreshold;
      
      setIsKeyboardOpen(isKeyboardCurrentlyOpen);

      if (!activeElementRef.current) return;
      
      const heightChange = currentHeight - lastViewportHeight.current;

      if (heightChange < -keyboardThreshold) {
        setTimeout(() => {
          if (activeElementRef.current && inputContainerRef.current) {
            inputContainerRef.current.scrollIntoView({
              behavior: "smooth",
              block: "end",
              inline: "nearest",
            });
            setTimeout(() => {
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = savedScrollPosition.current;
              }
            }, 300);
          }
        }, 100);

      } else if (heightChange > keyboardThreshold) {
        if (activeElementRef.current) {
          activeElementRef.current.blur();
        }
      }

      lastViewportHeight.current = currentHeight;
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    visualViewport.addEventListener("resize", handleViewportResize);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      visualViewport.removeEventListener("resize", handleViewportResize);
    };
  }, [isMobile]);

  const handleChange = (e) => {
    const value = e.target.value;
    setCommentText(value);
    if (replyingTo && !value.includes(`@${replyingTo}`)) {
      setReplyTo(null);
      setReplyingTo(null);
      setReplyUserId("");
    }
  };

  const handlePostSubmit = async () => {
    if (document.activeElement) document.activeElement.blur();

    if (!commentText.trim()) return;

    const originalCommentText = commentText;
    setCommentText("");
    setReplyingTo(null);
    setReplyTo(null);
    setReplyUserId("");

    try {
      if (replyTo) {
        const replyResponse = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts/comments/replies`, {
          postId: post._id,
          commentId: replyTo,
          replyText: originalCommentText,
          username,
        });

        const replyId = replyResponse.data.replyId;

        if (user._id !== post.user._id) {
          await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/notify`, {
            userId: replyUserId,
            senderId: user._id,
            postId: post._id,
            type: "Reply",
            replyId: replyId,
            postDescription: post.postDescription,
          }, { withCredentials: true });
        }

        socket.emit("newReply", {
          postId: post._id,
          commentId: replyTo,
          replyText: originalCommentText,
          user: {
            _id: user._id,
            username,
            verified: user.verified || {},
          },
        });

      } else {
        const commentRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts/comments`, {
          postId: post._id,
          commentText: originalCommentText,
          username,
        });

        const commentId = commentRes.data.commentId;

        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/notify`, {
          userId: post.user._id,
          senderId: user._id,
          postId: post._id,
          type: "comment",
          commentId,
          postDescription: post.postDescription,
        }, { withCredentials: true });

        socket.emit("newComment", {
          postId: post._id,
          commentText: originalCommentText,
          user: {
            _id: user._id,
            username,
            verified: user.verified || {},
          },
        });
      }

      setRefresh((prev) => !prev);
    } catch (error) {
      console.error("Error posting comment:", error);
      setCommentText(originalCommentText);
      toast.error("Failed to post comment.");
    }
  };

  const handleProfileNavigation = (userId) => {
    if (user._id === userId) {
      navigate(`/profile`);
    } else {
      navigate(`/profile/${userId}`);
    }
  };

  const handleClose = () => {
    onClose();
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
          onClick={() => handleProfileNavigation(post.user._id)}
          className="text-base font-semibold max-w-[190px] truncate dark:text-white"
        >
          {post.user.username}
        </button>
        {post.user.verified.email && post.user.verified.phoneNumber && (
          <BadgeCheck className="h-5 w-5 text-teal-400" />
        )}
        <button onClick={handleClose} className="ml-auto">
          <X className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* Main Content Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
        {/* Post Description */}
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

        {/* Comment Section */}
        <div className="p-4">
          <CommentSection
            postId={post._id}
            setReplyTo={setReplyTo}
            setReplyUserId={setReplyUserId}
            setReplyingTo={setReplyingTo}
            setCommentText={setCommentText}
            refresh={refresh}
          />
        </div>
      </div>
      
      {/* Input Bar */}
      {post?.status === "open" && (
        <div
          ref={inputContainerRef}
          className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0"
        >
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Add comment..."
              className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400"
              onChange={handleChange}
              value={commentText}
            />
            <button
              onClick={handlePostSubmit}
              className=" text-white px-4 py-2 rounded-md hover:bg-teal-600 text-sm font-medium"
              style={buttonStyle}
              disabled={!commentText.trim()}
            >
              Post
            </button>
          </div>
        </div>
      )}
      {/* Conditionally render BottomNavbar - hide when keyboard is open */}
      {!isKeyboardOpen && <BottomNavbar isEmbedded />}
    </div>
  ) : (
    // Desktop layout remains unchanged
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
              onClick={() => handleProfileNavigation(post.user._id)}
              className="text-lg font-semibold cursor-pointer max-w-[250px] truncate dark:text-white"
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
              <CommentSection
                postId={post._id}
                setReplyTo={setReplyTo}
                setReplyUserId={setReplyUserId}
                setReplyingTo={setReplyingTo}
                setCommentText={setCommentText}
                refresh={refresh}
              />
            </div>
          </div>
          {post?.status === "open" && (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400"
                  onChange={handleChange}
                  value={commentText}
                />
                <button
                  className=" text-white px-4 rounded-full hover:bg-teal-600 transition duration-200 cursor-pointer"
                  style={buttonStyle}
                  onClick={handlePostSubmit}
                  disabled={!commentText.trim()}
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(overlayContent, document.body);
}

export default CommentOverlay;