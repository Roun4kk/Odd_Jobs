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
  const descriptionRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputContainerRef = useRef(null);
  const activeElementRef = useRef(null);
  const savedScrollPosition = useRef(0);
  const lastViewportHeight = useRef(0);
  useSocketRoomJoin(user?._id, setSocketError);
  useEffect(() => {
    // When the overlay mounts, disable scrolling on the body.
    document.body.style.overflow = "hidden";

    // When the component unmounts, re-enable scrolling.
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

  // ✅✅✅ FIXED: More robust mobile input handling that tracks resize direction.
  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!isMobile || !visualViewport) return;

    // Initialize the last known height when the component mounts.
    lastViewportHeight.current = visualViewport.height;

    const handleFocusIn = (e) => {
      const target = e.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        activeElementRef.current = target;
        // Save the current scroll position right when an input is focused.
        if (scrollContainerRef.current) {
          savedScrollPosition.current = scrollContainerRef.current.scrollTop;
        }
      }
    };

    const handleFocusOut = () => {
      // Clear the active element reference when it's blurred for any reason.
      activeElementRef.current = null;
    };

    const handleViewportResize = () => {
      if (!activeElementRef.current) return;
      
      const currentHeight = visualViewport.height;
      const heightDifference = currentHeight - lastViewportHeight.current;
      // Use a threshold to avoid reacting to minor, non-keyboard resizes.
      const keyboardThreshold = 100;

      if (heightDifference < -keyboardThreshold) {
        // Viewport SHRANK significantly: Keyboard is APPEARING.
        // Run the logic to ensure the input is visible.
        setTimeout(() => {
          if (activeElementRef.current && inputContainerRef.current) {
            inputContainerRef.current.scrollIntoView({
              behavior: "smooth",
              block: "end",
              inline: "nearest",
            });
            // Restore the main content's scroll position.
            setTimeout(() => {
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = savedScrollPosition.current;
              }
            }, 300);
          }
        }, 100);

      } else if (heightDifference > keyboardThreshold) {
        // Viewport GREW significantly: Keyboard is HIDING.
        // Deselect (blur) the input. This is the fix.
        if (activeElementRef.current) {
          activeElementRef.current.blur();
        }
      }

      // ALWAYS update the last known height for the next resize event.
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
    // Blur active input to hide keyboard on submission
    if (document.activeElement) document.activeElement.blur();
    
    if (!commentText.trim()) return;

    const originalCommentText = commentText;
    setCommentText("");
    setReplyingTo(null);
    setReplyTo(null);
    setReplyUserId("");

    try {
      if (replyTo) {
        if (user._id !== post.user._id) {
          const message = `${username} replied: "${originalCommentText}" to you on job post:`;
          await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/notify`, {
            userId: replyUserId,
            message,
            senderId: user._id,
            postId: post._id,
            type: "Reply",
            postDescription: post.postDescription,
          }, { withCredentials: true });
        }

        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts/comments/replies`, {
          postId: post._id,
          commentId: replyTo,
          replyText: originalCommentText,
          username,
        });

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
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts/comments`, {
          postId: post._id,
          commentText: originalCommentText,
          username,
        });

        if (user._id !== post.user._id) {
          const message = `${username} commented: "${originalCommentText}" on your job post:`;
          await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/notify`, {
            userId: post.user._id,
            message,
            senderId: user._id,
            postId: post._id,
            type: "comment",
            postDescription: post.postDescription,
          }, { withCredentials: true });
        }

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

  // ✅✅✅ ROBUST MOBILE LAYOUT FIX ✅✅✅
  const overlayContent = isMobile ? (
    // This is the main frame. `h-dvh` makes it shrink when the keyboard appears.
    // `flex-col` arranges its children (header, content, footer) vertically.
    <div className="fixed inset-0 z-50 bg-white flex flex-col h-dvh">
      {/* Header: This part does not grow or shrink. */}
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
          className="text-base font-semibold max-w-[190px] truncate"
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

      {/* Main Content Area: This is the ONLY scrollable part.
          - `flex-1`: Takes up all available vertical space.
          - `overflow-y-auto`: Makes ONLY this div scrollable.
          - `min-h-0`: Crucial fix. Allows the flex item to shrink below its content size, preventing layout overflow.
      */}
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
      
      {/* Input Bar (Footer): This part does not grow or shrink. */}
      {post?.status === "open" && (
        <div
          ref={inputContainerRef}
          className="bg-white border-t border-gray-200 p-4 flex-shrink-0"
        >
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Add comment..."
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
              onChange={handleChange}
              value={commentText}
            />
            <button
              onClick={handlePostSubmit}
              className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600 text-sm font-medium"
              disabled={!commentText.trim()}
            >
              Post
            </button>
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
              className="text-lg font-semibold cursor-pointer max-w-[250px] truncate"
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
            <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  onChange={handleChange}
                  value={commentText}
                />
                <button
                  className="bg-teal-400 text-white px-4 rounded-full hover:bg-teal-600 transition duration-200 cursor-pointer"
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