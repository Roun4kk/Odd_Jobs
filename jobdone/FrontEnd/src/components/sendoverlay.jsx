import React, { useState, useEffect, useCallback } from "react";
import { X, Copy, Send, Check } from "lucide-react";
import useAuth from "../hooks/useAuth";
import axios from "axios";
import socket from "../socket.js";
import useSocketRoomJoin from "../hooks/socketRoomJoin.js";
import { useNavigate } from "react-router-dom";
import useIsMobile from "../hooks/useIsMobile.js";
import toast from "react-hot-toast";

function SendOverlay({ post, onClose }) {
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [conversationUsers, setConversationUsers] = useState([]);
  const { user } = useAuth();
  const [socketError, setSocketError] = useState(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [conversationLoading, setConversationLoading] = useState(false);

  useSocketRoomJoin(user?._id, setSocketError);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const fetchConversations = useCallback(async () => {
    setConversationLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/conversations`, { withCredentials: true });
      const usersFromConversations = res.data
        .map((c) => c.user)
        .filter((u) => u?._id !== user?._id);
      setConversationUsers(usersFromConversations);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setConversationLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
    toast.success("Link copied to clipboard!");
  };

  const toggleUserSelection = (u) => {
    setSelectedUsers((prev) =>
      prev.some((sel) => sel._id === u._id)
        ? prev.filter((sel) => sel._id !== u._id)
        : [...prev, u]
    );
  };

  const handleSend = () => {
    if (selectedUsers.length === 0) {
      return toast.error("Select at least one user to share with.");
    }

    selectedUsers.forEach((recipient, index) => {
      console.log(`Sending message ${index + 1}...`);
      socket.emit("sendMessage", {
        receiverId: recipient._id,
        type: "post",
        text: message.trim() || undefined,
        data: { postId: post._id },
      });
      console.log(`Message ${index + 1} emitted`);
    });
    navigate("/messages", { state: { newChatWith: selectedUsers[0] } });
    toast.success(`Post shared with ${selectedUsers.map((u) => u.username).join(", ")}`);
    setMessage("");
    setSelectedUsers([]);
    onClose();
  };

  const filteredUsers = conversationUsers.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  if (isMobile) {
    return (
      <div
          className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center"
          style={{ height: 'calc(100dvh - 4rem)' }}
        >
        <div className="bg-white w-full max-w-sm p-4 rounded-2xl shadow-2xl relative flex flex-col h-[80vh]">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
            <h2 className="text-lg font-semibold">Share Post</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
              <X className="w-6 h-6 text-gray-600 hover:text-black" />
            </button>
          </div>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search by username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-3 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
          />
          {conversationLoading && (
                <div className="flex items-center justify-center h-screen bg-white">
                  <div className="w-12 h-12 border-4 border-teal-500 border-dashed rounded-full animate-spin"></div>
                </div>
          )}
          {/* Scrollable User List */}
          <div className="flex-1 overflow-y-auto mt-2">
            {filteredUsers.map((u) => {
              const isSelected = selectedUsers.some((sel) => sel._id === u._id);
              return (
                <div
                  key={u._id}
                  onClick={() => toggleUserSelection(u)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border ${
                    isSelected ? "bg-teal-100 border-teal-400" : "hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <img
                    src={u.userImage || "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"}
                    alt={u.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="font-medium text-sm">{u.username}</span>
                  {isSelected && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Message Input and Actions */}
          {selectedUsers.length > 0 && (
            <textarea
              className="w-full mt-2 p-3 border border-gray-300 rounded-lg resize-none h-20 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              placeholder={`Message to ${selectedUsers.length} user(s) (optional)`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          )}

          {/* Fixed Action Bar */}
          <div className="border-t border-gray-200 pt-2 mt-2 flex justify-end gap-2">
            {selectedUsers.length > 0 ? (
              <button
                onClick={handleSend}
                className="bg-teal-500 text-white px-4 py-2 rounded-full hover:bg-teal-600 flex items-center gap-1 text-sm font-medium"
              >
                <Send className="w-4 h-4" /> Share ({selectedUsers.length})
              </button>
            ) : (
              <button
                onClick={handleCopy}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full hover:bg-gray-400 flex items-center gap-1 text-sm font-medium"
              >
                <Copy className="w-4 h-4" /> Copy Link
              </button>
            )}
          </div>

          {/* Socket Error */}
          {/* {socketError && (
            <div className="absolute bottom-16 left-0 right-0 p-3 text-red-500 text-sm border-t border-red-200 bg-red-50 text-center">
              Connection error: {socketError}. Please try refreshing the page or logging in again.
            </div>
          )} */}
        </div>
      </div>
    );
  }

  // Desktop UI
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center">
      <div className="bg-white w-full max-w-lg p-6 rounded-2xl shadow-2xl relative flex flex-col h-[80vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
          <h2 className="text-xl font-bold text-gray-800">Share Post</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-6 h-6 text-gray-600 hover:text-black" />
          </button>
        </div>

        {/* Search Input */}
        <input
          type="text"
          placeholder="Search by username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
        />

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-2">
            {filteredUsers.map((u) => {
              const isSelected = selectedUsers.some((sel) => sel._id === u._id);
              return (
                <div
                  key={u._id}
                  onClick={() => toggleUserSelection(u)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${
                    isSelected ? "bg-teal-100 border-teal-400" : "hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <img
                    src={u.userImage || "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"}
                    alt={u.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span className="font-medium text-sm">{u.username}</span>
                  {isSelected && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Message Input */}
        {selectedUsers.length > 0 && (
          <textarea
            className="w-full mt-4 p-3 border border-gray-300 rounded-lg resize-none h-24 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            placeholder={`Message to ${selectedUsers.length} user(s) (optional)`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          {selectedUsers.length > 0 ? (
            <button
              onClick={handleSend}
              className="bg-teal-500 text-white px-6 py-2 rounded-full hover:bg-teal-600 flex items-center gap-2 text-sm font-semibold"
            >
              <Send className="w-4 h-4" /> Share ({selectedUsers.length})
            </button>
          ) : (
            <button
              onClick={handleCopy}
              className="bg-gray-300 text-gray-800 px-6 py-2 rounded-full hover:bg-gray-400 flex items-center gap-2 text-sm font-semibold"
            >
              <Copy className="w-4 h-4" /> Copy Link
            </button>
          )}
        </div>

        {/* Socket Error */}
        {/* {socketError && (
          <div className="absolute bottom-4 left-0 right-0 p-3 text-red-500 text-sm border-t border-red-200 bg-red-50 text-center">
            Connection error: {socketError}. Please try refreshing the page or logging in again.
          </div>
        )} */}
      </div>
    </div>
  );
}

export default SendOverlay;