import useAuth from "../hooks/useAuth";
import { X, Copy } from "lucide-react";
import { useState } from "react";
import axios from "axios";

function PostOptionsOverlay({ post, onClose , setPosts }) {
  const { user } = useAuth();
  const [openReport , setOpenReport] = useState(false);
  const [reportText, setReportText] = useState("");
  const [deleteComp , setDeleteComp] = useState(false);
  const [openBidRange, setOpenBidRange] = useState(false);
  const [minBid, setMinBid] = useState(post.minimumBid);
  const [maxBid, setMaxBid] = useState(post.maximumBid);

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
      }, {
        withCredentials: true,
      });

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
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/report/${userId}`, {
        text: reportText,
        postId: post._id,
      }, {
        withCredentials: true,
      });

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
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/posts/closeBidding`,{
        postId: post._id
      },{
        withCredentials: true
      })
      setPosts(prevPosts =>
                prevPosts.map(p =>
                  p._id === post._id
                    ? {
                        ...p,
                        status : "closed"
                      }
                    : p
                ));
      onClose();
    } catch (err) {
      console.error("Failed to send report:", err);
    }
  }

  const handleOpenBidding = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/posts/openBidding`,{
        postId: post._id
      },{
        withCredentials: true
      })
      setPosts(prevPosts =>
                prevPosts.map(p =>
                  p._id === post._id
                    ? {
                        ...p,
                        status : "open"
                      }
                    : p
                ));
      onClose();
    } catch (err) {
      console.error("Failed to send report:", err);
    }
  }

  const handleDelete =  async () =>{
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
      console.error("Failed to send report:", err);
    }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center">
      <div className="bg-white w-full max-w-sm p-5 rounded-xl shadow-xl relative">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Post Options</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-600 hover:text-black cursor-pointer " />
          </button>
        </div>
        <div className="space-y-3">
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-md border hover:bg-gray-100 cursor-pointer transition-colors duration-200"
          >
            <Copy size={18} />
            <span>Copy Post Link</span>
          </button>
          {post?.user?._id !== user._id  && (<button onClick = {() => setOpenReport(true)}className=" w-full flex items-center gap-2 px-4 py-2 rounded-md border hover:bg-gray-100 cursor-pointer transition-colors duration-200">
            Report 
          </button>)}
          {post?.user?._id === user._id  && (post?.status 
          === "open" || post?.status 
          === "closed") && (<button onClick = { () => {post?.status 
          === "open" ? handleCloseBidding() : handleOpenBidding()}}className="w-full flex items-center gap-2 px-4 py-2 rounded-md border hover:bg-gray-100 cursor-pointer transition-colors duration-200">
            {post?.status === 'open' ? "Close Bidding" : "Open Bidding"}
          </button>)}
          {post?.user?._id === user._id && post.status === "open" && (<button onClick={() => setOpenBidRange(true)} className="w-full flex items-center gap-2 px-4 py-2 rounded-md border hover:bg-gray-100 cursor-pointer transition-colors duration-200">
            Set Bid Range
          </button>)}
          {post?.user?._id === user._id  && post.status === "open" && (<button onClick = {() => setDeleteComp(true)}className="w-full flex items-center gap-2 px-4 py-2 rounded-md border border-red-400 text-red-400 hover:bg-gray-100 cursor-pointer transition-colors duration-200">
            Delete
          </button>)}
          {/* Add more options here in future (e.g., Report, Mute, etc.) */}
        </div>
        {openReport && (
          <div className="fixed inset-0 z-100 bg-black/50 flex justify-center items-center">
            <div className="bg-white w-full max-w-sm p-5 rounded-xl shadow-xl relative">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Report Post</h2>
                <button onClick={() => {setOpenReport(false) , onClose()}}>
                  <X className="w-5 h-5 text-gray-600 hover:text-black cursor-pointer" />
                </button>
              </div>
              <textarea
                className="w-full mt-4 p-2 border rounded-md resize-none h-24 focus:outline-none"
                placeholder={"Please provide a reason for reporting this post (optional)"}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
              />
              <button
                onClick={() => { handleSendReport(post.user._id)}}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 rounded-md border hover:bg-gray-100 cursor-pointer transition-colors duration-200"
              >
                Send Report
              </button>
            </div>
          </div>
        )}
        {deleteComp && post.status === "open" && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-100">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
                Are you sure you want to delete this post?
              </h2>
              <p className="text-sm text-gray-600 text-center mb-6">
                This action cannot be undone.
              </p>

              <div className="flex justify-between">
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition cursor-pointer"
                  onClick={() => {handleDelete()
                  }}
                >
                  Delete
                </button>

                <button
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition cursor-pointer"
                  onClick={() => {
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {openBidRange && post.status === "open" && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-100">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
                Set Bid Range
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Minimum Bid</label>
                <input
                  type="number"
                  className="mt-1 block w-full border rounded-md p-2"
                  value={minBid}
                  placeholder= {post.minimumBid}
                  onChange={(e) => setMinBid(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Maximum Bid</label>
                <input
                  type="number"
                  className="mt-1 block w-full border rounded-md p-2"
                  value={maxBid}
                  placeholder= {post.maximumBid}
                  onChange={(e) => setMaxBid(e.target.value)}
                />
              </div>

              <div className="flex justify-between">
                <button
                  className="px-4 py-2 bg-teal-400 text-white rounded-md hover:bg-teal-600 transition cursor-pointer"
                  onClick={handleSetBidRange}
                >
                  Save
                </button>
                <button
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition cursor-pointer"
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
