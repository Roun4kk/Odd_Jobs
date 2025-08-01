import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import PostCard from "./PostCard";
import CommentOverlay from "./commentOverlay";
import SendOverlay from "./sendoverlay.jsx";
import useAuth from "../hooks/useAuth.jsx";
import PostOptionsOverlay from "./postOptionsOverlay.jsx";
import useIsMobile from "../hooks/useIsMobile.js"; // Make sure you have this import
import { useSortBy } from "../SortByContext";


// Skeleton Post Component
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

// Loading Spinner Component
const LoadingSpinner = ({ text = "Loading more posts..." }) => (
  <div className="flex items-center justify-center py-6">
    <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
      <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-sm">{text}</span>
    </div>
  </div>
);

function JobFeed({ refreshFlag }) {
  const { setActiveFeed, setFeedMap, updatePostSort, activeSortMap } = useSortBy();
  const [topBids, setTopBids] = useState({});
  const [dropdownPostId, setDropdownPostId] = useState(null);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [activeSendPost, setActiveSendPost] = useState(null);
  const [activeOptionsPost, setActiveOptionsPost] = useState(null);
  const [posts, setPosts] = useState([]);
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef(null);
  const isLoadingRef = useRef(false);
  const limit = 5;
  const isMobile = useIsMobile(); // NEW: Hook to check for mobile
  const commentModalHistoryState = useRef(false); // NEW: Ref to track history state
  const sendModalHistoryState = useRef(false);
  const optionsModalHistoryState = useRef(false);

  useEffect(() => {
    setActiveFeed('jobFeed');
  }, [setActiveFeed]);

  // NEW: Effect to handle history for the comment modal
  useEffect(() => {
    // This effect runs when the modal's state changes
    if (isMobile) {
      if (activeCommentPost && !commentModalHistoryState.current) {
        // Modal is opening, so push a state
        window.history.pushState({ modal: "comment" }, "");
        commentModalHistoryState.current = true;
      }
    }
  }, [activeCommentPost, isMobile]);

  useEffect(() => {
    if (isMobile) {
      if (activeSendPost && !sendModalHistoryState.current) {
        window.history.pushState({ modal: "send" }, "");
        sendModalHistoryState.current = true;
      }
    }
  }, [activeSendPost, isMobile]);

  useEffect(() => {
    if (isMobile) {
      if (activeOptionsPost && !optionsModalHistoryState.current) {
        window.history.pushState({ modal: "options" }, "");
        optionsModalHistoryState.current = true;
      }
    }
  }, [activeOptionsPost, isMobile]);


  // NEW: Effect to listen for the back button/swipe
  useEffect(() => {
    if (!isMobile) return;

    const handlePopState = (event) => {
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
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isMobile]); // Dependency array only needs isMobile

  // NEW: Centralized function to close the comment overlay
  const handleCloseCommentOverlay = () => {
    if (isMobile && commentModalHistoryState.current) {
      // On mobile, trigger a history back action. This will be caught
      // by our `popstate` listener above, ensuring a single, clean logic path.
      window.history.back();
    } else {
      // On desktop, or if something is out of sync, just close it directly.
      setActiveCommentPost(null);
    }
  };


  const fetchTopBids = async (posts) => {
    const bids = await Promise.all(posts.map(async post => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/posts/topbid`, {
          params: { postId: post._id, sortBy: sortByMap[post._id] || "1", userId: user?._id }
        });
        return [post._id, res.data];
      } catch {
        return [post._id, null];
      }
    }));
    setTopBids(prev => ({ ...prev, ...Object.fromEntries(bids) }));
  };

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

  const fetchData = async (pageNum = page, isRefresh = false) => {
    if (loadingMore && !isRefresh) return;
    
    setLoadingMore(true);
    
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/posts`, {
        params: { page: pageNum, limit },
        withCredentials: true
      });

      let data, pagination;
      if (response.data.posts) {
        data = response.data.posts;
        pagination = response.data.pagination;
        setHasMore(pagination.hasMore);
      } else {
        data = response.data;
        setHasMore(data.length >= limit);
      }

      const newSortByMapForThisFeed = Object.fromEntries(data.map(post => [post._id, "1"]));
      
      if (pageNum === 1 || isRefresh) {
        setPosts(data);
        setFeedMap('jobFeed', newSortByMapForThisFeed);
      } else {
        setFeedMap('jobFeed', { ...activeSortMap, ...newSortByMapForThisFeed });
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p._id));
          const newPosts = data.filter(p => !existingIds.has(p._id));
          const updatedPosts = [...prev, ...newPosts];
          return updatedPosts;
        });
      }
      
      await fetchTopBids(data);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoadingMore(false);
      setLoading(false);
    }
  };

  const refreshFeed = async () => {
    setLoading(true);
    setPosts([]);
    setTopBids({});
    setFeedMap('jobFeed', {});
    setPage(1);
    setHasMore(true);
    
    await fetchData(1, true);
  };

  const handlePostDelete = async (deletedPostId) => {
    setPosts(prev => {
      const filteredPosts = prev.filter(p => p._id !== deletedPostId);
      const newTotalFetched = filteredPosts.length;
      
      const expectedPostsForCurrentPage = page * limit;
      if (newTotalFetched < expectedPostsForCurrentPage && hasMore) {
        setTimeout(() => {
          if (hasMore && !loadingMore) {
            setPage(prev => prev + 1);
          }
        }, 100);
      }
      
      return filteredPosts;
    });

    setTopBids(prev => {
      const newTopBids = { ...prev };
      delete newTopBids[deletedPostId];
      return newTopBids;
    });

    setSortByMap(prev => {
      const newSortByMap = { ...prev };
      delete newSortByMap[deletedPostId];
      return newSortByMap;
    });
  };

  const scrollHandler = useCallback(() => {
    if (loadingMore || !hasMore || isLoadingRef.current) return;
    
    const isMobileView = window.innerWidth < 1024;
    let scrollTop, scrollHeight, clientHeight;
    
    if (isMobileView) {
      scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      scrollHeight = document.documentElement.scrollHeight;
      clientHeight = window.innerHeight;
    } else {
      const scrollContainer = document.querySelector('.w-\\[70\\%\\].h-full.overflow-y-scroll') ||
                             document.querySelector('[class*="overflow-y-scroll"]') ||
                             document.documentElement;
      
      if (scrollContainer === document.documentElement) {
        scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        scrollHeight = document.documentElement.scrollHeight;
        clientHeight = window.innerHeight;
      } else {
        scrollTop = scrollContainer.scrollTop;
        scrollHeight = scrollContainer.scrollHeight;
        clientHeight = scrollContainer.clientHeight;
      }
    }

    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    const bottomThreshold = scrollHeight - clientHeight - 300;

    if (scrollTop >= bottomThreshold || scrollPercentage > 0.85) {
      isLoadingRef.current = true;
      setPage(prev => prev + 1);
      setTimeout(() => { isLoadingRef.current = false; }, 2000);
    }
  }, [hasMore, loadingMore]);

  useEffect(() => {
    refreshFeed();
  }, [refreshFlag]);

  useEffect(() => {
    if (page > 1) {
      fetchData(page);
    }
  }, [page]);

  useEffect(() => {
    const updatePostHandler = (e) => {
      const updatedPost = e.detail;
      setPosts(prev => prev.map(p => (p._id === updatedPost._id ? updatedPost : p)));
    };
    window.addEventListener("jobdone-post-updated", updatePostHandler);
    return () => window.removeEventListener("jobdone-post-updated", updatePostHandler);
  }, []);

  useEffect(() => {
    const throttledScrollHandler = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(scrollHandler, 150);
    };

    const isMobileView = window.innerWidth < 1024;
    
    if (isMobileView) {
      window.addEventListener("scroll", throttledScrollHandler, { passive: true });
    } else {
      const scrollContainer = document.querySelector('.w-\\[70\\%\\].h-full.overflow-y-scroll') ||
                             document.querySelector('[class*="overflow-y-scroll"]');
      
      if (scrollContainer) {
        scrollContainer.addEventListener("scroll", throttledScrollHandler, { passive: true });
      } else {
        window.addEventListener("scroll", throttledScrollHandler, { passive: true });
      }
    }
    
    return () => {
      window.removeEventListener("scroll", throttledScrollHandler);
      const scrollContainer = document.querySelector('.w-\\[70\\%\\].h-full.overflow-y-scroll') ||
                             document.querySelector('[class*="overflow-y-scroll"]');
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", throttledScrollHandler);
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [scrollHandler]);

  if (loading && posts.length === 0) {
    return (
      <div className="w-full lg:w-3/4 mt-4 space-y-4 max-w-md lg:max-w-none mx-auto">
        {[...Array(3)].map((_, index) => (
          <PostSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full lg:w-3/4 mt-4 space-y-4 max-w-md lg:max-w-none mx-auto">
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <p className="text-gray-500 dark:text-gray-400 text-lg">No job posts yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Be the first to post a job!</p>
        </div>
      ) : (
        posts
          .filter(post => post.status === "open")
          .map((post) => {
            const shouldBlur =
              !(
                user?._id === post?.user?._id ||
                (topBids[post._id] && user?._id === topBids[post._id]?.user?._id)
              );
            return (
              <PostCard
                key={post._id}
                post={post}
                topBid={topBids[post._id]}
                toggleSavePost={toggleSavePost}
                setActiveCommentPost={setActiveCommentPost}
                setActiveSendPost={setActiveSendPost}
                setActiveOptionsPost={setActiveOptionsPost}
                shouldBlur={shouldBlur}
                feedKey={'jobFeed'}
                setTopBids={setTopBids}
                sortByMap={activeSortMap}
                dropdownPostId={dropdownPostId}
                setDropdownPostId={setDropdownPostId}
                hasToken={true}
              />
            );
          })
      )}

      {loadingMore && <LoadingSpinner />}

      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 border-t border-gray-100 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400 font-medium">You've reached the end!</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">No more posts to load</p>
        </div>
      )}
      
      {/* UPDATED: Pass the new handler to the overlay */}
      {activeCommentPost && (
        <CommentOverlay post={activeCommentPost} onClose={handleCloseCommentOverlay} />
      )}

      {activeSendPost && (
        <SendOverlay post={activeSendPost} onClose={() => {
            if (isMobile && sendModalHistoryState.current) {
              window.history.back();
            } else {
              setActiveSendPost(null);
            }
          }} 
        />
      )}

      {activeOptionsPost && (
        <PostOptionsOverlay 
          post={activeOptionsPost}
          onClose={() => {
            if (isMobile && optionsModalHistoryState.current) {
              window.history.back();
            } else {
              setActiveOptionsPost(null);
            }
          }}
          setPosts={setPosts}
          onPostDelete={handlePostDelete}
        />
      )}
    </div>
  );
}

export default JobFeed;