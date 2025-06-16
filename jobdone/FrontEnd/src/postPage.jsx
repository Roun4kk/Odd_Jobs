import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import PostCard from "./components/PostCard";
import useAuth from "./hooks/useAuth";
import Sidebar from "./Sidebar";
import axios from "axios";
import CommentOverlay from "./components/commentOverlay";
import BidOverlay from "./components/bidOverlay";
import logo from "./assets/logo/logo-transparent.png";
import PostOptionsOverlay from "./components/postOptionsOverlay";
import SendOverlay from "./components/sendoverlay";

export default function PostPage() {
  const { postId } = useParams();
  const { user, updateUser } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topBids, setTopBids] = useState({}); // Changed from topBid to topBids
  const [dropdownPostId, setDropdownPostId] = useState(null);
  const [sortByMap, setSortByMap] = useState({});
  const [error, setError] = useState(null);
  const [hasToken, setHasToken] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [activeBidPost, setActiveBidPost] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [activeSendPost, setActiveSendPost] = useState(null);
  const [activeOptionsPost, setActiveOptionsPost] = useState(null);
  console .log("User in PostPage component:", user);
  const refresh = useCallback(() => {
    setRefreshFlag((prev) => !prev);
  }, []);

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
    if (user) {
      setHasToken(true);
    } else {
      setHasToken(false);
    }
  }, []);


  useEffect(() => {
    const fetchPost = async () => {
      console.log("Fetching post with ID:", postId);
      try {
        setLoading(true);
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/post/${postId}`);
        const fetchedPost = res.data;
        setPost(fetchedPost);

        if (fetchedPost.bids?.length > 0) {
          const sortedBids = [...fetchedPost.bids].sort((a, b) => a.BidAmount - b.BidAmount);
          setTopBids((prev) => ({
            ...prev,
            [postId]: sortedBids[0],
          }));
        } else {
          setTopBids((prev) => ({
            ...prev,
            [postId]: null,
          }));
        }
        setSortByMap((prev) => ({
          ...prev,
          [postId]: "1",
        }));
      } catch (err) {
        console.error("Error fetching post:", err);
        setError("Post not found or failed to load.");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, refreshFlag]);

  const shouldBlur = useMemo(() => {
    if (!user || !post) return true;
    const topBid = topBids[post._id];
    return !(
      user._id === post.user._id ||
      (topBid && user._id === topBid.user._id)
    );
  }, [user, post, topBids]);

  if (loading) {
  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <img src={logo} alt="Loading..." className="w-40 h-40 animate-pulse" />
    </div>
  );
  }

  if (error) {
    return (
    <div className="flex h-screen">
      {user && <Sidebar user={user} />}
      <div className={`${
          hasToken ? "w-[70%] fixed right-0" : "w-full flex justify-center"
        } bg-white h-full overflow-y-scroll`}>
        <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
      </div>
    </div>);
  }

  return (
    <div className="flex h-screen">
      {user && <Sidebar user={user} />}

      <div
        className={`${
          hasToken ? "w-[70%] fixed right-0" : "w-full flex justify-center"
        } bg-white h-full overflow-y-scroll`}
      >
        {(post?.user?.blockedUsers?.includes(user?._id)) || (user?.blockedUsers?.includes(post?.user?._id)) ? (
          <div className="flex items-center justify-center h-screen bg-white">
            <div className="text-gray-500">Post Unavailable</div>
          </div>
        ) : (
          <div
            className={`py-6 ${
              hasToken ? "w-2/3 max-w-md ml-auto mr-auto" : "w-full max-w-md"
            }`}
          >
            <PostCard
              post={post}
              userProfile={user}
              topBid={topBids[postId]}
              toggleSavePost={toggleSavePost}
              setActiveCommentPost={setActiveCommentPost}
              setActiveBidPost={setActiveBidPost}
              setActiveOptionsPost={setActiveOptionsPost}
              setActiveSendPost={setActiveSendPost}
              shouldBlur={shouldBlur}
              setTopBids={setTopBids}
              setSortByMap={setSortByMap}
              sortByMap={sortByMap}
              dropdownPostId={dropdownPostId}
              setDropdownPostId={setDropdownPostId}
              hasToken={hasToken}
            />
            {activeCommentPost && (
              <CommentOverlay post={activeCommentPost} onClose={() => setActiveCommentPost(null)} />
            )}
            {activeBidPost && (
              <BidOverlay
                post={activeBidPost}
                postRefresh={refresh}
                onClose={() => setActiveBidPost(null)}
                sortBy={sortByMap[activeBidPost._id] || "1"}
              />
            )}
            {activeOptionsPost && (
              <PostOptionsOverlay post={activeOptionsPost} onClose={() => setActiveOptionsPost(null)} />
            )}
            {activeSendPost && (
              <SendOverlay post={activeSendPost} onClose={() => setActiveSendPost(null)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
