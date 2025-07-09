import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import BidOverlay from "./components/bidOverlay";
import useAuth from "./hooks/useAuth";
import axios from "axios";

function BidOverlayPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [sortByMap, setSortByMap] = useState({});
  const [loading, setLoading] = useState(true);

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
    // Render a loading state inside the page to prevent showing the underlying page briefly
    return (
      <div className="fixed inset-0 z-50 bg-white flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-teal-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <BidOverlay
      post={post}
      onClose={() => navigate(-1)}
      sortBy={sortByMap[post._id] || "1"}
      setPosts={() => {}} // This can be removed if not used
      setActiveBidPost={handlePostUpdate} // Use the correct handler
      setPost={handlePostUpdate} // Pass setPost to BidOverlay
    />
  );
}

export default BidOverlayPage;