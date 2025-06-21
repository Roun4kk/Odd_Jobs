// import { X , BadgeCheck, Reply} from "lucide-react";
// import { useEffect , useState } from "react";
// import axios from "axios";
// import CommentSection from "./commentSection";
// import useAuth from "../hooks/useAuth.jsx";
// import ImageSlider from "./ImageSlider";
// import { useNavigate } from "react-router-dom";
// function CommentOverlay({ post, onClose }) {
//     const [refresh, setRefresh] = useState(false);
//     const [commentText, setCommentText] = useState("");
//     const [replyTo, setReplyTo] = useState("");
//     const { username , user } = useAuth();
//     const [replyingTo, setReplyingTo] = useState("");
//     const navigate = useNavigate();
//     const [replyUserId , setReplyUserId] = useState("");
//     console.log("userID" , user._id);
//     useEffect(() => {
//         document.body.style.overflow = "hidden";
    
//         return () => {
//           document.body.style.overflow = "auto";
//         };
//     }, []);
//     const handleChange = (e) => {
//         const value = e.target.value;
//         setCommentText(value);
      
//         // If replyingTo is set but @username is removed, cancel reply
//         if (replyingTo && !value.includes(`@${replyingTo}`)) {
//           setReplyTo(null);
//         }
//       };
//   const handlePostSubmit = async () => {
//       if (!commentText.trim()) return;

//       try {
//           if (replyTo) {
//               // It's a reply - only notify the person being replied to
//               console.log("replyingTo", replyUserId);
//               console.log("reply to", replyTo);
              
//               if (user._id !== post.user._id ){const message = `${username} replied: "${commentText}" to you on job post:`;
//               await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/notify`, {
//                   userId: replyUserId,
//                   message: message,
//                   senderId: user._id,
//                   postId: post._id,
//                   type: "Reply",
//                   postDescription: post.postDescription,
//               },
//               {
//                 withCredentials: true
//               } );}
              
//               console.log("Replying to comment:", replyTo);
//               await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts/comments/replies`, {
//                   postId: post._id,
//                   commentId: replyTo,
//                   replyText: commentText,
//                   username,
//               });
//           } else {
//               // It's a normal comment - notify the post owner
//               await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts/comments`, {
//                   postId: post._id,
//                   commentText,
//                   username,
//               });
              
//               // Only notify post owner if it's not their own post
//               if (user._id !== post.user._id ) {
//                   const message = `${username} commented: "${commentText}" on your job post:`;
//                   await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/notify`, {
//                       userId: post.user._id,
//                       message: message,
//                       senderId: user._id,
//                       postId: post._id,
//                       type: "comment",
//                       postDescription: post.postDescription,
//                   },
//                   {
//                     withCredentials: true
//                   } );
//               }
//           }

//           setReplyingTo(null);
//           setReplyTo(null);
//           setRefresh((prev) => !prev);
//           setCommentText("");
//       } catch (error) {
//           console.error("Error posting comment:", error);
//       }
//   };
//   return (
//     <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center">
//         <div className="bg-white w-full max-w-md h-full md:h-5/6 p-4 flex items-center shadow-lg overflow-hidden">
//             {post.mediaUrls && post.mediaUrls.length > 0 && (
//               <ImageSlider mediaUrls={post.mediaUrls} />
//             )}
//         </div>
//       <div className="bg-white w-full max-w-md h-full md:h-5/6 p-4 flex flex-col shadow-lg overflow-hidden">
//         <div className="flex gap-2 mb-2 flex items-center">
//         <img src={post.user.userImage || "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"} alt="User" className="w-12 h-12 rounded-full border-2 border-white object-cover"/>
//           <button>
//             <h2 onClick={() => {
//                     if (user._id === post.user._id) {
//                       navigate(`/profile`); 
//                     } else {
//                       navigate(`/profile/${post.user._id}`); 
//                     }
//                   }}className="text-lg font-semibold ">{post.user.username}</h2>
//           </button>
//           {post.user.verified.email && post.user.verified.phoneNumber && (
//             <BadgeCheck className="h-6 w-6 text-teal-400" />
//           )}
//           <button onClick={onClose} className="ml-auto">
//             <X className="text-gray-600 hover:text-black cursor-pointer " />
//           </button>
//         </div>
//         <p className="py-2">{post.postDescription}</p>
//         <CommentSection postId={post._id} setReplyTo={setReplyTo} setReplyUserId ={setReplyUserId} setReplyingTo={setReplyingTo} setCommentText={setCommentText} refresh={refresh} />

