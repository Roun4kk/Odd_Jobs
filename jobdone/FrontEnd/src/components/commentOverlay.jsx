import { X, BadgeCheck } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import CommentSection from "./commentSection";
import useAuth from "../hooks/useAuth.jsx";
import ImageSlider from "./ImageSlider";
import { useNavigate } from "react-router-dom";
import useIsMobile from "../hooks/useIsMobile.js";
import useSocketRoomJoin from "../hooks/socketRoomJoin.js";
import socket from "../socket.js";

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
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  useSocketRoomJoin(user?._id, setSocketError);

  // More robust useEffect for handling the mobile keyboard (matching bidOverlay)
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

  const handleChange = (e) => {
    const value = e.target.value;
    setCommentText(value);
    if (replyingTo && !value.includes(`@${replyingTo}`)) {
      setReplyTo(null);
    }
  };

  const handlePostSubmit = async () => {
    if (!commentText.trim()) return;

    try {
      if (replyTo) {
        if (user._id !== post.user._id) {
          const message = `${username} replied: "${commentText}" to you on job post:`;
          await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/notify`, {
            userId: replyUserId,
            message: message,
            senderId: user._id,
            postId: post._id,
            type: "Reply",
            postDescription: post.postDescription,
          }, { withCredentials: true });
        }

        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts/comments/replies`, {
          postId: post._id,
          commentId: replyTo,
          replyText: commentText,
          username,
        });

        socket.emit("newReply", {
          postId: post._id,
          commentId: replyTo,
          replyText: commentText,
          user: {
            _id: user._id,
            username,
            verified: user.verified || {},
          },
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts/comments`, {
          postId: post._id,
          commentText,
          username,
        });

        if (user._id !== post.user._id) {
          const message = `${username} commented: "${commentText}" on your job post:`;
          await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/notify`, {
            userId: post.user._id,
            message: message,
            senderId: user._id,
            postId: post._id,
            type: "comment",
            postDescription: post.postDescription,
          }, { withCredentials: true });
        }

        socket.emit("newComment", {
          postId: post._id,
          commentText,
          user: {
            _id: user._id,
            username,
            verified: user.verified || {},
          },
        });
      }

      setReplyingTo(null);
      setReplyTo(null);
      setRefresh((prev) => !prev);
      setCommentText("");
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

          {/* 3. Input Bar: Stays fixed at the bottom */}
          {post?.status === "open" && (
            <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
              <div className="flex items-center justify-center gap-3">
                <input
                  type="text"
                  placeholder="Add comment..."
                  className="w-full border border-gray-300 rounded-md px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
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
      </div>
    );
  }

  // Original Desktop UI
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
            <BadgeCheck className="h-6 w-6 text-teal-400" />
          )}
          <button onClick={onClose} className="ml-auto">
            <X className="text-gray-600 hover:text-black cursor-pointer" />
          </button>
        </div>
        <p className="py-2">{post.postDescription}</p>
        <CommentSection
          postId={post._id}
          setReplyTo={setReplyTo}
          setReplyUserId={setReplyUserId}
          setReplyingTo={setReplyingTo}
          setCommentText={setCommentText}
          refresh={refresh}
        />

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a comment..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none"
            onChange={handleChange}
            value={commentText}
          />
          <button
            className="bg-teal-400 text-white px-4 rounded-full hover:bg-teal-600 transition duration-200 cursor-pointer"
            onClick={handlePostSubmit}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}

export default CommentOverlay;