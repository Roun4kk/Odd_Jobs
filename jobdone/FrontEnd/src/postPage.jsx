import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PostCard from "./components/PostCard";
import useAuth from "./hooks/useAuth";
import Sidebar from "./Sidebar";
import axios from "axios";
import CommentOverlay from "./components/commentOverlay";
import BidOverlay from "./components/bidOverlay";
import logo from "./assets/logo/logo-jobddone.svg";
import PostOptionsOverlay from "./components/postOptionsOverlay";
import SendOverlay from "./components/sendoverlay";
import useIsMobile from "./hooks/useIsMobile.js";
import BottomNavbar from "./bottomNavBar.jsx";
import { ArrowLeft } from "lucide-react";

export default function PostPage() {
  const { postId } = useParams();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topBids, setTopBids] = useState({});
  const [dropdownPostId, setDropdownPostId] = useState(null);
  const [sortByMap, setSortByMap] = useState({});
  const [error, setError] = useState(null);
  const [hasToken, setHasToken] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [activeBidPost, setActiveBidPost] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [activeSendPost, setActiveSendPost] = useState(null);
  const [activeOptionsPost, setActiveOptionsPost] = useState(null);
  
  console.log("User in PostPage component:", user);
  
  const refresh = useCallback(() => {
    setRefreshFlag((prev) => !prev);
  }, []);

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
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/post/${postId}` ,{withCredentials:true});
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
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <img src={logo} alt="Loading..." className="w-40 h-40 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${isMobile ? 'min-h-screen flex flex-col' : 'flex h-screen'}`}>
        {isMobile && (
          <div className="flex items-center justify-center p-4 border-b border-gray-200 dark:border-gray-700 bg-teal-50 dark:bg-gray-800 flex-shrink-0">
            {hasToken ? (
              <>
                <h1 className="text-2xl font-semibold text-teal-800 dark:text-white">Post</h1>
              </>
            ) : (
              <>
                <div className="flex items-center justify-start h-12 px-4">
                  <div className="w-full items-center mt-4 justify-center max-w-[160px]">
                    <img
                      src={logo}
                      alt="JobDone Logo"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => navigate("/")}
                    className="px-3 py-1 text-sm text-teal-600 border border-teal-600 rounded-full hover:bg-teal-50"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => navigate("/")}
                    className="px-3 py-1 text-sm bg-teal-600 text-white rounded-full hover:bg-teal-700"
                  >
                    Sign Up
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        
        {!isMobile && user && <Sidebar user={user} />}
        
        <div className={`${
          isMobile 
            ? "flex-1 flex justify-center items-center bg-white dark:bg-gray-900 px-4" 
            : hasToken ? "w-[70%] fixed right-0 bg-white dark:bg-gray-900 h-full overflow-y-scroll" : "w-full flex justify-center bg-white dark:bg-gray-900 h-full overflow-y-scroll"
        }`}>
          <div className="flex justify-center items-center h-full text-red-500 text-center">
            {error}
          </div>
        </div>
        
        {isMobile && hasToken && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <BottomNavbar />
          </div>
        )}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center p-4 border-b border-gray-200 dark:border-gray-700 bg-teal-50 dark:bg-gray-800 flex-shrink-0">
          {hasToken ? (
            <>
              <h1 className="text-2xl font-semibold text-teal-800 dark:text-white">Post</h1>
            </>
          ) : (
            <div className="flex items-center justify-between h-12 px-4 w-full">
              <div className="flex items-center justify-start flex-1">
                <div className="w-full items-center mt-4 justify-center max-w-[160px]">
                  <img
                    src={logo}
                    alt="JobDone Logo"
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button 
                  onClick={() => navigate("/")}
                  className="px-3 py-1 text-sm text-teal-600 border whitespace-nowrap border-teal-600 rounded-full hover:bg-teal"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => navigate("/")}
                  className="px-3 py-1 text-sm bg-teal-600 text-white rounded-full hover:bg-teal-700 whitespace-nowrap"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {(post?.user?.blockedUsers?.includes(user?._id)) || (user?.blockedUsers?.includes(post?.user?._id)) ? (
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900">
              <div className="text-gray-500 dark:text-gray-400 text-center px-4">
                <div className="text-lg font-medium mb-2">Post Unavailable</div>
                <div className="text-sm">This post cannot be displayed</div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <div 
                className="h-full overflow-y-auto"
                style={{
                  paddingBottom: hasToken ? '100px' : '20px'
                }}
              >
                <div className="w-full max-w-md mx-auto p-4">
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
                </div>
              </div>
            </div>
          )}
        </div>

        {hasToken && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <BottomNavbar />
          </div>
        )}

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
    );
  }

  return (
    <div className="flex h-screen overflow-hidden dark:bg-gray-900">
      {hasToken && <Sidebar user={user} />}

      <div className={`h-full overflow-y-scroll ${hasToken ? "fixed right-0 w-[70%]" : "w-full"} bg-white dark:bg-gray-900`}>
        
        {!isMobile && !hasToken && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-teal-50 dark:bg-gray-800 flex-shrink-0">
            <div className="flex items-center justify-start h-12 px-4">
              <div className="w-full mt-4 max-w-[160px]">
                <img
                  src={logo}
                  alt="JobDone Logo"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/")}
                className="px-3 py-1 text-sm text-teal-600 border border-teal-600 rounded-full hover:bg-teal-50 cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-3 py-1 text-sm bg-teal-600 text-white rounded-full hover:bg-teal-700"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        {(post?.user?.blockedUsers?.includes(user?._id)) || (user?.blockedUsers?.includes(post?.user?._id)) ? (
          <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
            <div className="text-gray-500 dark:text-gray-400">Post Unavailable</div>
          </div>
        ) : (
          <div className={`h-full flex flex-col items-center justify-start ${!hasToken ? 'mx-auto max-w-[70%]' : ''}`}>
            <div className={`py-6 ${hasToken ? "w-2/3 max-w-md mx-auto" : "w-full max-w-md"}`}>
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
          </div>
        )}
      </div>
    </div>
  );
}