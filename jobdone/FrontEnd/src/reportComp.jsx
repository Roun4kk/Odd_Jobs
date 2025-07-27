import axios from "axios";
import { useState } from "react";
import { useTheme } from "./ThemeContext"; // Import useTheme

const ReportForm = ({ reportedUserId, postId, bidId, commentId }) => {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { theme } = useTheme(); // Get current theme
  const buttonStyle = {
        background: theme === 'dark' 
        ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
        : '#2dd4bf' // This is the hex code for teal-400
    };
  const handleSubmit = async () => {
    if (!text.trim()) {
      setError("Please enter a reason for the report.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/report/${reportedUserId}`,
        { text, postId, bidId, commentId },
        { withCredentials: true }
      );
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <p className="text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 p-3 rounded border border-teal-200 dark:border-teal-500/30">
        Report submitted successfully. Thank you!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400"
        rows={4}
        placeholder="Describe the issue or concern..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={loading}
      />
      {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={buttonStyle}
        className={`px-4 py-2 rounded-md text-white transition ${
          loading
            ? "bg-teal-300  cursor-not-allowed"
            : "bg-teal-500 hover:bg-teal-600"
        }`}
      >
        {loading ? "Submitting..." : "Submit Report"}
      </button>
    </div>
  );
};

export default ReportForm;