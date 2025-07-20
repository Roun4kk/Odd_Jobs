import { useEffect, useState, useCallback } from "react";
import { BadgeCheck } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.jsx";
import useSocketRoomJoin from "../hooks/socketRoomJoin.js";
import socket from "../socket.js";

function CommentSection({ postId, refresh, setCommentText, setReplyTo, setReplyingTo, setReplyUserId }) {
  const [comments, setComments] = useState([]);
  const [showRepliesFor, setShowRepliesFor] = useState({});
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [socketError, setSocketError] = useState(null);
  useSocketRoomJoin(user?._id, setSocketError);

  const eventHandler = (word) => async () => {
    const username = word.replace(/^@/, "");
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/user/username/${username}`);
      const targetUser = res.data;

      if (user._id === targetUser._id) {
        navigate("/profile");
      } else {
        navigate(`/profile/${targetUser._id}`);
      }
    } catch (err) {
      console.error("User fetch failed:", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/posts/comments`, { params: { postId } });
        setComments(response.data || []);
      } catch (error) {
        console.error("Error fetching post:", error);
      }
      setLoading(false);
    };
    fetchPost();
  }, [refresh, postId]);

  useEffect(() => {
    const handleNewComment = (commentData) => {
      if (commentData.postId === postId) {
        setComments((prev) => [...prev, commentData]);
      }
    };

    const handleNewReply = (replyData) => {
      if (replyData.postId === postId) {
        setComments((prev) =>
          prev.map((comment) =>
            comment._id === replyData.commentId
              ? { ...comment, replies: [...(comment.replies || []), replyData] }
              : comment
          )
        );
      }
    };

    socket.on("receiveNewComment", handleNewComment);
    socket.on("receiveNewReply", handleNewReply);

    return () => {
      socket.off("receiveNewComment", handleNewComment);
      socket.off("receiveNewReply", handleNewReply);
    };
  }, [postId]);

  // ✅ CORRECTED Loading State: Removed layout-breaking classes.
  if (loading) {
    return (
        <div className="p-4 space-y-3 flex-1 overflow-y-auto animate-pulse">
           {[...Array(3)].map((_, i) => (
             <div key={i} className="p-3 rounded-xl bg-gray-100 space-y-2">
               <div className="flex items-center gap-2">
                 <div className="w-4/6 h-4 bg-gray-300 rounded" />
                 <div className="w-10 h-4 bg-gray-300 rounded ml-auto" />
               </div>
               <div className="h-3 bg-gray-300 rounded w-5/6" />
             </div>
           ))}
         </div>
    );
  }

  // ✅ CORRECTED Main Return: Removed flex-1 and overflow-y-auto. This is now a simple container.
  return (
    <div className="w-full" style={{ scrollBehavior: 'auto' }}>
      {/* Comments List */}
      <div className="space-y-2">
        {comments.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment, index) => (
            <div key={index} className="bg-gray-100 p-3 rounded-xl shadow-sm transform-gpu">
              <div className="flex gap-2 mb-2 items-center">
                <button
                  onClick={() => {
                    if (user._id === comment.user._id) {
                      navigate(`/profile`);
                    } else {
                      navigate(`/profile/${comment.user._id}`);
                    }
                  }}
                  className="font-semibold text-black cursor-pointer max-w-[200px] md:max-w-[250px] truncate"
                >
                  {comment.user.username}
                </button>
                {comment?.user?.verified?.email && comment?.user?.verified?.phoneNumber && (
                  <BadgeCheck className="h-5 w-5 text-teal-400" />
                )}
              </div>
              <p className="text-gray-800 mb-2">{comment.commentText}</p>

              <button
                className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer transition-colors duration-200"
                onClick={() => {
                  setReplyTo(comment._id);
                  setReplyingTo(comment.user.username);
                  setCommentText(`@${comment.user.username} `);
                  setReplyUserId(comment.user._id);
                }}
              >
                Reply
              </button>

              {comment.replies?.length > 0 && (
                <div className="mt-2">
                  <button
                    className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer transition-colors duration-200"
                    onClick={() =>
                      setShowRepliesFor((prev) => ({
                        ...prev,
                        [comment._id]: !prev[comment._id],
                      }))
                    }
                  >
                    {showRepliesFor[comment._id]
                      ? "--- Hide replies"
                      : `--- View replies (${comment.replies.length})`}
                  </button>

                  {showRepliesFor[comment._id] && (
                    <div className="ml-4 mt-2 space-y-2">
                      {comment.replies.map((reply, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg shadow-sm">
                          <div className="flex gap-2 mb-2 items-center">
                            <button
                              onClick={() => {
                                if (user._id === reply.user._id) {
                                  navigate(`/profile`);
                                } else {
                                  navigate(`/profile/${reply.user._id}`);
                                }
                              }}
                              className="font-semibold text-black cursor-pointer max-w-[180px] md:max-w-[250px] truncate"
                            >
                              {reply.user.username}
                            </button>
                            {reply?.user?.verified?.email && reply?.user?.verified?.phoneNumber && (
                              <BadgeCheck className="h-5 w-5 text-black" />
                            )}
                          </div>
                          <p className="text-gray-800 mb-2">
                            {reply.replyText.split(" ").map((word, i) => {
                              if (word.startsWith("@")) {
                                return (
                                  <button
                                    key={i}
                                    onClick={eventHandler(word)}
                                    className="font-semibold text-black cursor-pointer"
                                  >
                                    {word}
                                  </button>
                                );
                              } else {
                                return <span key={i}> {word} </span>;
                              }
                            })}
                          </p>
                          <button
                            className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer transition-colors duration-200"
                            onClick={() => {
                              setReplyTo(comment._id);
                              setReplyingTo(reply.user.username);
                              setCommentText(`@${reply.user.username} `);
                              setReplyUserId(reply.user._id);
                            }}
                          >
                            Reply
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CommentSection;