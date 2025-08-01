import Sidebar from "./Sidebar";
import useAuth from "./hooks/useAuth.jsx";
import logoDark from"./assets/logo/logo-dark.svg";
import loadingLogo from "./assets/logo/logo-transparent-jobdone.svg";
import { useState, useCallback, useEffect, useRef, memo } from "react";
import { BadgeCheck, Paperclip, X, AlertCircle, ArrowLeft, MoreVertical, Search } from "lucide-react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "./socket.js";
import SmallPostCard from "./components/smallPostCard";
import useSocketRoomJoin from "./hooks/socketRoomJoin.js";
import MessageComp from "./messageInfo.jsx";
import { useMessageContext } from "./hooks/useMessageContext.js";
import { formatDistanceToNow } from 'date-fns';
import debounce from 'lodash.debounce';
import useIsMobile from "./hooks/useIsMobile.js";
import BottomNavbar from "./bottomNavBar.jsx";
import { useTheme } from "./ThemeContext"; // Import useTheme


const MessageItem = memo(({ msg, user, selectedUser, renderMessageContent }) => {
  const { theme } = useTheme(); // Get current theme
  const buttonStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
      : '#2dd4bf' // This is the hex code for teal-400
  };
  if (msg.deletedFor.includes(user._id)) return null;
  const senderId = typeof msg.sender === 'object' && msg.sender?._id
    ? msg.sender._id.toString()
    : msg.sender.toString();
  const isSender = senderId === user._id;
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
        className={`p-3 rounded-lg max-w-sm ${
          isSender ? "bg-teal-200 text-teal-900 dark:text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        } shadow-sm`}
        style={isSender ? buttonStyle : {}}
      >
        {renderMessageContent(msg , isSender)}
      </div>
      {isSender && (
        <img src={avatarSrc} className="w-8 h-8 rounded-full object-cover ml-2 mt-1" />
      )}
    </div>
  );
});

