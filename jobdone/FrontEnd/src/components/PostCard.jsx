// Imports remain the same
import { BadgeCheck, Bookmark, Gavel, MessageCircle, Send, MoreVertical ,Star } from "lucide-react";
import { useEffect, useState } from "react";
import socket from "../socket.js";
import { useNavigate } from "react-router-dom";
import ImageSlider from "./ImageSlider";
import useSocketRoomJoin from "../hooks/socketRoomJoin.js";
import ReviewAndRatingForm from "./reviewAndRatingForm.jsx";
import axios from "axios";
import useAuth from "../hooks/useAuth.jsx";
import { formatDistanceToNow } from "date-fns";

const PostCard = ({
  userProfile,
  post,
  setTopBids,
  topBid,
  toggleSavePost,
  setActiveCommentPost,
  setActiveBidPost,
  setActiveSendPost,
  setActiveOptionsPost,
  shouldBlur,
  setSortByMap,
  sortByMap,
  dropdownPostId,
  setDropdownPostId,
  hasToken,
  setReviewSubmitted,
  reviews
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [localPost, setLocalPost] = useState(post);
  const [bids, setBids] = useState(post.bids || []);
  const [socketError, setSocketError] = useState(null);
  console.log("userprofile " , userProfile);
  const rating = userProfile?.ratings?.find(r => r.post === post?._id) ;
  const winningBid = post?.bids?.find(bid => bid._id === post?.winningBidId);

  console.log("winningBid" , winningBid);
  // Sync localPost if props change
  useEffect(() => {
    setLocalPost(post);
    setBids(post.bids || []);
  }, [post]);

  useSocketRoomJoin(user?._id, setSocketError);

  useEffect(() => {
    const handleNewBid = (bidData) => {
      if (bidData.postId === localPost._id) {
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

    socket.on("receiveNewBid", handleNewBid);
    return () => {
      socket.off("receiveNewBid", handleNewBid);
    };
  }, [localPost._id]);

  useEffect(() => {
    if (bids.length === 0) {
      setTopBids((prev) => ({ ...prev, [localPost._id]: null }));
      return;
    }

    const sorted = [...bids].sort((a, b) => {
      const sortBy = sortByMap[localPost._id];

      if (sortBy === "rating") {
        // Descending by averageRating
        const ratingDiff = (b.user.averageRating || 0) - (a.user.averageRating || 0);
        if (ratingDiff !== 0) return ratingDiff;
      } else {
        // BidAmount sorting
        const amountDiff =
          sortBy === "1" ? a.BidAmount - b.BidAmount : b.BidAmount - a.BidAmount;
        if (amountDiff !== 0) return amountDiff;
      }

      // Tie-breaker 1: verified user
      const aVer = a.user.verified?.email && a.user.verified?.phoneNumber;
      const bVer = b.user.verified?.email && b.user.verified?.phoneNumber;
      if (aVer !== bVer) return aVer ? -1 : 1;

      // Tie-breaker 2: earliest bid
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    setTopBids((prev) => ({ ...prev, [localPost._id]: sorted[0] }));
  }, [bids, sortByMap[localPost._id]]);

  const handleCompleted = async (postId) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/posts/mark-Completed`, { postId }, {
        withCredentials: true,
      });

      // Local update
      setLocalPost(prev => {
        const updated = { ...prev };
        if (prev.user._id === user._id) updated.providerConfirmed = true;
        if (prev.selectedWinner === user._id) updated.workerConfirmed = true;
        return updated;
      });

    } catch (err) {
      console.error("Failed to mark as completed:", err);
    }
  };

  if (
    (localPost.user?.blockedUsers?.includes(user?._id)) ||
    (user?.blockedUsers?.includes(localPost.user?._id))
  ) return null;

  return (
    <div className="bg-white p-4 rounded-md shadow-md flex flex-col gap-2">
      <div className="flex gap-2 items-center mb-2">
          <div className="flex items-center gap-2">
            <img
              src={localPost.user.userImage || "..."}
              alt="User"
              className="w-12 h-12 rounded-full border-2 border-white object-cover"
            />
            <div>
              <button
                disabled={!hasToken}
                onClick={() =>
                  user._id === localPost.user._id
                    ? navigate(`/profile`)
                    : navigate(`/profile/${localPost.user._id}`)
                }
                className="flex items-center text-lg font-semibold cursor-pointer"
              >
                {localPost.user.username}
                {localPost.user.verified.email && localPost.user.verified.phoneNumber && (
                  <BadgeCheck className="h-5 w-5 text-teal-400 ml-1" />
                )}
              </button>
              <p className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(localPost.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        <div className="flex items-center ml-auto">
          <button disabled={!hasToken} onClick={() => toggleSavePost(localPost._id)} className="mr-4 cursor-pointer">
            {user?.savedPosts?.includes(localPost._id) ? (
              <Bookmark size={24} className="text-teal-400 fill-teal-400" />
            ) : (
              <Bookmark size={24} className="text-gray-400" />
            )}
          </button>
          <button className="mr-4">
            <MoreVertical size={24} className="text-gray-400 cursor-pointer" onClick={() => hasToken && setActiveOptionsPost(localPost)} />
          </button>
        </div>
      </div>

      <p>{localPost.postDescription}</p>
      {localPost.mediaUrls?.length > 0 && <ImageSlider mediaUrls={localPost.mediaUrls} />}

      {/* Buttons */}
      <div className="flex items-center">
        <button disabled={!hasToken} className="mr-4 cursor-pointer" onClick={() => setActiveBidPost(localPost)}>
          <Gavel size={24} />
        </button>
        <button disabled={!hasToken} className="mr-4 cursor-pointer" onClick={() => setActiveCommentPost(localPost)}>
          <MessageCircle size={24} />
        </button>
        <button disabled={!hasToken} onClick={() => setActiveSendPost(localPost)}>
          <Send className="rotate-[19deg] cursor-pointer" size={24} />
        </button>

        {/* Sort Bids Dropdown */}
        <div className="relative ml-auto">
          <button
            disabled={!hasToken}
            onClick={() => setDropdownPostId(dropdownPostId === localPost._id ? null : localPost._id)}
            className="flex items-center px-3 py-1 border rounded-md bg-white text-sm shadow-sm hover:bg-gray-50 cursor-pointer"
          >
            Sort Bids
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          {dropdownPostId === localPost._id && (
            <div className="absolute right-0 bottom-full mb-2 w-36 bg-white border border-gray-200 rounded-md shadow-lg z-10">
              <ul className="py-1 text-sm text-gray-700">
                <li>
                  <button
                    onClick={() => {
                      setSortByMap(prev => ({ ...prev, [localPost._id]: "-1" }));
                      setDropdownPostId(null);
                    }}
                    className="block w-full px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    Highest
                    {sortByMap[localPost._id] === "-1" && <span className="ml-1">✅</span>}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setSortByMap(prev => ({ ...prev, [localPost._id]: "1" }));
                      setDropdownPostId(null);
                    }}
                    className="block w-full px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    Lowest
                    {sortByMap[localPost._id] === "1" && <span className="ml-1">✅</span>}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setSortByMap(prev => ({ ...prev, [localPost._id]: "rating" }));
                      setDropdownPostId(null);
                    }}
                    className="block w-full px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    Ratings
                    {sortByMap[localPost._id] === "rating" && <span className="ml-1">✅</span>}
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Top Bid & Completion UI */}
      {localPost.status === "open" && (
        <div className="mt-2 text-sm text-gray-600">
          {topBid ? (
            <div className="mb-1">
              <p className="flex items-center gap-1">
                <span className="font-semibold text-black">{topBid.BidAmount}₹ bid by </span>
                <button disabled={shouldBlur || !hasToken} onClick={() => {
                  if (user._id === topBid.user._id) navigate(`/profile`);
                  else navigate(`/profile/${topBid.user._id}`);
                }} className={`font-semibold text-black ${shouldBlur ? "blur-sm" : ""} cursor-pointer `}>
                  {shouldBlur ? "anonymous" : `@${topBid.user.username} `}
                </button>
                {topBid.user.verified.email && topBid.user.verified.phoneNumber && <BadgeCheck className="h-5 w-5 text-teal-400 cursor-pointer" />}
              </p>
            </div>
          ) : <span>No bids yet.</span>}
          {/* {socketError && (
            <div className="p-4 text-red-500">Connection error: {socketError}. Please try refreshing the page or logging in again.</div>
          )} */}
        </div>
      )}

      {winningBid && (
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-gray-800">Winning Bid</h2>
          <p className="flex items-center flex-wrap gap-2 mt-1 text-gray-700">
            <span className="font-medium text-black">{winningBid.BidAmount}₹ bid by</span>

            <button
              disabled={shouldBlur || !hasToken}
              onClick={() => {
                const isSelf = user._id === winningBid.user._id;
                navigate(isSelf ? `/profile` : `/profile/${winningBid.user._id}`);
              }}
              className={`font-semibold text-black transition duration-150 ${
                shouldBlur ? "blur-sm cursor-not-allowed" : "hover:underline cursor-pointer"
              }`}
            >
              {shouldBlur ? "anonymous" : `@${winningBid.user.username}`}
            </button>

            {winningBid.user.verified?.email && winningBid.user.verified?.phoneNumber && (
              <BadgeCheck className="h-5 w-5 text-teal-500" title="Verified user" />
            )}
          </p>
        </div>
      )}

      {/* Completion Controls */}
      {localPost.status === "winnerSelected" &&
        (user._id === localPost.user._id || user._id === localPost.selectedWinner) && (
          <div className="mt-4 p-4 border-t border-gray-300">
            <h3 className="text-lg text-center font-semibold mb-4">Job Completion</h3>
            <div className="flex justify-between items-center gap-4 flex-wrap">
              {/* Provider */}
              <div className="flex-1">
                <p className="mb-1 font-medium">Provider Confirmation</p>
                {user._id === localPost.user._id ? (
                  !localPost.providerConfirmed ? (
                    <button
                      onClick={() => handleCompleted(localPost._id)}
                      className="w-full bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600 cursor-pointer"
                    >
                      Mark as Completed
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-gray-300 text-gray-600 px-4 py-2 rounded mb-2 cursor-pointer"
                    >
                      Completed
                    </button>
                  )
                ) : (
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-600 px-4 py-2 rounded cursor-pointer"
                  >
                    {localPost.providerConfirmed ? "Completed" : "In Progress"}
                  </button>
                )}
              </div>

              {/* Worker */}
              <div className="flex-1">
                <p className="mb-1 text-right font-medium">Worker Confirmation</p>
                {user._id === localPost.selectedWinner ? (
                  !localPost.workerConfirmed ? (
                    <button
                      onClick={() => handleCompleted(localPost._id)}
                      className="w-full bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600 cursor-pointer"
                    >
                      Job Done
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-gray-300 text-gray-600 px-4 py-2 rounded mb-2 cursor-pointer"
                    >
                      Completed
                    </button>
                  )
                ) : (
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-600 px-4 py-2 rounded cursor-pointer"
                  >
                    {localPost.workerConfirmed ? "Completed" : "In Progress"}
                  </button>
                )}
              </div>
            </div>

            {/* Single Review Component Rendered Below */}
            {(((user._id === localPost.user._id && !localPost?.reviewedByProvider) ||( user._id === localPost.selectedWinner && !localPost?.reviewedByWorker))) && reviews?.[localPost?._id] === undefined && (
              <div className="mt-4">
                <ReviewAndRatingForm
                  targetUserType={user._id === localPost.user._id ? "worker" : "provider"}
                  post={post}
                  setReviewSubmitted ={setReviewSubmitted}
                />
              </div>
            )}
          </div>
      )}

      {rating && (
        <div className="mt-4 p-4 border-t border-gray-200 bg-gray-50 rounded">
          <h3 className="text-lg font-semibold mb-2">
            Review by{" "}
            <button
              className="cursor-pointer"
              onClick={() => {
                const isSelf = localPost.user._id === rating.from._id;
                navigate(isSelf ? `/profile` : `/profile/${rating.from._id}`);
              }}
            >
              @{rating.from.username}
            </button>
          </h3>

          {/* ⭐ Stars */}
          <div className="flex items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${i < rating.rating ? "text-yellow-400" : "text-gray-300"}`}
                fill={i < rating.rating ? "#facc15" : "none"}
              />
            ))}
          </div>

          {/* 💬 Review Text */}
          <p className="text-gray-700">{rating.review}</p>
        </div>
      )}

    </div>
  );
};

export default PostCard;
