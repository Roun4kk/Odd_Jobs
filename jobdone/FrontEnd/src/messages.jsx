import Sidebar from "./Sidebar";
import useAuth from "./hooks/useAuth.jsx";
import { useState, useCallback, useEffect, useRef } from "react";
import { BadgeCheck, Paperclip, X, AlertCircle, ArrowLeft, MoreVertical } from "lucide-react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "./socket.js";
import SmallPostCard from "./components/smallPostCard";
import useSocketRoomJoin from "./hooks/socketRoomJoin.js";
import MessageComp from "./messageInfo.jsx";
import { useMessageContext } from "./hooks/useMessageContext.js";


function Messages() {
  const { state } = useLocation();
  const initialUser = state?.newChatWith;
  const [newMessage, setNewMessage] = useState("");
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const { user } = useAuth();
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [socketError, setSocketError] = useState(null);
  const [error, setError] = useState("");
  const [requests, setRequests] = useState([]);
  const [requestCount, setRequestCount] = useState(0);
  const [showRequests, setShowRequests] = useState(false);
  const { unseenMessages, setUnseenMessages, fetchUnseenCounts } = useMessageContext();
  const [comp, setComp] = useState(false);

  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  useSocketRoomJoin(user?._id, setSocketError);

  const markMessagesAsSeen = async (userId) => {
    if (!user?._id || !isValidObjectId(user._id) || !isValidObjectId(userId)) {
      setError("Invalid user ID. Please try again.");
      return;
    }
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/mark-seen/${userId}`, {}, {
        withCredentials: true,
      });
      socket.emit("markMessagesSeen", { userId });
      setUnseenMessages((prev) => ({
        ...prev,
        [userId]: 0,
      }));
      console.log(`Marked messages as seen for userId: ${userId}`);
    } catch (err) {
      console.error("Failed to mark messages as seen:", err.response?.data || err.message);
      setError(`Failed to mark messages as seen: ${err.response?.data?.error || err.message}`);
    }
  };

  const fetchMessages = async (userId) => {
    if (!user?._id || !isValidObjectId(user._id) || !isValidObjectId(userId)) {
      setError("Invalid user ID. Please try again.");
      return;
    }
    try {
      setLoadingMessages(true);
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/messages/${userId}`, {
        withCredentials: true,
      });
      console.log("Fetched messages:", res.data);
      setMessages(res.data.filter((msg) => !msg.deletedFor.includes(user._id)));
      setLoadingMessages(false);
      await markMessagesAsSeen(userId);
    } catch (err) {
      console.error("Failed to fetch messages:", err.response?.data || err.message);
      setError(`Failed to fetch messages: ${err.response?.data?.error || err.message}`);
      setLoadingMessages(false);
    }
  };

  const updateConversationTime = (message) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (
          conv.user &&
          (conv.user._id === message.sender.toString() || conv.user._id === message.receiver.toString())
        ) {
          return {
            ...conv,
            lastMessage: message,
            updatedAt: message.createdAt,
          };
        }
        return conv;
      })
    );

    setRequests((prev) =>
      prev.map((req) => {
        if (
          req.user &&
          (req.user._id === message.sender.toString() || req.user._id === message.receiver.toString())
        ) {
          return {
            ...req,
            lastMessage: message,
            updatedAt: message.createdAt,
            request: false,
          };
        }
        return req;
      })
    );
  };

  const sendMessage = async () => {
    if (!socket.connected) {
      setError("Not connected to server. Please wait...");
      return;
    }
    if (!selectedUser?._id || !isValidObjectId(selectedUser._id)) {
      setError("Please select a valid user to message.");
      return;
    }
    if (!user?._id || !isValidObjectId(user._id)) {
      setError("Invalid user ID. Please log in again.");
      return;
    }
    if (!newMessage.trim() && selectedFiles.length === 0) {
      setError("Message or file required.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      const currentTime = new Date().toISOString();

      if (newMessage.trim()) {
        const isTextLink = isLink(newMessage.trim());
        const messageData = {
          receiverId: selectedUser._id,
          type: isTextLink ? "link" : "text",
          text: newMessage.trim(),
          data: isTextLink ? { url: newMessage.trim() } : {},
        };

        socket.emit("sendMessage", messageData);

        const optimisticMessage = {
          _id: `temp-${Date.now()}`,
          sender: user._id,
          receiver: selectedUser._id,
          type: messageData.type,
          text: messageData.text,
          data: messageData.data,
          createdAt: new Date(),
          seenBy: [user._id],
          deletedFor: [],
        };
        setMessages((prev) => [...prev, optimisticMessage]);
        updateConversationTime(optimisticMessage);
      }

      if (selectedFiles.length > 0) {
        const formData = new FormData();
        for (let i = 0; i < selectedFiles.length; i++) {
          formData.append("files", selectedFiles[i]);
        }

        let urls = [];
        try {
          const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/upload`, formData, {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
          });
          urls = response.data.urls || [];
        } catch (uploadError) {
          console.error("Upload failed:", uploadError);
          setError("Failed to upload files. Please try again.");
          setUploading(false);
          return;
        }

        for (const url of urls) {
          const messageData = {
            receiverId: selectedUser._id,
            type: selectedFiles[0].type.startsWith("image") ? "image" : "media",
            text: undefined,
            data: { url },
          };

          socket.emit("sendMessage", messageData);

          const optimisticMessage = {
            _id: `temp-${Date.now()}-${url}`,
            sender: user._id,
            receiver: selectedUser._id,
            type: messageData.type,
            text: messageData.text,
            data: messageData.data,
            createdAt: new Date(),
            seenBy: [user._id],
            deletedFor: [],
          };
          setMessages((prev) => [...prev, optimisticMessage]);
          updateConversationTime(optimisticMessage);
        }
      }

      setNewMessage("");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploading(false);
    } catch (err) {
      setUploading(false);
      console.error("Failed to send message:", err);
      setError(`Failed to send message: ${err.message}`);
    }
  };

  function isLink(text) {
    if (!text) return false;
    const urlPattern = /^https?:\/\/[\w\-]+(\.[\w\-]+)+[\w\-.,@?^=%&:/~+#]*$/;
    return urlPattern.test(text.trim());
  };

  const getThumbnail = (file) => {
    if (file.type.startsWith("image/")) {
      return URL.createObjectURL(file);
    }
    if (file.type.startsWith("video/")) {
      return null;
    }
    return null;
  };


  useEffect(() => {
    const handleReceiveMessage = (message) => {
      console.log("Messages component: Received message:", message);
      if (message.receiver.toString() === user._id && !message.deletedFor.includes(user._id)) {
        setMessages((prev) => {
          const isDuplicate = prev.some(
            (msg) =>
              msg._id === message._id ||
              (msg.text === message.text &&
                msg.sender.toString() === message.sender.toString() &&
                msg.receiver.toString() === message.receiver.toString() &&
                msg.data?.url === message.data?.url &&
                Math.abs(new Date(msg.createdAt) - new Date(message.createdAt)) < 1000)
          );

          if (isDuplicate) return prev;
          return [...prev, message];
        });

        updateConversationTime(message);

        // Only mark as seen if the sender is the currently selected user
        if (selectedUser && message.sender.toString() === selectedUser._id) {
          markMessagesAsSeen(message.sender);
        }
      }
    };

    const handleMessageConfirmation = (message) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id.startsWith("temp-") &&
          msg.text === message.text &&
          msg.sender.toString() === message.sender.toString() &&
          msg.receiver.toString() === message.receiver.toString() &&
          msg.data?.url === message.data?.url
            ? { ...msg, _id: message._id }
            : msg
        )
      );
    };

    const handleMessageError = ({ error }) => {
      console.error("Message error:", error);
      setMessages((prev) => prev.filter((msg) => !msg._id.startsWith("temp-")));
      setError(`Failed to send message: ${error}`);
    };

    // Set up socket listeners
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messageConfirmation", handleMessageConfirmation);
    socket.on("messageError", handleMessageError);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messageConfirmation", handleMessageConfirmation);
      socket.off("messageError", handleMessageError);
    };
  }, [user?._id, selectedUser]); 

  const handleSelectUser = async (user) => {
    if (!isValidObjectId(user._id)) {
      setError("Invalid user ID selected.");
      return;
    }
    setSelectedUser(user);
    setError("");
    await fetchMessages(user._id);
  };

  useEffect(() => {
    console.log("useAuth user:", user);
    if (!user?._id || !isValidObjectId(user._id)) {
      setError("Invalid user ID. Please log in again.");
      setLoadingConversation(false);
      return;
    }

    setLoadingConversation(true);
    const requestFalse = user?.connections?.filter((conv) => !conv.request) || [];
    const requestTrue = user?.connections?.filter((conv) => conv.request) || [];

    setConversations(requestFalse);
    setRequests(requestTrue);
    setRequestCount(requestTrue.length);

    if (initialUser && isValidObjectId(initialUser._id)) {
      setSelectedUser(initialUser);
      fetchMessages(initialUser._id);
    }

    fetchUnseenCounts();
    setLoadingConversation(false);
  }, [initialUser, user, fetchUnseenCounts]);

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError("");
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setError("");

    if (files.length > 10) {
      setError("You can select a maximum of 10 files.");
      return;
    }

    const validFiles = files.filter((file) => {
      const isValidType = file.type.startsWith("image/") || file.type.startsWith("video/");
      const isValidSize = file.size <= 10 * 1024 * 1024;

      if (!isValidType) {
        setError(`File ${file.name} is not a valid image or video file.`);
        return false;
      }
      if (!isValidSize) {
        setError(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    setSelectedFiles(validFiles);
  };

  const renderMessageContent = (msg) => {
    const content = {
      type: msg.type || "text",
      text: msg.text,
      url: msg.data?.url,
      postId: msg.data?.postId,
    };

    switch (content.type) {
      case "post":
        return (
          <div className="max-w-xs">
            {content.text && <p className="mb-2 break-words whitespace-pre-wrap">{content.text}</p>}
            <SmallPostCard postId={content.postId?.toString()} />
          </div>
        );
      case "link":
        return (
          <a
            href={content.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline break-words"
          >
            {content.text || content.url}
          </a>
        );
      case "image":
        return (
          <div className="max-w-xs">
            {content.text && <p className="mb-2 break-words whitespace-pre-wrap">{content.text}</p>}
            <img
              src={content.url}
              alt="Shared image"
              className="max-w-full h-auto rounded-md cursor-pointer"
              onClick={() => window.open(content.url, "_blank")}
            />
          </div>
        );
      case "media":
        return (
          <div className="max-w-xs">
            {content.text && <p className="mb-2 break-words whitespace-pre-wrap">{content.text}</p>}
            <video controls className="max-w-full h-auto rounded-md">
              <source src={content.url} />
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case "text":
      default:
        return <p className="break-words whitespace-pre-wrap">{content.text || "[Empty message]"}</p>;
    }
  };

  const hasUnseenMessages = (userId) => {
    const count = Number(unseenMessages[userId]);
    return !isNaN(count) && count > 0;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <div className="w-[70%] fixed right-0 top-0 bg-white flex h-full overflow-y-hidden">
        <div className="py-3 w-2/5 h-full flex flex-col overflow-y-auto">
          <div className="flex items-center gap-3 p-4">
            {showRequests && (
              <ArrowLeft
                className="cursor-pointer text-gray-700 hover:text-black"
                onClick={() => setShowRequests(false)}
              />
            )}
            <h1 className="text-2xl font-bold mb-0 ml-4">{showRequests ? "Message Requests" : "Messages"}</h1>
            {!showRequests && requestCount > 0 && (
              <button
                onClick={() => setShowRequests(true)}
                className="ml-auto text-gray-600 px-4 py-2 rounded-full text-sm cursor-pointer"
              >
                Requests ({requestCount})
              </button>
            )}
          </div>
          {showRequests &&
            (requests.length === 0 ? (
              <p className="text-gray-500 ml-4">No requests</p>
            ) : (
              requests.map(({ user, lastMessage }) => (
                <div
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  className="flex items-center gap-3 p-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  <img src={user.userImage} alt="pfp" className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <p className={`${hasUnseenMessages(user._id) ? "font-bold" : "font-semibold"}`}>
                        {user.username}
                      </p>
                      {user.verified?.phoneNumber && user.verified?.email && (
                        <BadgeCheck className="text-teal-500 w-4 h-4" />
                      )}
                    </div>
                    <p className={`text-xs text-gray-500 ${hasUnseenMessages(user._id) ? "font-semibold" : ""}`}>
                      {lastMessage?.createdAt ? new Date(lastMessage.createdAt).toLocaleString() : "No message yet"}
                    </p>
                  </div>
                  {hasUnseenMessages(user._id) && (
                    <div className="w-3 h-3 bg-teal-500 rounded-full flex-shrink-0"></div>
                  )}
                </div>
              ))
            ))}
          {loadingConversation && !showRequests && (
            <div className="flex justify-center h-screen bg-white">
              <div className="w-12 h-12 border-4 border-teal-500 border-dashed rounded-full animate-spin"></div>
            </div>
          )}
          {!loadingConversation &&
            !showRequests &&
            (conversations.length === 0 ? (
              <p className="text-gray-500 ml-4">No conversations found</p>
            ) : (
              conversations.map(({ user, lastMessage }) => (
                <div
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  className="flex items-center gap-3 p-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  <img src={user.userImage} alt="pfp" className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <p className={`${hasUnseenMessages(user._id) ? "font-bold" : "font-semibold"}`}>
                        {user.username}
                      </p>
                      {user.verified?.phoneNumber && user.verified?.email && (
                        <BadgeCheck className="text-teal-500 w-4 h-4" />
                      )}
                    </div>
                    <p className={`text-xs text-gray-500 ${hasUnseenMessages(user._id) ? "font-semibold" : ""}`}>
                      {lastMessage?.createdAt ? new Date(lastMessage.createdAt).toLocaleString() : "No message yet"}
                    </p>
                  </div>
                  {hasUnseenMessages(user._id) && (
                    <div className="w-3 h-3 bg-teal-500 rounded-full inline-block" />
                  )}
                </div>
              ))
            ))}
        </div>

        <div className="w-px h-full bg-gray-300" />

        <div className="py-3 w-3/5 h-full flex flex-col">
          {socketError && (
            <div className="p-4 text-red-500">
              Connection error: {socketError}. Please try refreshing the page or logging in again.
            </div>
          )}
          {error && (
            <div className="p-4 text-red-500">
              {error}
            </div>
          )}
          {selectedUser ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2 border-b">
                <img src={selectedUser.userImage} className="w-10 h-10 rounded-full object-cover" />
                <div className="flex items-center gap-1">
                  <button
                    className="text-lg font-bold cursor-pointer"
                    onClick={() => navigate(`/profile/${selectedUser._id}`)}
                  >
                    {selectedUser.username}
                  </button>
                  {selectedUser.verified?.phoneNumber && selectedUser.verified?.email && (
                    <BadgeCheck className="text-teal-500 w-6 h-6" />
                  )}
                </div>
                <button
                  onClick={() => setComp(true)}
                  className="flex ml-auto items-center text-black cursor-pointer mr-4"
                >
                  <MoreVertical size={24} className="text-gray-400 cursor-pointer" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {loadingMessages && (
                  <div className="flex justify-center h-screen bg-white">
                    <div className="w-12 h-12 border-4 border-teal-500 border-dashed rounded-full animate-spin"></div>
                  </div>
                )}
                {!loadingMessages &&
                  messages.map((msg) => {
                    if (msg.deletedFor.includes(user._id)) {
                      return null;
                    }
                    const senderId = typeof msg.sender === 'object' && msg.sender?._id
                      ? msg.sender._id.toString()
                      : msg.sender.toString();
                    const isSender = senderId === user._id;
                    console.log("Message:", msg);
                    console.log("senderId:", senderId, "user._id:", user._id, "isSender:", isSender);
                    const avatarSrc = isSender ? user.userImage : selectedUser.userImage;

                    return (
                      <div
                        key={msg._id || `${senderId}-${msg.createdAt}-${Math.random().toString(36).substring(2)}`}
                        className={`flex items-start mb-4 ${isSender ? "justify-end" : "justify-start"}`}
                      >
                        {!isSender && (
                          <img src={avatarSrc} className="w-8 h-8 rounded-full object-cover mr-2 mt-1" />
                        )}
                        <div
                          className={`p-2 rounded-lg max-w-xs ${
                            isSender ? "bg-teal-200" : "bg-gray-200"
                          }`}
                        >
                          {renderMessageContent(msg)}
                        </div>
                        {isSender && (
                          <img src={avatarSrc} className="w-8 h-8 rounded-full object-cover ml-2 mt-1" />
                        )}
                      </div>
                    );
                  })}
                <div ref={messagesEndRef} />
              </div>

              {error && (
                <div className="px-4 pb-2 mx-4 mb-2 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className="px-4 pb-2 mx-4 mb-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
                      >
                        {file.type.startsWith("image/") ? (
                          <img
                            src={getThumbnail(file)}
                            alt={file.name}
                            className="w-full h-24 object-cover"
                          />
                        ) : (
                          <div className="w-full h-24 bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                            Video: {file.name}
                          </div>
                        )}
                        <div className="p-2">
                          <span className="text-xs text-gray-600 truncate block" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(index)}
                          className={`absolute top-1 right-1 bg-teal-400 text-white rounded-full p-1 hover:bg-teal-600 transition duration-200 ${
                            uploading ? "opacity-50 cursor-not-allowed" : ""
                          } cursor-pointer`}
                          disabled={uploading}
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center p-3">
                <label className="mr-2 cursor-pointer">
                  <Paperclip className="w-5 h-5 text-gray-600" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    multiple
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                </label>
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 border rounded-full px-4 py-2 focus:outline-none"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  disabled={uploading || socketError}
                />
                <button
                  className="ml-2 bg-teal-500 text-white px-4 py-2 rounded-full cursor-pointer hover:bg-teal-600 transition duration-200"
                  onClick={() => sendMessage()}
                  disabled={uploading || socketError}
                >
                  {uploading ? "Uploading..." : "Send"}
                </button>
              </div>
            </>
          ) : (
            <div className="p-4">
              <h1 className="text-xl font-bold">No messages yet</h1>
              <p className="text-gray-500">Start a conversation with someone!</p>
            </div>
          )}
        </div>
      </div>
      {comp && <MessageComp setComp={setComp} fetchMessages={fetchMessages} userId={selectedUser?._id} />}
    </div>
  );
}

export default Messages;