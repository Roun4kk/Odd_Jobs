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

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/posts/${postId}`, {
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

  if (loading || !post) return null;

  return (
    <BidOverlay
      post={post}
      onClose={() => navigate(-1)}
      sortBy={sortByMap[post._id] || "1"}
      setPosts={() => {}}
      setActiveBidPost={() => navigate(-1)}
      setPost={handlePostUpdate} // propagate changes
    />
  );
}

export default BidOverlayPage;