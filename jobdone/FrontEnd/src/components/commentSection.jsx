import { useEffect, useState , useCallback} from "react";
import { BadgeCheck } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.jsx";

function CommentSection({ postId, refresh, setCommentText, setReplyTo, setReplyingTo , setReplyUserId }) {
  const [comments, setComments] = useState([]);
  const [showRepliesFor, setShowRepliesFor] = useState({}); 
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading , setLoading] = useState(true);

  const eventHandler = (word) => async () => {
    const username = word.replace(/^@/, "");
    try {
      const res = await axios.get(`/user/username/${username}`);
      const targetUser = res.data;
  
      if (user._id === targetUser._id) {
        navigate("/profile");
      } else {
        navigate(`/profile/${targetUser._id}`);
      }
    } catch (err) {
      console.error("User fetch failed:", err.response?.data || err.message);
    }
  }

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const response = await axios.get("/posts/comments", { params: { postId } });
        setComments(response.data || []);
        console.log("Comments fetched:", comments);
      } catch (error) {
        console.error("Error fetching post:", error);
      }
      
      setLoading(false);
    };
    fetchPost();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-12 h-12 border-4 border-teal-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 overflow-y-auto space-y-2 mb-4">
      {comments.map((comment, index) => (
        <div key={index} className="bg-gray-100 p-2 rounded-lg">
          <div className="flex gap-2 mb-2 flex items-center">
            <button onClick={() => {
                    if (user._id === comment.user._id) {
                      navigate(`/profile`); 
                    } else {
                      navigate(`/profile/${comment.user._id}`); 
                    }
                  }}className="font-semibold cursor-pointer">
              {comment.user.username}
            </button>
            {comment?.user?.verified?.email && comment?.user?.verified?.phoneNumber && (
                    <BadgeCheck className="h-5 w-5 text-teal-400" />
                  )}
          </div>
          <p>{comment.commentText}</p>

          <button
            className="text-gray-500 cursor-pointer mt-1"
            onClick={() => {
              setReplyTo(comment._id); 
              setReplyingTo(comment.user.username);
              setCommentText(`@${comment.user.username} `);
              setReplyUserId (comment.user._id);
            }}
          >
            Reply
          </button>

          {/* View Replies Toggle */}
          {comment.replies?.length > 0 && (
            <div>
              <button
                className="text-sm text-gray-500 cursor-pointer mt-1"
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

              {/* Render Replies if opened */}
              {showRepliesFor[comment._id] && (
                <div className="ml-4 mt-2 space-y-1">
                  {comment.replies.map((reply, idx) => (
                    <div key={idx} className="bg-white p-2 rounded shadow-sm">
                      <div className="flex gap-2 mb-2 flex items-center">
                        <button onClick={() => {
                            if (user._id === reply.user._id) {
                              navigate(`/profile`); 
                            } else {
                              navigate(`/profile/${reply.user._id}`); 
                            }
                          }}className="font-semibold cursor-pointer">
                          {reply.user.username}
                        </button>
                        {reply?.user?.verified?.email && reply?.user?.verified?.phoneNumber && (
                                <BadgeCheck className="h-5 w-5 text-teal-400" />
                              )}
                      </div>
                      <p className="text-sm">
                        {reply.replyText.split(" ").map((word, i) => {
                          if (word.startsWith("@")) {
                            return (
                              <button
                                key={i}
                                onClick={eventHandler(word)}
                                className="font-semibold cursor-pointer"
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
                        className="text-gray-500 cursor-pointer mt-1"
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
      ))}
    </div>
  );
}

export default CommentSection;
