import { useState, useRef, useEffect } from "react";
import { Send, ImagePlus, X, AlertCircle } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

function JobPostInput({ refresh, user }) {
  const [postText, setPostText] = useState("");
  const [media, setMedia] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 80)}px`;
    }
  }, [postText]);

  const postUpload = async () => {
    if (media.length === 0) return [];

    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < media.length; i++) {
      formData.append("files", media[i]);
    }

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/upload`, formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data.urls || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to upload media files");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePostSubmit = async () => {
    if (!postText.trim() && media.length === 0) {
      setError("Please enter some text or select files to post.");
      return;
    }

    setError("");
    setIsPosting(true);
    setPostText("");
    setMedia([]);
    try {
      const mediaUrls = await postUpload();
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/posts`,
        {
          postDescription: postText,
          postUserId: user._id,
          mediaUrls: mediaUrls,
        },
        { withCredentials: true }
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      refresh();
      toast.success("Post created successfully!");
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create post");
    } finally {
      setIsPosting(false);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setError("");
    if (selectedFiles.length > 10) {
      setError("You can select a maximum of 10 files.");
      return;
    }

    const validFiles = selectedFiles.filter((file) => {
      const isValidType = file.type.startsWith("image/") || file.type.startsWith("video/");
      const isValidSize = file.size <= 10 * 1024 * 1024;
      if (!isValidType || !isValidSize) return false;
      return true;
    });

    setMedia(validFiles);
  };

  const removeFile = (index) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError("");
  };

  const getThumbnail = (file) => {
    if (file.type.startsWith("image/")) return URL.createObjectURL(file);
    return null;
  };

  const isDisabled = isUploading || isPosting;

  const handleContainerClick = (e) => {
    if (!e.target.closest('button') && !e.target.closest('input') && !e.target.closest('label') && textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
<div className="px-4 pt-2 sm:px-6 lg:px-0 lg:w-3/4 lg:mx-auto min-h-[200px]">
  {error && (
    <div className="mb-4">
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-500/30">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    </div>
  )}

  {/* Wrapper that focuses textarea on click */}
  <div
    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 dark:focus-within:ring-teal-400 dark:focus-within:border-teal-400 transition-all duration-200 cursor-text"
    onClick={() => textareaRef.current?.focus()}
  >
    <div className="p-4 sm:p-5">
      <textarea
        ref={textareaRef}
        value={postText}
        onChange={(e) => setPostText(e.target.value)}
        placeholder="Give description of the job post..."
        className={`w-full text-lg dark:text-white placeholder-gray-500 dark:placeholder-gray-300 border-none resize-none focus:outline-none bg-transparent min-h-[60px] max-h-[80px] overflow-y-auto leading-relaxed ${
          isDisabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
        disabled={isDisabled}
        aria-label="Job post description"
      />

      {/* Media preview stays same */}
      {media.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {media.map((file, index) => (
              <div
                key={index}
                className="relative bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
              >
                {file.type.startsWith("image/") ? (
                  <img
                    src={getThumbnail(file)}
                    alt={file.name}
                    className="w-full h-20 sm:h-32 object-cover"
                  />
                ) : (
                  <div className="w-full h-20 sm:h-32 bg-gray-100 dark:bg-gray-700 flex flex-col items-center justify-center text-gray-600 dark:text-gray-300">
                    <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-medium">{file.name}</span>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // prevent bubbling
                    removeFile(index);
                  }}
                  className={`absolute top-1 right-1 bg-gray-900 bg-opacity-50 text-white rounded-full p-1.5 transition-colors duration-200 hover:bg-opacity-70 ${
                    isDisabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={isDisabled}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons area */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="mediaUpload"
            onClick={(e) => e.stopPropagation()}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors duration-200 ${
              isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-teal-50 dark:hover:bg-teal-500/10"
            }`}
          >
            <ImagePlus className="w-6 h-6 text-teal-500 dark:text-teal-400" />
          </label>
          <input
            type="file"
            id="mediaUpload"
            accept="image/*,video/*"
            className="hidden"
            multiple
            onChange={handleFileSelect}
            disabled={isDisabled}
            ref={fileInputRef}
          />
        </div>

        <div className="flex items-center gap-3">
          {media.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {media.length} file{media.length !== 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePostSubmit();
            }}
            className={`px-5 py-2 rounded-full font-semibold text-sm transition-all duration-200 ${
              isDisabled || (!postText.trim() && media.length === 0)
                ? "bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed"
                : "bg-teal-500 text-white hover:bg-teal-600 focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 shadow-sm hover:shadow-md"
            }`}
            disabled={isDisabled || (!postText.trim() && media.length === 0)}
          >
            {isPosting ? (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                </svg>
                <span>Posting...</span>
              </div>
            ) : isUploading ? (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Uploading...</span>
              </div>
            ) : (
              "Post"
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>


  );
}

export default JobPostInput;