function Messages() {
  const { state } = useLocation();
  const initialUser = state?.newChatWith;
  const [newMessage, setNewMessage] = useState("");
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const { user, refreshUser, loading } = useAuth();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isMobile = useIsMobile();
  const [hasToken, setHasToken] = useState(false);
  const isNavigatingAway = useRef(false);
  const inputContainerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const activeElementRef = useRef(null);
  const savedScrollPosition = useRef(0);
  const lastViewportHeight = useRef(0);
  const { theme } = useTheme(); // Get current theme
  const buttonStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
      : '#2dd4bf' // This is the hex code for teal-400
  };
  
  const headingStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
      : '#f0fdfa' // This is the hex code for teal-400
  };
  
  

  useEffect(() => {
    if (!loading) {
      if (!user) {
        console.log("No user found, redirecting to login");
        navigate("/");
      } else {
        console.log("User found, setting hasToken to true");
        setHasToken(true);
      }
    }
  }, [user, loading, navigate]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (user?._id) {
      refreshUser();
    }
  }, [user?._id]);

  const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

  useSocketRoomJoin(user?._id, setSocketError);

  // *** CORRECTED HISTORY MANAGEMENT LOGIC ***
  useEffect(() => {
    if (!isMobile) return;

    const handlePopState = (event) => {
      // When the user navigates back (via gesture or button),
      // we check the component's state and revert it.
      if (isNavigatingAway.current) {
        isNavigatingAway.current = false;
        return;
      }
      
      // If a chat view is open, the back action should close it.
      if (selectedUser) {
        setSelectedUser(null);
      } 
      // Else if the requests view is open, the back action should close it.
      else if (showRequests) {
        setShowRequests(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isMobile, selectedUser, showRequests]); // Dependencies are crucial here

  useEffect(() => {
    if (!isMobile || !window.visualViewport) return;

    lastViewportHeight.current = window.visualViewport.height;

    const handleFocusIn = (e) => {
      const target = e.target;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
        activeElementRef.current = target;
        if (scrollContainerRef.current) {
          savedScrollPosition.current = scrollContainerRef.current.scrollTop;
        }
      }
    };

    const handleFocusOut = () => {
      activeElementRef.current = null;
    };

    const handleViewportResize = () => {
      if (!activeElementRef.current) return;

      const currentHeight = window.visualViewport.height;
      const heightDifference = currentHeight - lastViewportHeight.current;
      const keyboardThreshold = 100;

      if (heightDifference < -keyboardThreshold) {
        setTimeout(() => {
          if (activeElementRef.current && inputContainerRef.current) {
            inputContainerRef.current.scrollIntoView({
              behavior: "smooth",
              block: "end",
              inline: "nearest",
            });
            setTimeout(() => {
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = savedScrollPosition.current;
              }
            }, 300);
          }
        }, 100);
      } else if (heightDifference > keyboardThreshold) {
        if (activeElementRef.current) {
          activeElementRef.current.blur();
        }
      }

      lastViewportHeight.current = currentHeight;
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    window.visualViewport.addEventListener("resize", handleViewportResize);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      window.visualViewport.removeEventListener("resize", handleViewportResize);
    };
  }, [isMobile]);

  const refreshUserConnections = useCallback(async () => {
    // Don't make API calls if we're still loading or don't have a valid user
    if (loading || !user?._id || !isValidObjectId(user._id)) return;

    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/user/connections`, {
        withCredentials: true,
      });

      const sortedConversations = res.data?.connections
        ?.filter((conv) => !conv.request)
        ?.sort((a, b) => new Date(b.lastMessage?.createdAt || b.updatedAt || 0) - new Date(a.lastMessage?.createdAt || a.updatedAt || 0)) || [];
      setConversations(sortedConversations);
      setRequests(res.data?.connections?.filter((conv) => conv.request) || []);
      setRequestCount(res.data?.connections?.filter((conv) => conv.request).length || 0);
    } catch (err) {
      setError("Failed to refresh user connections.");
    }
  }, [user?._id, loading]); // Add loading to dependencies

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
    } catch (err) {
      setError(`Failed to mark messages as seen: ${err.response?.data?.error || err.message}`);
    }
  };

  const fetchMessages = useCallback(async (userId) => {
    if (!user?._id || !isValidObjectId(user._id) || !isValidObjectId(userId)) {
      setError("Invalid user ID. Please try again.");
      return;
    }
    try {
      setLoadingMessages(true);
      setMessages([]);
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/messages/${userId}`, {
        withCredentials: true,
      });
      const newMessages = res.data.filter((msg) => !msg.deletedFor.includes(user._id));
      setMessages(newMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
      setLoadingMessages(false);
      await markMessagesAsSeen(userId);
    } catch (err) {
      setError(`Failed to fetch messages: ${err.response?.data?.error || err.message}`);
      setLoadingMessages(false);
    }
  }, [user?._id, setUnseenMessages]);

  const updateConversationTime = useCallback((message) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.user &&
        (conv.user._id === message.sender.toString() || conv.user._id === message.receiver.toString())
          ? { ...conv, lastMessage: message, updatedAt: message.createdAt }
          : conv
      )
    );

    setRequests((prev) =>
      prev.map((req) =>
        req.user &&
        (req.user._id === message.sender.toString() || req.user._id === message.receiver.toString())
          ? { ...req, lastMessage: message, updatedAt: message.createdAt, request: false }
          : req
      )
    );
  }, []);

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
      setIsTyping(false);
    } catch (err) {
      setUploading(false);
      setError(`Failed to send message: ${err.message}`);
    }
  };

  const isLink = (text) => {
    if (!text) return false;
    return /^https?:\/\/[\w\-]+(\.[\w\-]+)+[\w\-.,@?^=%&:/~+#]*$/.test(text.trim());
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
      if (message.receiver.toString() === user._id && !message.deletedFor.includes(user._id)) {
        if (selectedUser && message.sender.toString() === selectedUser._id) {
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

          markMessagesAsSeen(message.sender);
          setIsTyping(false);
        }

        updateConversationTime(message);
        refreshUserConnections();

        setRequests((prev) => {
          const senderId = message.sender?._id?.toString?.() || message.sender?.toString?.();
          const alreadyInRequests = prev.some(r => r.user._id?.toString() === senderId);
          const inConversations = conversations.some(c => c.user._id?.toString() === senderId);
          const inConnections = user?.connections?.some(conn => conn.user?._id?.toString() === senderId);
          const alreadyConnected = inConversations && inConnections;

          if (!alreadyInRequests && !alreadyConnected) {
            const newRequest = {
              user: {
                _id: senderId,
                username: message.senderUsername || "New User",
                userImage: message.senderImage || "",
                verified: message.senderVerified || {},
              },
              lastMessage: message,
              request: true,
              createdAt: message.createdAt || new Date(),
            };
            setRequestCount(prev => prev + 1);
            return [...prev, newRequest];
          }
          return prev;
        });

        if (!selectedUser || message.sender.toString() !== selectedUser._id) {
          setUnseenMessages((prev) => ({
            ...prev,
            [message.sender.toString()]: (prev[message.sender.toString()] || 0) + 1,
          }));
        }
      }
    };

    const handleMessageConfirmation = (message) => {
      setMessages((prev) => {
        const updatedMessages = prev.map((msg) =>
          msg._id.startsWith("temp-") &&
          msg.text === message.text &&
          msg.sender.toString() === message.sender.toString() &&
          msg.receiver.toString() === message.receiver.toString() &&
          msg.data?.url === message.data?.url
            ? { ...msg, ...message, _id: message._id }
            : msg
        );
        const hasMessage = updatedMessages.some((msg) => msg._id === message._id);
        if (!hasMessage) {
          return [...updatedMessages, message];
        }
        return updatedMessages;
      });

      if (selectedUser) {
        setTimeout(() => {
          fetchMessages(selectedUser._id);
        }, 1000);
      }
    };

    const handleMessageError = ({ error }) => {
      setMessages((prev) => prev.filter((msg) => !msg._id.startsWith("temp-")));
      setError(`Failed to send message: ${error}`);
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messageConfirmation", handleMessageConfirmation);
    socket.on("messageError", handleMessageError);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messageConfirmation", handleMessageConfirmation);
      socket.off("messageError", handleMessageError);
    };
  }, [user?._id, selectedUser, refreshUserConnections, fetchMessages]);

  const handleSelectUser = useCallback(async (user) => {
    if (!isValidObjectId(user._id)) {
      setError("Invalid user ID selected.");
      return;
    }
    setSelectedUser(user);
    setError("");
    await fetchMessages(user._id);
    setIsTyping(false);
    if (isMobile) {
      window.history.pushState({ view: 'chat' }, "");
    }
  }, [fetchMessages, isMobile]);

  const debouncedSetTyping = useCallback(
    debounce((value) => {
      setIsTyping(!!value && !!selectedUser);
    }, 300),
    [selectedUser]
  );

  useEffect(() => {
    if(loading)return;
    if (!user?._id || !isValidObjectId(user._id)) {
      setError("Invalid user ID. Please log in again.");
      setLoadingConversation(false);
      return;
    }

    setLoadingConversation(true);
    setConversations(
      user?.connections
        ?.filter((conv) => !conv.request)
        ?.sort((a, b) => new Date(b.lastMessage?.createdAt || b.updatedAt || 0) - new Date(a.lastMessage?.createdAt || a.updatedAt || 0)) || []
    );
    setRequests(
      user?.connections
        ?.filter((conv) => conv.request)
        ?.sort((a, b) => new Date(b.lastMessage?.createdAt || b.updatedAt || 0) - new Date(a.lastMessage?.createdAt || a.updatedAt || 0)) || []
    );
    setRequestCount(user?.connections?.filter((conv) => conv.request).length || 0);

    if (initialUser && isValidObjectId(initialUser._id)) {
      setSelectedUser(initialUser);
      fetchMessages(initialUser._id);
      if (isMobile) {
        window.history.pushState({ view: 'chat' }, "");
      }
    }

    fetchUnseenCounts();
    setLoadingConversation(false);
  }, [initialUser, user, fetchUnseenCounts, fetchMessages, isMobile]);

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

  const handleProfileNavigation = (userId) => {
    isNavigatingAway.current = true;
    if (user._id === userId) {
      navigate(`/profile`);
    } else {
      navigate(`/profile/${userId}`);
    }
  };

  const handleBackFromChat = () => {
    window.history.back();
  };

  const renderMessageContent = useCallback((msg , isSender) => {
    const content = {
      type: msg.type || "text",
      text: msg.text,
      url: msg.data?.url,
      postId: msg.data?.postId,
    };

      const MessageWrapper = ({ children }) => {
        const messageTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        
        const timeColorClass = isSender 
          ? "text-teal-700 dark:text-white/80" 
          : "text-gray-500/80 dark:text-white/80";

        return (
          <div>
            {children}
            <div className={`text-right text-xs ${timeColorClass} mt-1.5 -mb-1`}>
              {messageTime}
            </div>
          </div>
        );
      };

    switch (content.type) {
      case "post":
        return (
          <MessageWrapper>
            <div className="max-w-xs">
              {content.text && <p className="mb-2 break-words whitespace-pre-wrap">{content.text}</p>}
              <SmallPostCard postId={content.postId?.toString()} />
            </div>
          </MessageWrapper>
        );
      case "link":
        return (
          <MessageWrapper>
            <a
              href={content.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-500 dark:text-teal-400 underline break-words hover:text-teal-600 dark:hover:text-teal-300"
            >
              {content.text || content.url}
            </a>
          </MessageWrapper>
        );
      case "image":
        return (
          <MessageWrapper>
            <div className="max-w-xs">
              {content.text && <p className="mb-2 break-words whitespace-pre-wrap">{content.text}</p>}
              <img
                src={content.url}
                alt="Shared"
                className="max-w-full h-auto rounded-md cursor-pointer"
                onClick={() => window.open(content.url, "_blank")}
              />
            </div>
          </MessageWrapper>
        );
      case "media":
        return (
          <MessageWrapper>
            <div className="max-w-xs">
              {content.text && <p className="mb-2 break-words whitespace-pre-wrap">{content.text}</p>}
              <video controls className="max-w-full h-auto rounded-md">
                <source src={content.url} />
                Your browser does not support the video tag.
              </video>
            </div>
          </MessageWrapper>
        );
      default:
        return (
          <MessageWrapper>
            <p className="break-words whitespace-pre-wrap">{content.text || ""}</p>
          </MessageWrapper>
        );
    }
  }, []);

  const getMessagePreview = (lastMessage) => {
    if (!lastMessage) return "No message yet";
    switch (lastMessage.type) {
      case "image":
        return "[Photo]";
      case "media":
        return "[Video]";
      case "post":
        return lastMessage.text?.slice(0, 30) || "[Post]";
      default:
        return lastMessage.text?.slice(0, 30) || "No message yet";
    }
  };

  const hasUnseenMessages = (userId) => {
    const count = Number(unseenMessages[userId]);
    return !isNaN(count) && count > 0;
  };

  const filteredConversations = conversations.filter((conv) =>
    conv?.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv?.lastMessage?.text?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequests = requests.filter((req) =>
    req.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.lastMessage?.text?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
          return (
              <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
                  {theme !== 'dark' && (
                      <div className="w-44 h-44">
                          <img src={loadingLogo} alt="JobDone Logo" className="object-contain w-full h-full animate-pulse" />
                      </div>
                  )}
                  {theme === 'dark' && (
                      <div className="w-46 h-46">
                          <img src={logoDark} alt="JobDone Logo Dark" className="object-contain w-full h-full animate-pulse" />
                      </div>
                  )}
              </div>
          );
      }
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col h-[100dvh]">
        {!selectedUser ? (
          <>
            <div className="relative flex items-center justify-center p-4 border-b border-gray-200 dark:border-gray-700 shadow-sm" style={headingStyle}>
              {/* Back Button (Left) */}
              {showRequests && (
                <button
                  onClick={() => window.history.back()}
                  className="absolute left-4 px-2 rounded-full hover:bg-teal-100 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="w-6 h-6 text-teal-700 dark:text-teal-300 hover:text-teal-900" />
                </button>
              )}

              {/* Center Heading */}
              <h1 className="text-2xl font-semibold text-teal-800 dark:text-teal-400 text-center">
                {showRequests ? "Message Requests" : "Messages"}
              </h1>

              {/* Requests Button (Right) */}
              {!showRequests && requestCount > 0 && (
                <button
                  onClick={() => {
                    setShowRequests(true);
                    window.history.pushState({ view: 'requests' }, "");
                  }}
                  className="absolute right-0.5 text-teal-600 dark:text-teal-400 px-3 py-1 rounded-full text-sm hover:bg-teal-100 dark:hover:bg-gray-700 transition"
                >
                  Requests ({requestCount})
                </button>
              )}
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 focus:border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 text-sm dark:bg-gray-800 dark:text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pb-16">
              {showRequests &&
                (filteredRequests.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 px-4">No requests</p>
                ) : (
                  filteredRequests.map(({ user, lastMessage, updatedAt }) => (
                    <div
                      key={user._id}
                      onClick={() => handleSelectUser(user)}
                      className="flex items-center gap-3 p-4 py-3 hover:bg-teal-50 dark:hover:bg-gray-800 cursor-pointer transition border-b border-gray-200 dark:border-gray-700"
                    >
                      <img src={user.userImage} alt="pfp" className="w-10 h-10 rounded-full object-cover" />
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <p className={`${hasUnseenMessages(user._id) ? "font-bold" : "font-semibold"} text-teal-800 dark:text-white`}>
                            {user.username}
                          </p>
                          {user.verified?.phoneNumber && user.verified?.email && (
                            <BadgeCheck className="text-teal-500 w-4 h-4" />
                          )}
                        </div>
                        <p className={`text-xs text-gray-500 dark:text-gray-400 ${hasUnseenMessages(user._id) ? "font-semibold" : ""}`}>
                          {getMessagePreview(lastMessage)}
                        </p>
                        <p className="text-xs text-teal-600 dark:text-teal-400">
                          {lastMessage?.createdAt || updatedAt
                            ? formatDistanceToNow(new Date(lastMessage?.createdAt || updatedAt), { addSuffix: true })
                            : "No time"}
                        </p>
                      </div>
                      {hasUnseenMessages(user._id) && (
                        <div className="w-3 h-3 bg-teal-500 rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                  ))
                ))}
              {loadingConversation && !showRequests && (
                <div className="flex justify-center h-full">
                  <div className="w-12 h-12 border-4 border-teal-500 border-dashed rounded-full animate-spin"></div>
                </div>
              )}
              {!loadingConversation &&
                !showRequests &&
                (filteredConversations.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 px-4">No conversations found</p>
                ) : (
                  filteredConversations.map(({ user, lastMessage, updatedAt }) => (
                    <div
                      key={user._id}
                      onClick={() => handleSelectUser(user)}
                      className="flex items-center gap-3 p-4 py-3 hover:bg-teal-50 dark:hover:bg-gray-800 cursor-pointer transition border-b border-gray-200 dark:border-gray-700"
                    >
                      <img src={user.userImage} alt="pfp" className="w-10 h-10 rounded-full object-cover" />
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <p className={`${hasUnseenMessages(user._id) ? "font-bold" : "font-semibold"} text-teal-800 dark:text-white`}>
                            {user.username}
                          </p>
                          {user.verified?.phoneNumber && user.verified?.email && (
                            <BadgeCheck className="text-teal-500 w-4 h-4" />
                          )}
                        </div>
                        <p className={`text-xs text-gray-500 dark:text-gray-400 ${hasUnseenMessages(user._id) ? "font-semibold" : ""}`}>
                          {getMessagePreview(lastMessage)}
                        </p>
                        <p className="text-xs text-teal-600 dark:text-teal-400">
                          {lastMessage?.createdAt || updatedAt
                            ? formatDistanceToNow(new Date(lastMessage?.createdAt || updatedAt), { addSuffix: true })
                            : "No time"}
                        </p>
                      </div>
                      {hasUnseenMessages(user._id) && (
                        <div className="w-3 h-3 bg-teal-500 rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                  ))
                ))}
            </div>
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <BottomNavbar />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-teal-50 dark:bg-gray-800">
              <button onClick={handleBackFromChat} className="p-2 rounded-full hover:bg-teal-100 dark:hover:bg-gray-700">
                <ArrowLeft className="w-6 h-6 text-teal-700 dark:text-teal-300 hover:text-teal-900" />
              </button>
              <div className="flex items-center gap-2">
                <img src={selectedUser.userImage} className="w-8 h-8 rounded-full object-cover" />
                <button
                  className="text-base font-semibold text-teal-800 dark:text-white hover:text-teal-900"
                  onClick={() => handleProfileNavigation(selectedUser._id)}
                >
                  {selectedUser.username}
                </button>
                {selectedUser.verified?.phoneNumber && selectedUser.verified?.email && (
                  <BadgeCheck className="text-teal-500 w-5 h-5" />
                )}
              </div>
              <button
                onClick={() => setComp(!comp)}
                className="p-2 rounded-full hover:bg-teal-100 dark:hover:bg-gray-700"
              >
                <MoreVertical className="w-6 h-6 text-teal-600 dark:text-teal-300 hover:text-teal-800" />
              </button>
            </div>
            <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
              {error && (
                <div className="p-3 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg mx-2 mb-2 text-sm">
                  {error}
                </div>
              )}
              {loadingMessages && (
                <div className="flex justify-center h-full">
                  <div className="w-12 h-12 border-4 border-teal-500 border-dashed rounded-full animate-spin"></div>
                </div>
              )}
              {!loadingMessages && isTyping && selectedUser && (
                <div className="flex items-start mb-4 justify-start">
                  <img src={selectedUser.userImage} className="w-8 h-8 rounded-full object-cover mr-2 mt-1" />
                  <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 max-w-xs">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              {!loadingMessages &&
                messages.map((msg) => (
                  <MessageItem
                    key={msg._id || `${msg.sender}-${msg.createdAt}-${Math.random().toString(36).substring(2)}`}
                    msg={msg}
                    user={user}
                    selectedUser={selectedUser}
                    renderMessageContent={renderMessageContent}
                  />
                ))}
              <div ref={messagesEndRef} />
            </div>
            {selectedFiles.length > 0 && (
              <div className="px-4 pb-2 mx-2 mb-2">
                <div className="grid grid-cols-2 gap-2 p-3 bg-teal-50 dark:bg-gray-800 rounded-lg">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative bg-white dark:bg-gray-700 border border-teal-200 dark:border-gray-600 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
                    >
                      {file.type.startsWith("image/") ? (
                        <img
                          src={getThumbnail(file)}
                          alt={file.name}
                          className="w-full h-20 object-cover"
                        />
                      ) : (
                        <div className="w-full h-20 bg-teal-100 dark:bg-gray-600 flex items-center justify-center text-teal-600 dark:text-teal-300 text-xs">
                          Video: {file.name}
                        </div>
                      )}
                      <div className="p-1">
                        <span className="text-xs text-teal-600 dark:text-teal-300 truncate block" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className={`absolute top-1 right-1 bg-teal-500 text-white rounded-full p-1 hover:bg-teal-600 transition duration-200 ${
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
            <div ref={inputContainerRef} className="flex items-end gap-2 px-3 py-2 bg-teal-50 dark:bg-gray-800 flex-shrink-0">
              <label className="cursor-pointer">
                <Paperclip className="w-5 h-5 mb-2 text-teal-600 dark:text-teal-300 hover:text-teal-800" />
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
              <textarea
                placeholder="Message..."
                rows={1}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  debouncedSetTyping(e.target.value);
                }}
                className="flex-1 resize-none border border-teal-200 dark:border-gray-600 rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 bg-white dark:bg-gray-700 text-teal-900 dark:text-gray-100 text-sm max-h-[8rem] overflow-auto"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={uploading || socketError}
              />
              <button
                onClick={sendMessage}
                disabled={uploading || socketError}
                className=" text-white px-4 py-2 rounded-full hover:bg-teal-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                style = {buttonStyle}
              >
                {uploading ? "..." : "Send"}
              </button>
            </div>
          </>
        )}
        {comp && <MessageComp setComp={setComp} fetchMessages={fetchMessages} userId={selectedUser?._id} />}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar user={user} />
      <div className="w-[70%] fixed right-0 top-0 bg-white dark:bg-gray-900 flex h-full overflow-y-hidden">
        <div className="py-3 w-2/5 h-full flex flex-col overflow-y-auto border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 p-4">
            {showRequests && (
              <ArrowLeft
                className="cursor-pointer text-teal-700 dark:text-teal-300 hover:text-teal-900"
                onClick={() => setShowRequests(false)}
              />
            )}
            <h1 className="text-2xl font-bold mb-0 ml-4 text-teal-800 dark:text-teal-400">
              {showRequests ? "Message Requests" : "Messages"}
            </h1>
            {!showRequests && requestCount > 0 && (
              <button
                onClick={() => setShowRequests(true)}
                className="ml-auto text-teal-600 dark:text-teal-400 px-4 py-2 rounded-full text-sm cursor-pointer hover:bg-teal-100 dark:hover:bg-gray-800 transition"
              >
                Requests ({requestCount})
              </button>
            )}
          </div>
          <div className="px-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 text-sm dark:bg-gray-800 dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          {showRequests &&
            (filteredRequests.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 ml-4">No requests</p>
            ) : (
              filteredRequests.map(({ user, lastMessage, updatedAt }) => (
                <div
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  className="flex items-center gap-3 p-4 py-3 hover:bg-teal-50 dark:hover:bg-gray-800 cursor-pointer transition"
                >
                  <img src={user.userImage} alt="pfp" className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <p className={`${hasUnseenMessages(user._id) ? "font-bold" : "font-semibold"} text-teal-800 dark:text-white`}>
                        {user.username}
                      </p>
                      {user.verified?.phoneNumber && user.verified?.email && (
                        <BadgeCheck className="text-teal-500 w-4 h-4" />
                      )}
                    </div>
                    <p className={`text-xs text-gray-500 dark:text-gray-400 ${hasUnseenMessages(user._id) ? "font-semibold" : ""}`}>
                      {getMessagePreview(lastMessage)}
                    </p>
                    <p className="text-xs text-teal-600 dark:text-teal-400">
                      {lastMessage?.createdAt || updatedAt
                        ? formatDistanceToNow(new Date(lastMessage?.createdAt || updatedAt), { addSuffix: true })
                        : "No time"}
                    </p>
                  </div>
                  {hasUnseenMessages(user._id) && (
                    <div className="w-3 h-3 bg-teal-500 rounded-full flex-shrink-0"></div>
                  )}
                </div>
              ))
            ))}
          {loadingConversation && !showRequests && (
            <div className="flex justify-center h-screen bg-white dark:bg-gray-900">
              <div className="w-12 h-12 border-4 border-teal-500 border-dashed rounded-full animate-spin"></div>
            </div>
          )}
          {!loadingConversation &&
            !showRequests &&
            (filteredConversations.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 ml-4">No conversations found</p>
            ) : (
              filteredConversations.map(({ user, lastMessage, updatedAt }) => (
                <div
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  className="flex items-center gap-3 p-4 py-3 hover:bg-teal-50 dark:hover:bg-gray-800 cursor-pointer transition"
                >
                  <img src={user.userImage} alt="pfp" className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <p className={`${hasUnseenMessages(user._id) ? "font-bold" : "font-semibold"} text-teal-800 dark:text-white`}>
                        {user.username}
                      </p>
                      {user.verified?.phoneNumber && user.verified?.email && (
                        <BadgeCheck className="text-teal-500 w-4 h-4" />
                      )}
                    </div>
                    <p className={`text-xs text-gray-500 dark:text-gray-400 ${hasUnseenMessages(user._id) ? "font-semibold" : ""}`}>
                      {getMessagePreview(lastMessage)}
                    </p>
                    <p className="text-xs text-teal-600 dark:text-teal-400">
                      {lastMessage?.createdAt || updatedAt
                        ? formatDistanceToNow(new Date(lastMessage?.createdAt || updatedAt), { addSuffix: true })
                        : "No time"}
                    </p>
                  </div>
                  {hasUnseenMessages(user._id) && (
                    <div className="w-3 h-3 bg-teal-500 rounded-full flex-shrink-0"></div>
                  )}
                </div>
              ))
            ))}
        </div>
        <div className="w-px h-full bg-gray-200 dark:bg-gray-700" />
        <div className="w-3/5 h-full flex flex-col">
          {error && (
            <div className="p-4 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg mx-4">
              {error}
            </div>
          )}
          {selectedUser ? (
            <>
              <div className="flex items-center gap-2 px-4 py-3 border-b dark:border-gray-700 bg-teal-50 dark:bg-gray-800">
                <img src={selectedUser.userImage} className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <button
                      className="text-lg font-bold cursor-pointer text-teal-800 dark:text-white hover:text-teal-900"
                      onClick={() => handleProfileNavigation(selectedUser._id)}
                    >
                      {selectedUser.username}
                    </button>
                    {selectedUser.verified?.phoneNumber && selectedUser.verified?.email && (
                      <BadgeCheck className="text-teal-500 w-6 h-6" />
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setComp(!comp)}
                  className="flex items-center text-teal-400 hover:text-teal-600 cursor-pointer mr-4"
                >
                  <MoreVertical size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
                {loadingMessages && (
                  <div className="flex justify-center h-full bg-white dark:bg-gray-900">
                    <div className="w-12 h-12 border-4 border-teal-500 border-dashed rounded-full animate-spin"></div>
                  </div>
                )}
                {!loadingMessages && isTyping && selectedUser && (
                  <div className="flex items-start mb-4 justify-start">
                    <img src={selectedUser.userImage} className="w-8 h-8 rounded-full object-cover mr-2 mt-1" />
                    <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 max-w-xs">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
                {!loadingMessages &&
                  messages.map((msg) => (
                    <MessageItem
                      key={msg._id || `${msg.sender}-${msg.createdAt}-${Math.random().toString(36).substring(2)}`}
                      msg={msg}
                      user={user}
                      selectedUser={selectedUser}
                      renderMessageContent={renderMessageContent}
                    />
                  ))}
                <div ref={messagesEndRef} />
              </div>
              {error && (
                <div className="px-4 pb-2 mx-4 mb-2 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}
              {selectedFiles.length > 0 && (
                <div className="px-4 pb-2 mx-4 mb-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 bg-teal-50 dark:bg-gray-800 rounded-lg">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="relative bg-white dark:bg-gray-700 border border-teal-200 dark:border-gray-600 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
                      >
                        {file.type.startsWith("image/") ? (
                          <img
                            src={getThumbnail(file)}
                            alt={file.name}
                            className="w-full h-24 object-cover"
                          />
                        ) : (
                          <div className="w-full h-24 bg-teal-100 dark:bg-gray-600 flex items-center justify-center text-teal-600 dark:text-teal-300 text-sm">
                            Video: {file.name}
                          </div>
                        )}
                        <div className="p-2">
                          <span className="text-xs text-teal-600 dark:text-teal-300 truncate block" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(index)}
                          className={`absolute top-1 right-1 bg-teal-500 text-white rounded-full p-1 hover:bg-teal-600 transition duration-200 ${
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
              <div className="flex items-center p-3 bg-teal-50 dark:bg-gray-800">
                <label className="mr-2 cursor-pointer">
                  <Paperclip className="w-5 h-5 text-teal-600 dark:text-teal-300 hover:text-teal-800" />
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
                  className="flex-1 border border-teal-200 dark:border-gray-600 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 bg-white dark:bg-gray-700 text-teal-900 dark:text-white"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    debouncedSetTyping(e.target.value);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  disabled={uploading || socketError}
                />
                <button
                  className="ml-2 text-white px-4 py-2 rounded-full cursor-pointer hover:bg-teal-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={buttonStyle}
                  onClick={() => sendMessage()}
                  disabled={uploading || socketError}
                >
                  {uploading ? "Uploading..." : "Send"}
                </button>
              </div>
            </>
          ) : (
            <div className="p-4 flex flex-col items-center justify-center h-full text-teal-800 dark:text-gray-300">
              <h1 className="text-xl font-bold">No messages yet</h1>
              <p className="text-teal-600 dark:text-gray-400">Start a conversation with someone!</p>
            </div>
          )}
        </div>
      </div>
      {comp && <MessageComp setComp={setComp} fetchMessages={fetchMessages} userId={selectedUser?._id} />}
    </div>
  );
}

export default Messages;