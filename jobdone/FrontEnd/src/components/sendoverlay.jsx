import React, { useState, useEffect, useCallback } from "react";
import { X, Copy, Send, Check } from "lucide-react";
import useAuth from "../hooks/useAuth";
import axios from "axios";
import socket from "../socket.js";
import useSocketRoomJoin from "../hooks/socketRoomJoin.js";

function SendOverlay({ post, onClose }) {
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [conversationUsers, setConversationUsers] = useState([]);
  const { user } = useAuth();
  const [socketError, setSocketError] = useState(null);

  useSocketRoomJoin(user?._id, setSocketError);   // ONE line

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get("/conversations", { withCredentials: true });
      const usersFromConversations = res.data
        .map((c) => c.user)
        .filter((u) => u._id !== user?._id);
      setConversationUsers(usersFromConversations);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
    alert("Link copied to clipboard!");
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
      return alert("Select at least one user to share with.");
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

    alert(`Post shared with ${selectedUsers.map((u) => u.username).join(", ")}`);
    setMessage("");
    setSelectedUsers([]);
    onClose();
  };

  const filteredUsers = conversationUsers.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center">
      <div className="bg-white w-full max-w-md p-4 rounded-xl shadow-lg relative h-[90vh] flex flex-col">
        <div className="flex justify-between items-center pb-2">
          <button className="opacity-0 pointer-events-none">X</button>
          <h2 className="text-lg font-semibold text-center">Share</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-600 hover:text-black" />
          </button>
        </div>
        {socketError && (
            <div className="p-4 text-red-500">
              Connection error: {socketError}. Please try refreshing the page or logging in again.
            </div>
          )}
        <input
          type="text"
          placeholder="Search by username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-3 mb-2 px-3 py-2 border rounded-md focus:outline-none"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredUsers.map((u) => {
            const isSelected = selectedUsers.some((sel) => sel._id === u._id);
            return (
              <div
                key={u._id}
                onClick={() => toggleUserSelection(u)}
                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer border ${
                  isSelected ? "bg-teal-100 border-teal-400" : "hover:bg-gray-100"
                }`}
              >
                <img src={u.userImage} alt={u.username} className="w-9 h-9 rounded-full object-cover" />
                <span className="font-medium text-sm">{u.username}</span>

                {isSelected && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedUsers.length > 0 && (
          <textarea
            className="w-full mt-4 p-2 border rounded-md resize-none h-24 focus:outline-none"
            placeholder={`Message to ${selectedUsers.length} user(s) (optional)`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        )}

        <div className="absolute bottom-4 right-4">
          {selectedUsers.length > 0 ? (
            <button
              onClick={handleSend}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-1 shadow-md"
            >
              <Send className="w-4 h-4" /> Share ({selectedUsers.length})
            </button>
          ) : (
            <button
              onClick={handleCopy}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 flex items-center gap-1 shadow-md"
            >
              <Copy className="w-4 h-4" /> Copy Link
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SendOverlay;
