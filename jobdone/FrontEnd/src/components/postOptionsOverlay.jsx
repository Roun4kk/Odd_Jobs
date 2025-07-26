import useAuth from "../hooks/useAuth";
import { X, Copy, Flag, IndianRupee, Lock, Unlock, Trash2 } from "lucide-react";
import { useState , useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import useIsMobile from "../hooks/useIsMobile.js";
import toast from "react-hot-toast";

function PostOptionsOverlay({ post, onClose, setPosts, onPostDelete }) {
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
    toast.success("Link copied to clipboard!");
  };
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "auto";
      };
    }
  }, [isMobile]);

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
      toast.success("Bid range updated!");
    } catch (err) {
      console.error("Failed to set bid range:", err);
      toast.error("Failed to update bid range");
    }
  };

  const handleSendReport = async (userId) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/report/${userId}`, {
        text: reportText,
        postId: post._id,
      }, { withCredentials: true });

      setReportText("");
      setOpenReport(false);
      onClose();
      toast.success("Report sent successfully!");
    } catch (err) {
      console.error("Failed to send report:", err);
      toast.error("Failed to send report");
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
      toast.success("Bidding closed successfully!");
      onClose();
    } catch (err) {
      console.error("Failed to close bidding:", err);
      toast.error("Failed to close bidding");
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
      toast.success("Bidding opened successfully!");
      onClose();
    } catch (err) {
      console.error("Failed to open bidding:", err);
      toast.error("Failed to open bidding");
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/posts`, {
        withCredentials: true,
        data: { postId: post._id },
      });
      
      if (onPostDelete) {
        onPostDelete(post._id);
      } else {
        setPosts(prevPosts =>
          prevPosts.filter(p => p._id !== post._id)
        );
      }
      
      toast.success("Post deleted successfully!");
      setDeleteComp(false);
      onClose();
    } catch (err) {
      console.error("Failed to delete post:", err);
      toast.error("Failed to delete post");
    }
  };

  const overlayContent =  (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center px-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-sm p-6 rounded-2xl shadow-2xl relative ">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Post Options</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <X className="w-6 h-6 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white" />
          </button>
        </div>
        <div className="space-y-2">
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span>Copy Post Link</span>
          </button>
          {post?.user?._id !== user._id && (
            <button
              onClick={() => setOpenReport(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              <Flag className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span>Report</span>
            </button>
          )}
          {post?.user?._id === user._id && (post?.status === "open" || post?.status === "closed") && (
            <button
              onClick={() => post?.status === "open" ? handleCloseBidding() : handleOpenBidding()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              {post?.status === "open" ? (
                <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Unlock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
              <span>{post?.status === "open" ? "Close Bidding" : "Open Bidding"}</span>
            </button>
          )}
          {post?.user?._id === user._id && post.status === "open" && (
            <button
              onClick={() => setOpenBidRange(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              <IndianRupee className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span>Set Bid Range</span>
            </button>
          )}
          {post?.user?._id === user._id && post.status === "open" && (
            <button
              onClick={() => setDeleteComp(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-red-400 text-red-500 dark:text-red-400 dark:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 text-sm font-medium"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
              <span>Delete</span>
            </button>
          )}
        </div>

        {/* Sub-overlays */}
        {openReport && (
          <div className="fixed inset-0 z-60 bg-black/50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm p-6 rounded-2xl shadow-2xl relative">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Report Post</h2>
                <button onClick={() => { setOpenReport(false); onClose(); }} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white" />
                </button>
              </div>
              <textarea
                className="w-full p-3 border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 rounded-lg resize-none h-32 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-400/50 text-sm"
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 text-center">
                Are you sure you want to delete this post?
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
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
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-full hover:bg-gray-400 dark:hover:bg-gray-500 transition duration-200 text-sm font-semibold"
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 text-center">
                Set Bid Range
              </h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Bid</label>
                <input
                  type="number"
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-3 text-sm focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-400/50"
                  value={minBid}
                  placeholder={post.minimumBid}
                  onChange={(e) => setMinBid(e.target.value)}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Maximum Bid</label>
                <input
                  type="number"
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-3 text-sm focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-400/50"
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
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-full hover:bg-gray-400 dark:hover:bg-gray-500 transition duration-200 text-sm font-semibold"
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
  return createPortal(overlayContent, document.body);
}

export default PostOptionsOverlay;