import { X , BadgeCheck, Reply} from "lucide-react";
import { useEffect , useState } from "react";
import axios from "axios";
import CommentSection from "./commentSection";
import useAuth from "../hooks/useAuth.jsx";
import ImageSlider from "./ImageSlider";
import { useNavigate } from "react-router-dom";
function CommentOverlay({ post, onClose }) {
    const [refresh, setRefresh] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [replyTo, setReplyTo] = useState("");
    const { username , user } = useAuth();
    const [replyingTo, setReplyingTo] = useState("");
    const navigate = useNavigate();
    const [replyUserId , setReplyUserId] = useState("");
    console.log("userID" , user._id);
    useEffect(() => {
        document.body.style.overflow = "hidden";
    
        return () => {
          document.body.style.overflow = "auto";
        };
    }, []);
    const handleChange = (e) => {
        const value = e.target.value;
        setCommentText(value);
      
        // If replyingTo is set but @username is removed, cancel reply
        if (replyingTo && !value.includes(`@${replyingTo}`)) {
          setReplyTo(null);
        }
      };
  const handlePostSubmit = async () => {
      if (!commentText.trim()) return;

      try {
          if (replyTo) {
              // It's a reply - only notify the person being replied to
              console.log("replyingTo", replyUserId);
              console.log("reply to", replyTo);
              
              if (user._id !== post.user._id ){const message = `${username} replied: "${commentText}" to you on job post:`;
              await axios.post('/api/notify', {
                  userId: replyUserId,
                  message: message,
                  senderId: user._id,
                  postId: post._id,
                  type: "Reply",
                  postDescription: post.postDescription,
              });}
              
              console.log("Replying to comment:", replyTo);
              await axios.post("/posts/comments/replies", {
                  postId: post._id,
                  commentId: replyTo,
                  replyText: commentText,
                  username,
              });
          } else {
              // It's a normal comment - notify the post owner
              await axios.post("/posts/comments", {
                  postId: post._id,
                  commentText,
                  username,
              });
              
              // Only notify post owner if it's not their own post
              if (user._id !== post.user._id ) {
                  const message = `${username} commented: "${commentText}" on your job post:`;
                  await axios.post('/api/notify', {
                      userId: post.user._id,
                      message: message,
                      senderId: user._id,
                      postId: post._id,
                      type: "comment",
                      postDescription: post.postDescription,
                  });
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
                  }}className="text-lg font-semibold ">{post.user.username}</h2>
          </button>
          {post.user.verified.email && post.user.verified.phoneNumber && (
            <BadgeCheck className="h-6 w-6 text-teal-400" />
          )}
          <button onClick={onClose} className="ml-auto">
            <X className="text-gray-600 hover:text-black cursor-pointer " />
          </button>
        </div>
        <p className="py-2">{post.postDescription}</p>
        <CommentSection postId={post._id} setReplyTo={setReplyTo} setReplyUserId ={setReplyUserId} setReplyingTo={setReplyingTo} setCommentText={setCommentText} refresh={refresh} />

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a comment..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none"
            onChange={handleChange}
            value={commentText}
          />
          <button className="bg-teal-400 text-white px-4 rounded-full hover:bg-teal-600 transition duration-200 cursor-pointer" onClick={handlePostSubmit}>Post</button>
        </div>
      </div>
    </div>
  );
}

export default CommentOverlay;