//         <div className="flex gap-2">
//           <input
//             type="text"
//             placeholder="Add a comment..."
//             className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none"
//             onChange={handleChange}
//             value={commentText}
//           />
//           <button className="bg-teal-400 text-white px-4 rounded-full hover:bg-teal-600 transition duration-200 cursor-pointer" onClick={handlePostSubmit}>Post</button>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default CommentOverlay;
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
  useSocketRoomJoin(user?._id, setSocketError);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    
    // Mobile keyboard detection
    if (isMobile) {
      let initialViewportHeight = window.innerHeight;
      
      const handleResize = () => {
        const currentHeight = window.innerHeight;
        const heightDifference = initialViewportHeight - currentHeight;
        
        // Keyboard is considered visible if height decreased by more than 150px
        setIsKeyboardVisible(heightDifference > 150);
      };

      const handleVisualViewportResize = () => {
        if (window.visualViewport) {
          const currentHeight = window.visualViewport.height;
          const heightDifference = initialViewportHeight - currentHeight;
          setIsKeyboardVisible(heightDifference > 150);
        }
      };

      // Use both methods for better compatibility
      window.addEventListener('resize', handleResize);
      
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleVisualViewportResize);
      }

      return () => {
        document.body.style.overflow = "auto";
        window.removeEventListener('resize', handleResize);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
        }
      };
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobile]);

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
    return (
      <div className="fixed inset-0 z-60 bg-black/50 flex flex-col">
        {/* Header - Fixed at top */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white flex-shrink-0">
          <img 
            src={post.user.userImage || "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"} 
            alt="User" 
            className="w-10 h-10 rounded-full border-2 border-gray-200 object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 
                onClick={() => {
                  if (user._id === post.user._id) {
                    navigate(`/profile`); 
                  } else {
                    navigate(`/profile/${post.user._id}`); 
                  }
                }} 
                className="text-lg font-semibold cursor-pointer truncate"
              >
                {post.user.username}
              </h2>
              {post.user.verified.email && post.user.verified.phoneNumber && (
                <BadgeCheck className="h-5 w-5 text-teal-400 flex-shrink-0" />
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0">
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Scrollable Content Area - Takes remaining space */}
        <div 
          className="flex-1 overflow-y-auto bg-white"
          style={{
            height: isKeyboardVisible 
              ? `${(window.visualViewport?.height || window.innerHeight) - 200}px` // Reserve space for header + input bar
              : 'calc(100vh - 80px - 160px)' // 80px header + 160px input area
          }}
        >
          {/* Post Description */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-gray-800 leading-relaxed">{post.postDescription}</p>
          </div>

          {/* Comment Section - This will scroll if too long */}
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

        {/* Input Bar - Always fixed at bottom */}
        {post?.status === "open" && (
          <div 
            className={`bg-white border-t border-gray-200 transition-transform duration-300 ease-in-out w-full flex-shrink-0 ${
              isKeyboardVisible 
                ? 'fixed bottom-0 left-0 right-0 z-50' 
                : 'relative'
            }`}
            style={{
              transform: isKeyboardVisible 
                ? `translateY(-${window.visualViewport ? (window.innerHeight - window.visualViewport.height) : 0}px)` 
                : 'none',
              maxWidth: '100vw'
            }}
          >
            <div className="px-3 py-4 space-y-3 bg-white w-full max-w-full">
              <div className="flex items-end gap-2 w-full">
                <input
                  type="text"
                  placeholder="Add comment..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-base min-w-0"
                  onChange={handleChange}
                  value={commentText}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setTimeout(() => setInputFocused(false), 200)}
                />
                <button 
                  className="bg-teal-500 text-white px-4 py-3 rounded-lg hover:bg-teal-600 transition duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap flex-shrink-0" 
                  onClick={handlePostSubmit}
                  disabled={!commentText.trim()}
                >
                  Post
                </button>
              </div>
            </div>

            {/* Safe area for home indicator on newer iPhones */}
            <div className="h-4 bg-white w-full" />
          </div>
        )}
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