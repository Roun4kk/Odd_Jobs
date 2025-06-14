import { useEffect, useState } from "react";
import axios from "axios";
import PostCard from "./components/PostCard.jsx";
import CommentOverlay from "./components/commentOverlay.jsx";
import BidOverlay from "./components/bidOverlay";
import SendOverlay from "./components/sendoverlay.jsx";
import useAuth from "./hooks/useAuth.jsx";
import PostOptionsOverlay from "./components/postOptionsOverlay.jsx";

function JobSearchFeed({ 
  refreshFlag, 
  setPosts, 
  posts, 
  topBids, 
  setTopBids, 
  loading = false,
  sortByMap,
  setSortByMap 
}) {
  const [dropdownPostId, setDropdownPostId] = useState(null);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [activeBidPost, setActiveBidPost] = useState(null);
  const [activeSendPost, setActiveSendPost] = useState(null);
  const { user, updateUser } = useAuth();
  const [activeOptionsPost, setActiveOptionsPost] = useState(null);

  const toggleSavePost = async (postId) => {
    try {
      // Check if the post is already saved
      const response = await axios.get(`/users/savedPosts/${user._id}`);
      const savedPosts = response.data;
  
      const isAlreadySaved = savedPosts.includes(postId);
      if (isAlreadySaved) {
        const resp = await axios.delete("/posts/unsave", { data: { postId, userId: user._id } });
        const updatedUser = { ...user, savedPosts: savedPosts.filter(id => id !== postId) }; 
        updateUser(updatedUser); 
      } else {
        // Save post
        const resp = await axios.post("/posts/save", { postId, userId: user._id });
        const updatedUser = { ...user, savedPosts: [...savedPosts, postId] };
        updateUser(updatedUser); 
      }
    } catch (error) {
      console.error("Error saving/unsaving post:", error);
    }
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-gray-200 rounded-full"></div>
        <div className="w-12 h-12 border-4 border-teal-500 border-dashed rounded-full animate-spin absolute top-0 left-0"></div>
      </div>
      <p className="text-gray-500 text-sm">Searching...</p>
    </div>
  );

  // Empty state component
  const EmptyState = ({ hasSearchTerm }) => (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {hasSearchTerm ? "No results found" : "Start searching"}
        </h3>
        <p className="text-gray-500 text-sm max-w-sm">
          {hasSearchTerm 
            ? "Try adjusting your search terms or check for typos" 
            : "Enter a keyword or username to find relevant job posts"
          }
        </p>
      </div>
    </div>
  );

  // Show refresh loading (original loading state)
  if (refreshFlag) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-teal-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show search loading
  if (loading) {
    return (
      <div className="w-3/4 mt-4">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="w-3/4 mt-4 space-y-4">
      {posts.length === 0 ? (
        <EmptyState hasSearchTerm={true} />
      ) : (
        <>
          {posts.map((post, index) => {
            const shouldBlur = !(
              user._id === post.user._id ||
              (topBids[post._id] && user._id === topBids[post._id].user._id)
            );
            
            if (post.status !== "open") {
              return null;
            }
            
            return (
              <div 
                key={post._id || index}
                className="transform transition-all duration-200 hover:scale-[1.01]"
              >
                <PostCard
                  post={post}
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
                  hasToken={true} 
                />
              </div>
            );
          })}
          
          {/* Show loading indicator at bottom when fetching top bids */}
          {posts.length > 0 && Object.keys(topBids).length < posts.length && (
            <div className="flex justify-center py-4">
              <div className="flex items-center space-x-2 text-gray-500 text-sm">
                <div className="w-4 h-4 border-2 border-gray-300 border-dashed rounded-full animate-spin"></div>
                <span>Loading bids...</span>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Overlays */}
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
        <PostOptionsOverlay 
          post={activeOptionsPost} 
          onClose={() => setActiveOptionsPost(null)} 
          setPosts={setPosts} 
        />
      )}
    </div>
  );
}

export default JobSearchFeed;