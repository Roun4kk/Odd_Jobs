import { useEffect, useState } from "react";
import axios from "axios";
import useAuth from "./hooks/useAuth.jsx";
import PostCard from "./components/PostCard";
import CommentOverlay from "./components/commentOverlay";
import BidOverlay from "./components/bidOverlay";
import SendOverlay from "./components/sendoverlay.jsx";
import PostOptionsOverlay from "./components/postOptionsOverlay.jsx";

function UserJobs({ job, userProfile, hasToken }) {
  const [topBids, setTopBids] = useState({});
  const [dropdownPostId, setDropdownPostId] = useState(null);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [activeBidPost, setActiveBidPost] = useState(null);
  const [activeSendPost, setActiveSendPost] = useState(null);
  const [activeOptionsPost , setActiveOptionsPost] = useState(null);
  const [posts, setPosts] = useState([]);
  const [sortByMap, setSortByMap] = useState({});
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviews , setReviews] = useState({});

  const userProfileReplacer = userProfile ? userProfile : user;
  
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
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users/savedPosts/${user._id}`);
      const savedPosts = response.data;

      const isAlreadySaved = savedPosts.includes(postId);
      if (isAlreadySaved) {
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/posts/unsave`, { data: { postId, userId: user._id } });
        const updatedUser = { ...user, savedPosts: savedPosts.filter(id => id !== postId) };
        updateUser(updatedUser);
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts/save`, { postId, userId: user._id });
        const updatedUser = { ...user, savedPosts: [...savedPosts, postId] };
        updateUser(updatedUser);
      }
    } catch (error) {
      console.error("Error saving/unsaving post:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let response;
        if (job === "posts") {
          response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/user/posts`, {
            params: { userId: userProfileReplacer.id || userProfileReplacer._id },
          });
        } else if (job === "saved") {
          response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users/saved`, {
            params: { userId: userProfileReplacer.id || userProfileReplacer._id },
          });
        } else if(job === "bids"){
          response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/user/bids`, {
            params: { userId: userProfileReplacer.id || userProfileReplacer._id },
          });
        }else {
          response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/user/reviews`, {
            params: { userId: userProfileReplacer.id || userProfileReplacer._id },
          });
        }
        
        if (!response.data || response.data.length === 0) {
          setPosts([]);
          setLoading(false);
          return;
        }
        setPosts(response.data);
        await fetchTopBids(response.data);
      } catch (error) {
        console.error(error.response ? error.response.data : { message: "Network error" });
      }
      setLoading(false);
    };

    if (userProfileReplacer && (userProfileReplacer.id || userProfileReplacer._id)) {
      fetchData();
    }
  }, [job, userProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-12 h-12 border-4 border-teal-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-3/5 mt-4 space-y-4">
      {(posts.length === 0)|| (user?.blockedUsers?.includes(userProfileReplacer?._id)) ? (
        <p className="text-gray-500 text-center">No job posts yet.</p>
      ) : (
        posts.map((post, index) => {
          const shouldBlur =
            !(
              user?._id === post?.user?._id ||
              (topBids[post?._id] && user?._id === topBids[post?._id]?.user?._id) || false
            );
          const setReviewSubmitted = () => {
            setReviews(prev => ({ ...prev, [post._id]: true }));
          };

          return (
            <PostCard
              key={index}
              post={post}
              userProfile={job==="reviews" ? userProfileReplacer : null}
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
              dropdownPostId={dropdownPostId}
              setDropdownPostId={setDropdownPostId}
              hasToken={hasToken}
              setReviewSubmitted = {setReviewSubmitted}
              reviews= {reviews}
            />
          );
        })
      )}

      {activeCommentPost && (
        <CommentOverlay
          post={activeCommentPost}
          onClose={() => setActiveCommentPost(null)}
        />
      )}

      {activeBidPost && (
        <BidOverlay
          post={activeBidPost}
          onClose={() => setActiveBidPost(null)}
          sortBy={sortByMap[activeBidPost._id] || "1"}
          setPosts={setPosts}
          setActiveBidPost={setActiveBidPost}
        />
      )}

      {activeSendPost && (
        <SendOverlay
          post={activeSendPost}
          onClose={() => setActiveSendPost(null)}
        />
      )}
      {activeOptionsPost && (
              <PostOptionsOverlay post={activeOptionsPost} onClose={() => setActiveOptionsPost(null)} setPosts={setPosts} />
            )}
    </div>
  );
}

export default UserJobs;
