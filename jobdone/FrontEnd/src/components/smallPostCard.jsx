import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.jsx";
import socket from "../socket.js";
import useSocketRoomJoin from "../hooks/socketRoomJoin.js";

const SmallPostCard = ({ postId }) => {
  const [post, setPost] = useState(null);
  const [topBid, setTopBid] = useState(null);
  const [bids, setBids] = useState([]);
  const [sortBy, setSortBy] = useState("-1"); // Default to highest bid first
  const { user, userId, loading } = useAuth();
  const navigate = useNavigate();
  const hasToken = !!userId;
  const [socketError, setSocketError] = useState(null);
  useSocketRoomJoin(user?._id, setSocketError);   // ONE line

  // Fetch post details
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/post/${postId}`, {
          withCredentials: true,
        });
        setPost(response.data);
        setBids(response.data.bids || []);
      } catch (error) {
        console.error("Error fetching post:", error);
      }
    };

    if (postId) {
      fetchPost();
    }
  }, [postId]);

  // Handle real-time bid updates
  useEffect(() => {
    const handleNewBid = (bidData) => {
      if (bidData.postId === postId) {
        const normalizedBid = {
          BidAmount: bidData.BidAmount,
          BidText: bidData.BidText,
          user: bidData.user,
          createdAt: bidData.createdAt,
          _id: bidData._id,
        };

        setBids((prev) => [...prev, normalizedBid]);
      }
    };

    socket.on("receivenewBid", handleNewBid);
    return () => {
      socket.off("receivenewBid", handleNewBid);
    };
  }, [postId]);

  // Update top bid when bids or sortBy change
  useEffect(() => {
    if (bids.length === 0) {
      setTopBid(null);
      return;
    }

    const sorted = [...bids].sort((a, b) => {
      const amountDiff = sortBy === "1" ? b.BidAmount - a.BidAmount
          : a.BidAmount - b.BidAmount;
      if (amountDiff !== 0) return amountDiff;

      const aVer = a.user.verified?.email && a.user.verified?.phoneNumber;
      const bVer = b.user.verified?.email && b.user.verified?.phoneNumber;
      if (aVer !== bVer) return aVer ? 1 : -1;

      const timeDiff = new Date(a.createdAt) - new Date(b.createdAt);
      if (timeDiff !== 0) return timeDiff;

      return a._id.toString().localeCompare(b._id.toString());
    });

    setTopBid(sorted[0]);
  }, [bids, sortBy]);

  if (loading || !post) {
    return (
      <div className="bg-gray-100 p-2 rounded-md text-sm text-gray-500">
        Loading post...
      </div>
    );
  }
  if (post.user.blockedUsers && post.user.blockedUsers.includes(userId)) {
    return (
      <div className="bg-gray-100 p-2 rounded-md text-sm text-gray-500">
        Post Unavailable
      </div>
    );
  }
  return (
    <div
      className="bg-white p-3 rounded-md shadow-sm border border-gray-200 w-full max-w-[250px] cursor-pointer hover:bg-gray-50 transition"
      onClick={() => hasToken && navigate(`/post/${post._id}`)}
    >
      <div className="flex items-center gap-2 mb-2">
        <img
          src={
            post.user.userImage ||
            "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"
          }
          alt="User"
          className="w-8 h-8 rounded-full object-cover"
        />
        <span className="text-sm font-semibold text-gray-800">{post.user.username}</span>
        {post.user.verified.email && post.user.verified.phoneNumber && (
          <BadgeCheck className="h-4 w-4 text-teal-400" />
        )}
      </div>
      <p className="text-sm text-gray-600 line-clamp-2">{post.postDescription}</p>
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <img
          src={post.mediaUrls[0]}
          alt="Post media"
          className="w-full h-20 object-cover rounded-md mt-2"
        />
      )}
      {topBid ? (
        <p className="text-xs text-gray-700 mt-2">
          <span className="font-semibold">Top Bid: </span>
          {topBid.BidAmount}₹ by{" "}
          {userId === topBid.user._id ? "you" : `@${topBid.user.username}`}
        </p>
      ) : (
        <p className="text-xs text-gray-500 mt-2">No bids yet</p>
      )}
      {/* {socketError && (
            <div className="p-4 text-red-500">
              Connection error: {socketError}. Please try refreshing the page or logging in again.
            </div>
          )} */}
    </div>
  );
};

export default SmallPostCard;
