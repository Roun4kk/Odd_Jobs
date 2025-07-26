import { useParams, useNavigate , useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import BidOverlay from "./components/bidOverlay";
import useAuth from "./hooks/useAuth";
import axios from "axios";
import { useSortBy } from "./SortByContext";

function BidOverlayPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  // 2. Get the new context actions and the derived activeSortMap
  const { setActiveFeed, activeSortMap } = useSortBy();

  // 3. Extract the feed key from the URL query parameter
  const queryParams = new URLSearchParams(location.search);
  const feedKeyFromUrl = queryParams.get('feed');
  
  useEffect(() => {
    // If we have a feed key from the URL, set it as the active one.
    if (feedKeyFromUrl) {
      setActiveFeed(feedKeyFromUrl);
    }
  }, [feedKeyFromUrl, setActiveFeed]); // Run this whenever the feed key changes.

  // ✅ CORE FIX: This effect controls the body scroll.
  useEffect(() => {
    // When the overlay page mounts, disable scrolling on the body.
    document.body.style.overflow = "hidden";

    // When the component unmounts, re-enable scrolling.
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount.

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/post/${postId}`, {
          withCredentials: true,
        });
        setPost(res.data);
      } catch (error) {
        console.error(error.response ? error.response.data : { message: "Network error" });
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const handlePostUpdate = (updatedPost) => {
    setPost(updatedPost);
    // propagate update to global posts cache if needed
    window.dispatchEvent(new CustomEvent("jobdone-post-updated", { detail: updatedPost }));
  };

  if (loading || !post) {
    return (
      // <div className="fixed inset-0 z-50 bg-white flex flex-col">
      //   {/* Header Skeleton */}
      //   <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white flex-shrink-0 animate-pulse">
      //     <div className="w-10 h-10 rounded-full bg-gray-200" />
      //     <div className="flex-1 h-4 bg-gray-200 rounded w-1/3" />
      //     <div className="ml-auto w-6 h-6 bg-gray-200 rounded-full" />
      //   </div>

      //   {/* Description Skeleton */}
      //   <div className="p-4 space-y-2 border-b border-gray-100 animate-pulse">
      //     <div className="h-4 bg-gray-200 rounded w-5/6" />
      //     <div className="h-4 bg-gray-200 rounded w-4/6" />
      //     <div className="h-4 bg-gray-200 rounded w-3/6" />
      //   </div>

      //   {/* Bid Section Skeleton */}
      //   <div className="p-4 space-y-3 flex-1 overflow-y-auto animate-pulse">
      //     {[...Array(3)].map((_, i) => (
      //       <div key={i} className="p-3 rounded-xl bg-gray-100 space-y-2">
      //         <div className="flex items-center gap-2">
      //           <div className="w-4/6 h-4 bg-gray-300 rounded" />
      //           <div className="w-10 h-4 bg-gray-300 rounded ml-auto" />
      //         </div>
      //         <div className="h-3 bg-gray-300 rounded w-5/6" />
      //       </div>
      //     ))}
      //   </div>

      //   {/* Input Bar Skeleton */}
      //   <div className="bg-white border-t border-gray-200 p-4 flex flex-col gap-3 animate-pulse">
      //     <div className="w-full h-10 bg-gray-200 rounded" />
      //     <div className="flex gap-2">
      //       <div className="flex-1 h-10 bg-gray-200 rounded" />
      //       <div className="w-20 h-10 bg-gray-200 rounded" />
      //     </div>
      //   </div>
      // </div>
      <p></p>
    );
  }

  return (
    <BidOverlay
      post={post}
      onClose={() => navigate(-1)}
      sortBy={activeSortMap[post._id] || "1"} 
      setActiveBidPost={handlePostUpdate} // Use the correct handler
      setPost={handlePostUpdate} // Pass setPost to BidOverlay
    />
  );
}

export default BidOverlayPage;