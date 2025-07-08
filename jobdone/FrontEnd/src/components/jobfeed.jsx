import { useEffect, useState } from "react";
import axios from "axios";
import PostCard from "./PostCard";  // Import PostCard component
import CommentOverlay from "./commentOverlay";
import BidOverlay from "./bidOverlay";
import SendOverlay from "./sendoverlay.jsx";
import useAuth from "../hooks/useAuth.jsx";
import PostOptionsOverlay from "./postOptionsOverlay.jsx";
import { useNavigate, useLocation } from "react-router-dom";

function JobFeed({ refreshFlag  }) {
  const navigate = useNavigate();
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
    const bids = await Promise.all(posts.map(async post => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/posts/topbid`, {
          params: { postId: post._id, sortBy: sortByMap[post._id] || "1" },
          withCredentials:true,
        });
        return [post._id, res.data];
      } catch {
        return [post._id, null];
      }
    }));
    setTopBids(Object.fromEntries(bids));
  };


  const toggleSavePost = async (postId) => {
    try {
      // Get current state from local user object instead of API call
      const isAlreadySaved = user.savedPosts?.includes(postId);
      
      // Optimistic update - update UI immediately
      const optimisticUser = {
        ...user,
        savedPosts: isAlreadySaved 
          ? user.savedPosts.filter(id => id !== postId)
          : [...(user.savedPosts || []), postId]
      };
      updateUser(optimisticUser);

      // Then sync with server
      if (isAlreadySaved) {
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/posts/unsave`, { 
          data: { postId, userId: user._id } 
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts/save`, { 
          postId, userId: user._id 
        });
      }
    } catch (error) {
      console.error("Error saving/unsaving post:", error);
      // Revert optimistic update on error
      updateUser(user);
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/posts`, {
          withCredentials: true
        });
        const newSortByMap = Object.fromEntries(response.data.map(post => [post._id, "1"]));
        setSortByMap(newSortByMap);
        setPosts(response.data);
        await fetchTopBids(response.data);
      } catch (error) {
        console.error(error.response ? error.response.data : { message: "Network error" });
      }
      setLoading(false);
    };

    fetchData();
  }, [refreshFlag]);

  useEffect(() => {
    const updatePostHandler = (e) => {
      const updatedPost = e.detail;
      setPosts(prev => prev.map(p => (p._id === updatedPost._id ? updatedPost : p)));
    };

    window.addEventListener("jobdone-post-updated", updatePostHandler);
    return () => window.removeEventListener("jobdone-post-updated", updatePostHandler);
  }, [setPosts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center mt-40 sm:mt-10 lg:mt-30 bg-white">
        <div className="w-12 h-12 border-4 border-teal-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-3/4 mt-4 space-y-4 max-w-md lg:max-w-none mx-auto">
      {posts.length === 0 ? (
        <p className="text-gray-500 text-center">No job posts yet.</p>
      ) : (
        posts.filter(post => post.status === "open")
          .map((post, index) => {
          const shouldBlur =
            !(
              user?._id === post?.user?._id ||
              (topBids[post._id] && user?._id === topBids[post._id]?.user?._id)
            );
          return (
            <PostCard
              post={post}
              key={index}
              topBid={topBids[post._id]}
              toggleSavePost={toggleSavePost}
              setActiveCommentPost={setActiveCommentPost}
              setActiveBidPost={() => navigate(`/bid/${post._id}`)}
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
      {/* {activeBidPost && (
        <BidOverlay post={activeBidPost} onClose={() => setActiveBidPost(null)} sortBy={sortByMap[activeBidPost._id] || "1" } setPosts={setPosts} setActiveBidPost={setActiveBidPost}/>
      )} */}
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
