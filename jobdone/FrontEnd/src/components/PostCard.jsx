// Imports remain the same
import { BadgeCheck, Bookmark, Gavel, MessageCircle, Send, MoreVertical ,Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import socket from "../socket.js";
import { useNavigate , useLocation} from "react-router-dom";
import ImageSlider from "./ImageSlider";
import useSocketRoomJoin from "../hooks/socketRoomJoin.js";
import ReviewAndRatingForm from "./reviewAndRatingForm.jsx";
import axios from "axios";
import useAuth from "../hooks/useAuth.jsx";
import { differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks } from "date-fns";
import { useSortBy } from "../SortByContext.jsx";
import { useTheme } from "../ThemeContext"; // Import useTheme

const PostCard = ({
  userProfile,
  post,
  setTopBids,
  topBid,
  toggleSavePost,
  setActiveCommentPost,
  setActiveSendPost,
  setActiveOptionsPost,
  shouldBlur,
  feedKey,
  sortByMap,
  dropdownPostId,
  setDropdownPostId,
  hasToken,
  setReviewSubmitted,
  reviews
}) => {
  const {updatePostSort} = useSortBy();
  const navigate = useNavigate();
  const location = useLocation();
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef(null);
  const { user } = useAuth();
  const [localPost, setLocalPost] = useState(post);
  const [bids, setBids] = useState(post.bids || []);
  const [socketError, setSocketError] = useState(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const rating = userProfile?.ratings?.find(r => r.post === post?._id) ;
  const winningBid = post?.bids?.find(bid => bid._id === post?.winningBidId);
  const shouldBlurWinner = !(winningBid?.user?._id === user?._id || post?.user?._id === user?._id ); 
  const { theme } = useTheme(); // Get current theme

  const buttonStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
      : '#2dd4bf' // This is the hex code for teal-400
  };
  useEffect(() => {
    const el = textRef.current;
    if (el && el.scrollHeight > el.clientHeight) {
      setIsTruncated(true);
    }
  }, [localPost.postDescription, showFullDescription]);

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

  function formatCustomTimeAgo(date) {
    const now = new Date();
    const diffMins = differenceInMinutes(now, date);

    if (diffMins < 60) {
      return `${diffMins}m`;
    }

    const diffHours = differenceInHours(now, date);
    if (diffHours < 24) {
      return `${diffHours}h`;
    }

    const diffDays = differenceInDays(now, date);
    if (diffDays < 7) {
      return `${diffDays}d`;
    }

    const diffWeeks = differenceInWeeks(now, date);
    return `${diffWeeks}w`;
  }
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
    <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-md dark:shadow-lg dark:shadow-black/20 flex flex-col gap-2 min-h-[200px] border border-gray-200 dark:border-gray-700">
      <div className="flex gap-2 mt-0">
          <div className="flex items-center gap-2">
            <button
                disabled={!hasToken}
                onClick={() =>
                  user._id === localPost.user._id
                    ? navigate(`/profile`)
                    : navigate(`/profile/${localPost.user._id}`)
                }
              >
              <img
                src={localPost.user.userImage || "..."}
                alt="User"
                className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-500 object-cover"
              />
            </button>
            <div className="flex flex-col items-start justify-start p-0 m-0">
              <button
                disabled={!hasToken}
                onClick={() =>
                  user._id === localPost.user._id
                    ? navigate(`/profile`)
                    : navigate(`/profile/${localPost.user._id}`)
                }
                className="flex items-center text-lg font-semibold cursor-pointer dark:text-white"
              >
                <div className="max-w-[140px] md:max-w-[200px] truncate" title={localPost.user.username} >
                  {localPost.user.username}
                </div>
                {localPost?.user?.verified?.email && localPost?.user?.verified?.phoneNumber && (
                  <BadgeCheck className="h-5 w-5 text-teal-400 ml-1" />
                )}
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatCustomTimeAgo(new Date(localPost.createdAt))}
              </p>
            </div>
          </div>
        <div className="flex items-start justify-start p-0 m-0 ml-auto">
          <button disabled={!hasToken} onClick={() => toggleSavePost(localPost._id)} className="mr-4 cursor-pointer">
            {user?.savedPosts?.includes(localPost._id) ? (
              <Bookmark
                size={24}
                className="text-teal-400 dark:text-white fill-teal-400 dark:fill-white"
              />
            ) : (
              <Bookmark
                size={24}
                className="text-gray-400 dark:text-gray-500"
              />
            )}
          </button>
          <button>
            <MoreVertical size={24} className="text-gray-400 dark:text-gray-500 dark:hover:text-white cursor-pointer" onClick={() => hasToken && setActiveOptionsPost(localPost)} />
          </button>
        </div>
      </div>

      <div className="relative">
        <p
          ref={textRef}
          className={`text-gray-800 dark:text-gray-100 whitespace-pre-wrap transition-all duration-300 ${
            showFullDescription ? "" : "line-clamp-3"
          }`}
        >
          {localPost.postDescription}
        </p>

        {isTruncated && (
          <button
            onClick={() => setShowFullDescription(prev => !prev)}
            className="text-sm mt-1 text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
          >
            {showFullDescription ? "Show less" : "Read more"}
          </button>
        )}
      </div>
      {localPost.mediaUrls?.length > 0 && <ImageSlider mediaUrls={localPost.mediaUrls} />}

      {/* Buttons */}
      <div className="flex items-center text-gray-700 dark:text-gray-300">
        <button disabled={!hasToken} className="mr-4 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => navigate(`/bid/${post._id}?feed=${feedKey}`, {state: { backgroundLocation: { pathname: location.pathname } }})}>
          <Gavel size={24} />
        </button>
        <button disabled={!hasToken} className="mr-4 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => setActiveCommentPost(localPost)}>
          <MessageCircle size={24} />
        </button>
        <button disabled={!hasToken} onClick={() => setActiveSendPost(localPost)} className="hover:text-black dark:hover:text-white">
          <Send className="rotate-[19deg] cursor-pointer" size={24} />
        </button>

        {/* Sort Bids Dropdown */}
        <div className="relative ml-auto">
          <button
            disabled={!hasToken}
            onClick={() => setDropdownPostId(dropdownPostId === localPost._id ? null : localPost._id)}
            className="flex items-center px-3 py-1 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
          >
            Sort Bids
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          {dropdownPostId === localPost._id && (
            <div className="absolute right-0 bottom-full mb-2 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
              <ul className="py-1 text-sm text-gray-700 dark:text-gray-300">
                <li>
                  <button
                    onClick={() => {
                      updatePostSort(feedKey, localPost._id, "-1");
                      setDropdownPostId(null);
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    Highest
                    {sortByMap[localPost._id] === "-1" && <span className="ml-1">✅</span>}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      updatePostSort(feedKey, localPost._id, "1");
                      setDropdownPostId(null);
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    Lowest
                    {sortByMap[localPost._id] === "1" && <span className="ml-1">✅</span>}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      updatePostSort(feedKey, localPost._id, "rating");
                      setDropdownPostId(null);
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
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
      {localPost.status !== "winnerSelected" && localPost.status !== "completed"  && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {topBid ? (
            <div className="mb-1">
              <div className="flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap">
                <span className="font-semibold text-black dark:text-white shrink-0">
                  {topBid.BidAmount}₹ bid by
                </span>
                <button
                  disabled={shouldBlur || !hasToken}
                  onClick={() => {
                    if (user._id === topBid.user._id) navigate(`/profile`);
                    else navigate(`/profile/${topBid.user._id}`);
                  }}
                  className={`font-semibold text-black dark:text-white ${
                    shouldBlur ? "blur-sm" : ""
                  } cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap min-w-0`}
                >
                  {shouldBlur ? "anonymous" : `@${topBid.user.username}`}
                </button>
                {topBid?.user?.verified?.email && topBid?.user?.verified?.phoneNumber && (
                  <BadgeCheck className="h-5 w-5 text-teal-400 shrink-0" />
                )}
              </div>
            </div>
          ) : <span className="dark:text-gray-500">No bids yet.</span>}
        </div>
      )}

      {winningBid && (
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Winning Bid</h2>
          <p className="flex items-center flex-wrap gap-2 mt-1 text-gray-700 dark:text-gray-300">
            <span className="font-medium text-black dark:text-white">{winningBid.BidAmount}₹ bid by</span>

            <button
              disabled={shouldBlurWinner || !hasToken}
              onClick={() => {
                const isSelf = user._id === winningBid.user._id;
                navigate(isSelf ? `/profile` : `/profile/${winningBid.user._id}`);
              }}
              className={`font-semibold text-black dark:text-white transition duration-150 ${
                shouldBlurWinner ? "blur-sm cursor-not-allowed" : "hover:underline cursor-pointer"
              }`}
            >
              {shouldBlurWinner ? "anonymous" : `@${winningBid.user.username}`}
            </button>

            {winningBid.user.verified?.email && winningBid.user.verified?.phoneNumber && (
              <BadgeCheck className="h-5 w-5 text-teal-500" title="Verified user" />
            )}
          </p>
        </div>
      )}

      {/* Completion Controls */}
      {localPost.status === "winnerSelected" &&
        (user?._id === localPost?.user?._id || user?._id === localPost?.selectedWinner) && (
          <div className="mt-4 p-4 border-t border-gray-300 dark:border-gray-600">
            <h3 className="text-lg text-center font-semibold mb-4 dark:text-white">Job Completion</h3>
            <div className="flex justify-between items-center gap-4 flex-wrap">
              {/* Provider */}
              <div className="flex-1">
                <p className="mb-1 font-medium dark:text-gray-200">Provider Confirmation</p>
                {user._id === localPost.user._id ? (
                  !localPost.providerConfirmed ? (
                    <button
                      onClick={() => handleCompleted(localPost._id)}
                      className="w-full  text-white px-4 py-2 rounded hover:bg-teal-600 cursor-pointer"
                      style={buttonStyle}
                    >
                      Mark as Completed
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 px-4 py-2 rounded mb-2 cursor-pointer"
                    >
                      Completed
                    </button>
                  )
                ) : (
                  <button
                    disabled
                    className="w-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 px-4 py-2 rounded cursor-pointer"
                  >
                    {localPost.providerConfirmed ? "Completed" : "In Progress"}
                  </button>
                )}
              </div>

              {/* Worker */}
              <div className="flex-1">
                <p className="mb-1 text-right font-medium dark:text-gray-200">Worker Confirmation</p>
                {user._id === localPost.selectedWinner ? (
                  !localPost.workerConfirmed ? (
                    <button
                      onClick={() => handleCompleted(localPost._id)}
                      className="w-full text-white px-4 py-2 rounded hover:bg-teal-600 cursor-pointer"
                      style={buttonStyle}
                    >
                      Job Done
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 px-4 py-2 rounded mb-2 cursor-pointer"
                    >
                      Completed
                    </button>
                  )
                ) : (
                  <button
                    disabled
                    className="w-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 px-4 py-2 rounded cursor-pointer"
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
        <div className="mt-4 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 rounded">
          <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">
            Review by{" "}
            <button
              className="cursor-pointer dark:text-teal-400"
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
                className={`w-5 h-5 ${i < rating.rating ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}`}
                fill={i < rating.rating ? "#facc15" : "none"}
              />
            ))}
          </div>

          {/* 💬 Review Text */}
          <p className="text-gray-700 dark:text-gray-300">{rating.review}</p>
        </div>
      )}

    </div>
  );
};

export default PostCard;