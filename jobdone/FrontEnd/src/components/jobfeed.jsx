import { useEffect, useState } from "react";
import axios from "axios";
import PostCard from "./PostCard";  // Import PostCard component
import CommentOverlay from "./commentOverlay";
import BidOverlay from "./bidOverlay";
import SendOverlay from "./sendoverlay.jsx";
import useAuth from "../hooks/useAuth.jsx";
import PostOptionsOverlay from "./postOptionsOverlay.jsx";

function JobFeed({ refreshFlag  }) {
  const [topBids, setTopBids] = useState({});
  const [dropdownPostId, setDropdownPostId] = useState(null);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [activeBidPost, setActiveBidPost] = useState(null);
  const [activeSendPost, setActiveSendPost] = useState(null);
  const [posts, setPosts] = useState([]);
  const [sortByMap, setSortByMap] = useState({});
  const { user , updateUser } = useAuth();
  const [loading , setLoading] = useState(true);
  const [activeOptionsPost, setActiveOptionsPost] = useState(null);


  const fetchTopBids = async (posts) => {
    const newTopBids = {};
    for (const post of posts) {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/posts/topbid`, {
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
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users/savedPosts/${user._id}`);
      const savedPosts = response.data;
  
      const isAlreadySaved = savedPosts.includes(postId);
      if (isAlreadySaved) {
        const resp = await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/posts/unsave`, { data: { postId, userId: user._id } });
        const updatedUser = { ...user, savedPosts: savedPosts.filter(id => id !== postId) }; // Update user saved posts
        updateUser(updatedUser); 
      } else {
        // Save post
        const resp = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts/save`, { postId, userId: user._id });
        const updatedUser = { ...user, savedPosts: [...savedPosts, postId] }; // Add to saved posts
        updateUser(updatedUser); 
      }
  
    } catch (error) {
      console.error("Error saving/unsaving post:", error);
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/posts`);
        setPosts(response.data);
        await fetchTopBids(response.data);
      } catch (error) {
        console.error(error.response ? error.response.data : { message: "Network error" });
      }
      setLoading(false);
    };

    fetchData();
  }, [refreshFlag]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-12 h-12 border-4 border-teal-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-3/4 mt-4 space-y-4 max-w-md lg:max-w-none mx-auto">
      {posts.length === 0 ? (
        <p className="text-gray-500 text-center">No job posts yet.</p>
      ) : (
        posts.map((post, index) => {
          const shouldBlur =
            !(
              user._id === post.user._id ||
              (topBids[post._id] && user._id === topBids[post._id].user._id)
            );
          if(post.status !=="open"){
            return ;
          }
          return (
            <PostCard
              post={post}
              key={index}
              topBid={topBids[post._id]}
              toggleSavePost={toggleSavePost}
              setActiveCommentPost={setActiveCommentPost}
              setActiveBidPost={setActiveBidPost}
              setActiveSendPost={setActiveSendPost}
              setActiveOptionsPost={setActiveOptionsPost}
              shouldBlur={shouldBlur}
              setTopBids={setTopBids}
              setSortByMap={setSortByMap}
              sortByMap={sortByMap}
              dropdownPostId ={dropdownPostId}
              setDropdownPostId={setDropdownPostId}
              hasToken={true} 
            />
          );
        })
      )}
      {activeCommentPost && (
        <CommentOverlay post={activeCommentPost} onClose={() => setActiveCommentPost(null)} />
      )}
      {activeBidPost && (
        <BidOverlay post={activeBidPost} onClose={() => setActiveBidPost(null)} sortBy={sortByMap[activeBidPost._id] || "1" } setPosts={setPosts} setActiveBidPost={setActiveBidPost}/>
      )}
      {activeSendPost && (
        <SendOverlay post={activeSendPost} onClose={() => setActiveSendPost(null)} />
      )}
      {activeOptionsPost && (
        <PostOptionsOverlay post={activeOptionsPost} onClose={() => setActiveOptionsPost(null)} setPosts= {setPosts} />
      )}
    </div>
  );
}

export default JobFeed;
