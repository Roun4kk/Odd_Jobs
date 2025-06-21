import useAuth from "../hooks/useAuth";
import { X, Copy, Flag, DollarSign, Lock, Unlock, Trash2 } from "lucide-react";
import { useState } from "react";
import axios from "axios";
import useIsMobile from "../hooks/useIsMobile.js";

function PostOptionsOverlay({ post, onClose, setPosts }) {
  const { user } = useAuth();
  const [openReport, setOpenReport] = useState(false);
  const [reportText, setReportText] = useState("");
  const [deleteComp, setDeleteComp] = useState(false);
  const [openBidRange, setOpenBidRange] = useState(false);
  const [minBid, setMinBid] = useState(post.minimumBid);
  const [maxBid, setMaxBid] = useState(post.maximumBid);
  const isMobile = useIsMobile();

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
    alert("Link copied to clipboard!");
  };

  const handleSetBidRange = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/posts/setBidRange`, {
        postId: post._id,
        minBid: Number(minBid),
        maxBid: Number(maxBid),
      }, { withCredentials: true });

      setPosts(prevPosts =>
        prevPosts.map(p =>
          p._id === post._id
            ? { ...p, minimumBid: Number(minBid), maximumBid: Number(maxBid) }
            : p
        )
      );

      setOpenBidRange(false);
      setMinBid('');
      setMaxBid('');
      onClose();
      alert("Bid range updated!");
    } catch (err) {
      console.error("Failed to set bid range:", err);
    }
  };

  const handleSendReport = async (userId) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/report/${userId}`, {
        text: reportText,
        postId: post._id,
      }, { withCredentials: true });

      setReportText("");
      setOpenReport(false);
      onClose();
      alert("Report sent successfully!");
    } catch (err) {
      console.error("Failed to send report:", err);
    }
  };

  const handleCloseBidding = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/posts/closeBidding`, {
        postId: post._id
      }, { withCredentials: true });
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p._id === post._id
            ? { ...p, status: "closed" }
            : p
        ));
      onClose();
    } catch (err) {
      console.error("Failed to close bidding:", err);
    }
  };

  const handleOpenBidding = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/posts/openBidding`, {
        postId: post._id
      }, { withCredentials: true });
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p._id === post._id
            ? { ...p, status: "open" }
            : p
        ));
      onClose();
    } catch (err) {
      console.error("Failed to open bidding:", err);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/posts`, {
        withCredentials: true,
        data: { postId: post._id },
      });
      setPosts(prevPosts =>
        prevPosts.filter(p => p._id !== post._id)
      );
      setDeleteComp(false);
      onClose();
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  // Modal UI for both Desktop and Mobile
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center">
      <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-2xl relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Post Options</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition">
            <X className="w-6 h-6 text-gray-600 hover:text-black" />
          </button>
        </div>
        <div className="space-y-2">
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200 text-sm font-medium text-gray-700"
          >
            <Copy className="w-5 h-5 text-gray-600" />
            <span>Copy Post Link</span>
          </button>
          {post?.user?._id !== user._id && (
            <button
              onClick={() => setOpenReport(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200 text-sm font-medium text-gray-700"
            >
              <Flag className="w-5 h-5 text-gray-600" />
              <span>Report</span>
            </button>
          )}
          {post?.user?._id === user._id && (post?.status === "open" || post?.status === "closed") && (
            <button
              onClick={() => post?.status === "open" ? handleCloseBidding() : handleOpenBidding()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200 text-sm font-medium text-gray-700"
            >
              {post?.status === "open" ? (
                <Lock className="w-5 h-5 text-gray-600" />
              ) : (
                <Unlock className="w-5 h-5 text-gray-600" />
              )}
              <span>{post?.status === "open" ? "Close Bidding" : "Open Bidding"}</span>
            </button>
          )}
          {post?.user?._id === user._id && post.status === "open" && (
            <button
              onClick={() => setOpenBidRange(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200 text-sm font-medium text-gray-700"
            >
              <DollarSign className="w-5 h-5 text-gray-600" />
              <span>Set Bid Range</span>
            </button>
          )}
          {post?.user?._id === user._id && post.status === "open" && (
            <button
              onClick={() => setDeleteComp(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-red-400 text-red-500 hover:bg-red-50 transition-colors duration-200 text-sm font-medium"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
              <span>Delete</span>
            </button>
          )}
        </div>

        {/* Sub-overlays */}
        {openReport && (
          <div className="fixed inset-0 z-60 bg-black/50 flex justify-center items-center">
            <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-2xl relative">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Report Post</h2>
                <button onClick={() => { setOpenReport(false); onClose(); }} className="p-2 rounded-full hover:bg-gray-100 transition">
                  <X className="w-6 h-6 text-gray-600 hover:text-black" />
                </button>
              </div>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg resize-none h-32 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-sm"
                placeholder="Please provide a reason for reporting this post (optional)"
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
              />
              <button
                onClick={() => handleSendReport(post.user._id)}
                className="w-full mt-4 bg-teal-500 text-white px-4 py-2 rounded-full hover:bg-teal-600 transition-colors duration-200 text-sm font-medium"
              >
                Send Report
              </button>
            </div>
          </div>
        )}
        {deleteComp && post.status === "open" && (
          <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                Are you sure you want to delete this post?
              </h2>
              <p className="text-sm text-gray-600 text-center mb-6">
                This action cannot be undone.
              </p>
              <div className="flex justify-between gap-4">
                <button
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition duration-200 text-sm font-semibold"
                  onClick={handleDelete}
                >
                  Delete
                </button>
                <button
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400 transition duration-200 text-sm font-semibold"
                  onClick={() => setDeleteComp(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {openBidRange && post.status === "open" && (
          <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                Set Bid Range
              </h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Minimum Bid</label>
                <input
                  type="number"
                  className="mt-1 block w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  value={minBid}
                  placeholder={post.minimumBid}
                  onChange={(e) => setMinBid(e.target.value)}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700">Maximum Bid</label>
                <input
                  type="number"
                  className="mt-1 block w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  value={maxBid}
                  placeholder={post.maximumBid}
                  onChange={(e) => setMaxBid(e.target.value)}
                />
              </div>
              <div className="flex justify-between gap-4">
                <button
                  className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition duration-200 text-sm font-semibold"
                  onClick={handleSetBidRange}
                  disabled={minBid < 0 || (maxBid && maxBid < minBid)}
                >
                  Save
                </button>
                <button
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400 transition duration-200 text-sm font-semibold"
                  onClick={() => setOpenBidRange(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PostOptionsOverlay;