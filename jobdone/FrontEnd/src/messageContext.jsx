import { createContext, useState, useCallback, useEffect } from "react";
import axios from "axios";
import socket from "./socket.js";
import useAuth from "./hooks/useAuth.jsx";

export const MessageContext = createContext();


export function MessageProvider({ children }) {
  const { user, loading } = useAuth();
  const [unseenMessages, setUnseenMessages] = useState({});
  const [unseenConversations, setUnseenConversations] = useState(0);

  const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  const fetchUnseenCounts = useCallback(async () => {
    if (loading || !user?._id || !isValidObjectId(user._id)) {
      console.warn("Invalid user ID or auth loading, skipping unseen counts fetch", { user, loading });
      return;
    }
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/unseen-counts`, {
        withCredentials: true,
      });
      setUnseenMessages(res.data);
      const count = Object.values(res.data).filter((count) => Number(count) > 0).length;
      setUnseenConversations(count);
      console.log("Context fetched unseen counts:", res.data, "Count:", count);
    } catch (err) {
      console.error("Failed to fetch unseen counts in context:", err.response?.data || err.message);
    }
  }, [user?._id, loading]);

  const updateUnseenCounts = useCallback((newUnseen) => {
    const count = Object.values(newUnseen).filter((count) => Number(count) > 0).length;
    setUnseenConversations(count);
    console.log("Updated unseen counts:", newUnseen, "Count:", count);
  }, []);

  useEffect(() => {
    console.log("MessageProvider auth state:", { user, loading });
    
    if (!loading && user?._id && isValidObjectId(user._id)) {
      fetchUnseenCounts();

      // Handle receiving new messages
      const handleReceiveMessage = (message) => {
        console.log("Context: Received message", message);
        if (message.receiver.toString() === user._id && !message.deletedFor.includes(user._id)) {
          setUnseenMessages((prev) => {
            const newUnseen = { ...prev };
            const senderId = message.sender.toString();
            newUnseen[senderId] = (newUnseen[senderId] || 0) + 1;
            updateUnseenCounts(newUnseen);
            return newUnseen;
          });
        }
      };

      // Handle marking messages as seen
      const handleMarkMessagesSeen = ({ userId }) => {
        console.log("Context: Marking messages seen for userId:", userId);
        setUnseenMessages((prev) => {
          const newUnseen = { ...prev, [userId]: 0 };
          updateUnseenCounts(newUnseen);
          return newUnseen;
        });
      };

      // Set up socket listeners
      socket.on("receiveMessage", handleReceiveMessage);
      socket.on("markMessagesSeen", handleMarkMessagesSeen);

      // Cleanup function
      return () => {
        socket.off("receiveMessage", handleReceiveMessage);
        socket.off("markMessagesSeen", handleMarkMessagesSeen);
      };
    }
  }, [user?._id, loading, fetchUnseenCounts, updateUnseenCounts]);

  return (
    <MessageContext.Provider
      value={{
        unseenMessages,
        setUnseenMessages,
        unseenConversations,
        setUnseenConversations,
        fetchUnseenCounts,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}