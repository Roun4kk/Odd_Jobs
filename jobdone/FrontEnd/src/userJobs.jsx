import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import useAuth from "./hooks/useAuth.jsx";
import PostCard from "./components/PostCard";
import CommentOverlay from "./components/commentOverlay";
import SendOverlay from "./components/sendoverlay.jsx";
import PostOptionsOverlay from "./components/postOptionsOverlay.jsx";
import useIsMobile from "./hooks/useIsMobile.js";
import { useSortBy } from "./SortByContext";

// Skeleton Post Component for initial loading
const PostSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4 animate-pulse">
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/6"></div>
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
    </div>
    <div className="flex justify-between items-center">
      <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-20"></div>
      <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
    </div>
  </div>
);

// Loading Spinner for infinite scroll
const LoadingSpinner = ({ text = "Loading more..." }) => (
  <div className="flex items-center justify-center py-6">
    <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
      <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-sm">{text}</span>
    </div>
  </div>
);

function UserJobs({ job, userProfile, hasToken }) {
  const [posts, setPosts] = useState([]);
  const [topBids, setTopBids] = useState({});
  const [dropdownPostId, setDropdownPostId] = useState(null);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [activeSendPost, setActiveSendPost] = useState(null);
  const [activeOptionsPost, setActiveOptionsPost] = useState(null);
  const [reviews, setReviews] = useState({});
  
  const { setActiveFeed, setFeedMap, activeSortMap } = useSortBy();
  const { user, updateUser } = useAuth();
  const isMobile = useIsMobile();
  
  // State for pagination
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 5; // Match backend limit

  // Refs for modal history and scroll handling
  const commentModalHistoryState = useRef(false);
  const sendModalHistoryState = useRef(false);
  const optionsModalHistoryState = useRef(false);
  const debounceRef = useRef(null);
  const isLoadingRef = useRef(false);
  
  const userProfileReplacer = userProfile ? userProfile : user;
  
  // --- Modal and History Management (No changes needed) ---
  useEffect(() => { setActiveFeed('userJobs'); }, [job, userProfile, setActiveFeed]);
  useEffect(() => {
    if (isMobile && activeCommentPost && !commentModalHistoryState.current) {
      window.history.pushState({ modal: "comment" }, "");
      commentModalHistoryState.current = true;
    }
  }, [activeCommentPost, isMobile]);
  useEffect(() => {
    if (isMobile && activeSendPost && !sendModalHistoryState.current) {
      window.history.pushState({ modal: "send" }, "");
      sendModalHistoryState.current = true;
    }
  }, [activeSendPost, isMobile]);
  useEffect(() => {
    if (isMobile && activeOptionsPost && !optionsModalHistoryState.current) {
      window.history.pushState({ modal: "options" }, "");
      optionsModalHistoryState.current = true;
    }
  }, [activeOptionsPost, isMobile]);
  useEffect(() => {
    if (!isMobile) return;
    const handlePopState = () => {
      if (commentModalHistoryState.current) {
        commentModalHistoryState.current = false;
        setActiveCommentPost(null);
      } else if (sendModalHistoryState.current) {
        sendModalHistoryState.current = false;
        setActiveSendPost(null);
      } else if (optionsModalHistoryState.current) {
        optionsModalHistoryState.current = false;
        setActiveOptionsPost(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isMobile]);

  const handleCloseCommentOverlay = () => {
    if (isMobile && commentModalHistoryState.current) window.history.back();
    else setActiveCommentPost(null);
  };
  
  // --- Data Fetching and Management ---

  const fetchTopBids = async (newPosts) => {
    const bidsToFetch = newPosts.filter(post => !topBids[post._id]);
    if (bidsToFetch.length === 0) return;

    const bids = await Promise.all(bidsToFetch.map(async post => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/posts/topbid`, {
          params: { postId: post._id, sortBy: activeSortMap[post._id] || "1", userId: user?._id }
        });
        return [post._id, res.data];
      } catch {
        return [post._id, null];
      }
    }));
    setTopBids(prev => ({ ...prev, ...Object.fromEntries(bids) }));
  };

  const fetchData = async (pageNum, isRefresh) => {
    if (loadingMore && !isRefresh) return;
    
    if (isRefresh) setLoading(true);
    else setLoadingMore(true);

    const userId = userProfileReplacer?.id || userProfileReplacer?._id;
    if (!userId) {
        setLoading(false);
        setLoadingMore(false);
        setPosts([]);
        return;
    }

    try {
        const endpointMap = {
            posts: "/user/posts", saved: "/users/saved",
            bids: "/user/bids", reviews: "/user/reviews",
        };
        const endpoint = endpointMap[job];
        if (!endpoint) throw new Error("Invalid job type specified");

        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}${endpoint}`, {
            params: { userId, page: pageNum, limit },
            withCredentials: true,
        });

        const { posts: newPosts, pagination } = response.data;
        setHasMore(pagination.hasMore);

        const newSortMap = Object.fromEntries(newPosts.map(post => [post._id, "1"]));
        
        if (isRefresh) {
            setPosts(newPosts);
            setFeedMap('userJobs', newSortMap);
        } else {
            setPosts(prev => [...prev, ...newPosts.filter(p => !prev.find(e => e._id === p._id))]);
            setFeedMap('userJobs', prevMap => ({ ...prevMap, ...newSortMap }));
        }

        if (newPosts.length > 0) await fetchTopBids(newPosts);
    } catch (error) {
        console.error(error.response ? error.response.data : { message: "Network error" });
        if (isRefresh) setPosts([]);
    } finally {
        setLoading(false);
        setLoadingMore(false);
    }
  };

  // Effect to refresh data when `job` or `userProfile` changes
  useEffect(() => {
    const refreshFeed = async () => {
      setPosts([]);
      setTopBids({});
      setPage(1);
      setHasMore(true);
      await fetchData(1, true);
    };

    if (userProfileReplacer && (userProfileReplacer.id || userProfileReplacer._id)) {
      refreshFeed();
    } else {
      setLoading(false);
      setPosts([]);
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, userProfileReplacer?._id]);
  
  // Effect to fetch more data when page number increments
  useEffect(() => {
    if (page > 1) {
      fetchData(page, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);
  
  // Infinite scroll handler
  const scrollHandler = useCallback(() => {
    if (loadingMore || !hasMore || isLoadingRef.current) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;

    if (scrollHeight - scrollTop - clientHeight < 500) { // Fetch when 500px from bottom
      isLoadingRef.current = true;
      setPage(prev => prev + 1);
      setTimeout(() => { isLoadingRef.current = false; }, 1000); // Prevent rapid-fire fetches
    }
  }, [hasMore, loadingMore]);

  // Effect to attach scroll listener
  useEffect(() => {
    const throttledScrollHandler = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(scrollHandler, 150);
    };
    window.addEventListener("scroll", throttledScrollHandler, { passive: true });
    return () => {
      window.removeEventListener("scroll", throttledScrollHandler);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [scrollHandler]);

  const toggleSavePost = async (postId) => {
      try {
        const isAlreadySaved = user.savedPosts?.includes(postId);
        const optimisticUser = {
          ...user,
          savedPosts: isAlreadySaved
            ? user.savedPosts.filter(id => id !== postId)
            : [...(user.savedPosts || []), postId]
        };
        updateUser(optimisticUser);
  
        const url = `${import.meta.env.VITE_API_BASE_URL}/posts/${isAlreadySaved ? 'unsave' : 'save'}`;
        const method = isAlreadySaved ? 'delete' : 'post';
        const payload = { postId, userId: user._id };
  
        await axios[method](url, isAlreadySaved ? { data: payload } : payload, {
          withCredentials: true
        });
      } catch (error) {
        console.error("Error saving/unsaving post:", error);
        updateUser(user);
      }
    };
  
  const handlePostDelete = (deletedPostId) => {
    setPosts(prev => prev.filter(p => p._id !== deletedPostId));
    setTopBids(prev => { const newBids = { ...prev }; delete newBids[deletedPostId]; return newBids; });
    setFeedMap(prev => { const newSortMap = { ...prev }; delete newSortMap[deletedPostId]; return newSortMap; });
  };
  
  if (loading && posts.length === 0) {
    return (
      <div className="w-full lg:w-3/4 mt-4 space-y-4 max-w-md lg:max-w-none mx-auto">
        {[...Array(3)].map((_, index) => <PostSkeleton key={index} />)}
      </div>
    );
  }

  return (
    <div className="w-full lg:w-3/4 mt-4 space-y-4 max-w-md lg:max-w-none mx-auto mb-2">
      {posts.length === 0 || user?.blockedUsers?.includes(userProfileReplacer?._id) ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-10">No {job} yet.</p>
      ) : (
        posts.map((post, index) => {
          const shouldBlur = !(user?._id === post?.user?._id || (topBids[post?._id] && user?._id === topBids[post?._id]?.user?._id) || false);
          const setReviewSubmitted = () => setReviews(prev => ({ ...prev, [post._id]: true }));
          return (
            <PostCard
              key={post._id || index}
              post={post}
              userProfile={job === "reviews" ? userProfileReplacer : null}
              topBid={topBids[post._id]}
              toggleSavePost={toggleSavePost}
              setActiveCommentPost={setActiveCommentPost}
              setActiveSendPost={setActiveSendPost}
              setActiveOptionsPost={setActiveOptionsPost}
              shouldBlur={shouldBlur}
              setTopBids={setTopBids}
              feedKey={'userJobs'}
              sortByMap={activeSortMap}
              dropdownPostId={dropdownPostId}
              setDropdownPostId={setDropdownPostId}
              hasToken={hasToken}
              setReviewSubmitted={setReviewSubmitted}
              reviews={reviews}
            />
          );
        })
      )}

      {loadingMore && <LoadingSpinner />}
      
      {activeCommentPost && <CommentOverlay post={activeCommentPost} onClose={handleCloseCommentOverlay} />}
      {activeSendPost && <SendOverlay post={activeSendPost} onClose={() => { if (isMobile && sendModalHistoryState.current) window.history.back(); else setActiveSendPost(null); }} />}
      {activeOptionsPost && <PostOptionsOverlay post={activeOptionsPost} onClose={() => { if (isMobile && optionsModalHistoryState.current) window.history.back(); else setActiveOptionsPost(null); }} setPosts={setPosts} onPostDelete={handlePostDelete} />}
    </div>
  );
}

export default UserJobs;