import { useEffect, useState } from "react";
import axios from "axios";
import { Gavel, MessageCircle, Send, BadgeCheck, Bookmark } from "lucide-react";
import CommentOverlay from "./commentOverlay";
import BidOverlay from "./bidOverlay";
import ImageSlider from "./ImageSlider";
import useAuth from "../hooks/useAuth.jsx";
import { useNavigate } from "react-router-dom";

function JobFeed({ refreshFlag, refresh }) {
const [topBids, setTopBids] = useState({});
const [dropdownPostId, setDropdownPostId] = useState(null);
const [activeCommentPost, setActiveCommentPost] = useState(null);
const [activeBidPost, setActiveBidPost] = useState(null);
const [posts, setPosts] = useState([]);
const [sortByMap, setSortByMap] = useState({});
const { user , updateUser } = useAuth();
const navigate = useNavigate();

const fetchTopBids = async (posts) => {
const newTopBids = {};
for (const post of posts) {
try {
const res = await axios.get("/posts/topbid", {
params: { postId: post._id, sortBy: sortByMap[post._id] || "1" },
});
newTopBids[post._id] = res.data;
} catch (err) {
newTopBids[post._id] = null;
}
}
setTopBids(newTopBids);
};

const toggleSavePost = async (postId) => {
try {
// Check if the post is already saved
const response = await axios.get(`/users/savedPosts/${user._id}`);
const savedPosts = response.data;
  const isAlreadySaved = savedPosts.includes(postId);
  if (isAlreadySaved) {
    const resp = await axios.delete("/posts/unsave", { data: { postId, userId: user._id } });
    const updatedUser = { ...user, savedPosts: savedPosts.filter(id => id !== postId) }; // Update user saved posts
    updateUser(updatedUser); // Update auth context
    localStorage.setItem("user", JSON.stringify(updatedUser)); // Persist changes
  } else {
    // Save post
    const resp = await axios.post("/posts/save", { postId, userId: user._id });
    const updatedUser = { ...user, savedPosts: [...savedPosts, postId] }; // Add to saved posts
    updateUser(updatedUser); // Update auth context
    localStorage.setItem("user", JSON.stringify(updatedUser)); // Persist changes
  }

  // Re-fetch saved posts and refresh the feed
  refresh(); // To trigger feed re-fetch
} catch (error) {
  console.error("Error saving/unsaving post:", error);
}

};

useEffect(() => {
const fetchData = async () => {
try {
const response = await axios.get("/posts");
console.log(" posts" ,response.data);
setPosts(response.data);
await fetchTopBids(response.data);
} catch (error) {
console.error(error.response ? error.response.data : { message: "Network error" });
}
};

fetchData();

},[refreshFlag]);

return ( <div className="w-3/4 mt-4 space-y-4">
{posts.length === 0 ? ( <p className="text-gray-500 text-center">No job posts yet.</p>
) : (
posts.map((post, index) => {
const shouldBlur =
!(
user._id === post.user._id ||
(topBids[post._id] && user._id === topBids[post._id].user._id)
);

      return (
        <div key={index} className="bg-white p-4 rounded-md shadow-md flex flex-col gap-2">
          <div className="flex gap-2 items-center mb-2">
            <img
              src={post.user.userImage || "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"}
              alt="User"
              className="w-12 h-12 rounded-full border-2 border-white object-cover"
            />
            <button onClick={() => {
                if (user._id === post.user._id) {
                  navigate(`/profile`); // Navigate to the user's profile
                } else {
                  navigate(`/profile/${post.user._id}`); // Navigate to the post's user's profile
                }
              }} className="flex items-center text-lg font-semibold cursor-pointer">
              {post.user.username}
            </button>
            {post.user.verified.email && post.user.verified.phoneNumber && (
              <BadgeCheck className="h-6 w-6 text-teal-400" />
            )}
            <div className="flex items-center ml-auto">
              <button
                onClick={() => toggleSavePost(post._id)}
                className="flex items-center text-black cursor-pointer mr-4"
              >
                {user.savedPosts && user.savedPosts.includes(post._id) ? (
                  <Bookmark size={24} className="text-teal-400 fill-teal-400" /> // Use filled icon style by default
                ) : (
                  <Bookmark size={24} className="text-gray-400" />
                )}
              </button>
            </div>
          </div>
          <p>{post.postDescription}</p>

          {/* Image Slider */}
          {post.mediaUrls && post.mediaUrls.length > 0 && <ImageSlider mediaUrls={post.mediaUrls} />}
          <div className="flex items-center">
            <button className="flex items-center text-black cursor-pointer mr-4" onClick={() => setActiveBidPost(post)}>
              <Gavel size={24} />
            </button>
            <button className="flex items-center text-black cursor-pointer mr-4" onClick={() => setActiveCommentPost(post)}>
              <MessageCircle size={24} />
            </button>
            <button className="flex items-center text-black cursor-pointer">
              <Send className="rotate-[19deg]" size={24} />
            </button>
            <div className="relative ml-auto">
              <button
                onClick={() => setDropdownPostId(dropdownPostId === post._id ? null : post._id)}
                className="flex items-center px-3 py-1 border rounded-md bg-white text-sm shadow-sm hover:bg-gray-50 cursor-pointer"
              >
                Sort Bids
                <svg className="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownPostId === post._id && (
                <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded-md shadow-lg z-10 ">
                  <ul className="py-1 text-sm text-gray-700">
                    <li>
                      <button
                        onClick={() => {
                          setSortByMap((prev) => ({ ...prev, [post._id]: "-1" }));
                          setDropdownPostId(null);
                          if (post.bids && post.bids.length > 0) {
                            const sorted = [...post.bids].sort((a, b) => {
                                // amount comparison
                                const amountDiff =  b.BidAmount - a.BidAmount;
                                if (amountDiff !== 0) return amountDiff;
                          
                                // verified‐user tiebreaker
                                const aVer = a.user.verified?.email && a.user.verified?.phoneNumber;
                                const bVer = b.user.verified?.email && b.user.verified?.phoneNumber;
                                if (aVer !== bVer) return aVer ? -1 : 1;
                          
                                // earliest bid tiebreaker
                                const timeDiff = new Date(a.createdAt) - new Date(b.createdAt);
                                if (timeDiff !== 0) return timeDiff;
                          
                                // final fallback: lexicographic ObjectId compare
                                return a._id.toString().localeCompare(b._id.toString());
                              });
                            setTopBids((prev) => ({ ...prev, [post._id]: sorted[0] }));
                          } else {
                            setTopBids((prev) => ({ ...prev, [post._id]: null }));
                          }
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      >
                        Highest First
                        {sortByMap[post._id] === "-1" && <span className="ml-1">✅</span>}
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setSortByMap((prev) => ({ ...prev, [post._id]: "1" }));
                          setDropdownPostId(null);
                          if (post.bids && post.bids.length > 0) {
                            const sorted = [...post.bids].sort((a, b) => {
                                // amount comparison
                                const amountDiff = a.BidAmount - b.BidAmount;
                                if (amountDiff !== 0) return amountDiff;
                          
                                // verified‐user tiebreaker
                                const aVer = a.user.verified?.email && a.user.verified?.phoneNumber;
                                const bVer = b.user.verified?.email && b.user.verified?.phoneNumber;
                                if (aVer !== bVer) return aVer ? -1 : 1;
                          
                                // earliest bid tiebreaker
                                const timeDiff = new Date(a.createdAt) - new Date(b.createdAt);
                                if (timeDiff !== 0) return timeDiff;
                          
                                // final fallback: lexicographic ObjectId compare
                                return a._id.toString().localeCompare(b._id.toString());
                              });
                            setTopBids((prev) => ({ ...prev, [post._id]: sorted[0] }));
                          } else {
                            setTopBids((prev) => ({ ...prev, [post._id]: null }));
                          }
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      >
                        Lowest First
                        {sortByMap[post._id] === "1" && <span className="ml-1">✅</span>}
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {topBids[post._id] ? (
              <div className="mb-1">
                <p className="text-sm text-gray-700 flex items-center gap-1">
                  <span className="font-semibold text-black">{topBids[post._id].BidAmount}₹ bid by{" "}</span>
                  <button disabled={shouldBlur} onClick={() => {
                      if (user._id === topBids[post._id].user._id) {
                        navigate(`/profile`); // Navigate to the user's profile
                      } else {
                        navigate(`/profile/${topBids[post._id].user._id}`); // Navigate to the post's user's profile
                      }
                    }}className={`font-semibold text-black cursor-pointer ${shouldBlur ? "blur-sm" : ""}`}>
                    {shouldBlur ? "anonymous" : `@${topBids[post._id].user.username}`}
                  </button>
                  {topBids[post._id].user.verified.email && topBids[post._id].user.verified.phoneNumber && <BadgeCheck className="h-5 w-5 text-teal-400" />}
                </p>
              </div>
            ) : (
              <span>No bids yet.</span>
            )}
          </div>
        </div>
      );
    })
  )}
  {activeCommentPost && <CommentOverlay post={activeCommentPost} onClose={() => setActiveCommentPost(null)} />}
  {activeBidPost && (
    <BidOverlay post={activeBidPost} postRefresh={refresh} onClose={() => setActiveBidPost(null)} sortBy={sortByMap[activeBidPost._id] || "1"} />
  )}
</div>

);
}

export default JobFeed;