import { X, BadgeCheck, Reply } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import CommentSection from "./commentSection";
import useAuth from "../hooks/useAuth.jsx";
import ImageSlider from "./ImageSlider";
import { useNavigate } from "react-router-dom";
import useIsMobile from "../hooks/useIsMobile.js";

function CommentOverlay({ post, onClose }) {
  const [refresh, setRefresh] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const { username, user } = useAuth();
  const [replyingTo, setReplyingTo] = useState("");
  const navigate = useNavigate();
  const [replyUserId, setReplyUserId] = useState("");
  const isMobile = useIsMobile();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

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
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <div className="flex flex-col overflow-hidden relative" style={{ height: 'calc(100vh - 4rem)' }}>
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

            {/* Comment section with padding to prevent overlap with input bar */}
            <div className="px-4 py-2 flex-1 pb-24">
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

          {/* Comment input section - absolute positioned at bottom */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-gray-300 p-4 bg-white">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Add a comment..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                onChange={handleChange}
                value={commentText}
              />
              <button
                onClick={handlePostSubmit}
                className="bg-teal-500 text-white px-4 py-2 rounded-full hover:bg-teal-600 transition text-sm font-medium min-w-[60px]"
              >
                Post
              </button>
            </div>
          </div>
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
          <div className="flex items-center gap-2 mb-2">
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
    </div>
  );
}

export default CommentOverlay;