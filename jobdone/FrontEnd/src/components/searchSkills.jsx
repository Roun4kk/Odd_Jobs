import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { BadgeCheck, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function SearchSkills() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const {user} = useAuth();
  console.log("result" ,results);
  console.log("user" , user);
  const searchUsers = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users/search?query=${encodeURIComponent(searchQuery.trim())}`, {
        withCredentials: true
      });

      if (response.data && Array.isArray(response.data)) {
        setResults(response.data);
      } else {
        setResults([]);
        setError("Invalid response from server");
      }
    } catch (err) {
      console.error("Search failed", err);
      setResults([]);
      if (err.response?.status === 400) {
        setError("Please enter a valid search term");
      } else if (err.response?.status === 500) {
        setError("Server error. Please try again later.");
      } else {
        setError("Search failed. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      searchUsers(query);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [query, searchUsers]);

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setError(null);
  };

  const renderStars = (user) => {
    let average = 0;
    if (user.averageRating && user.totalRating > 0) {
      average = user.averageRating;
    } else if (user.ratings?.length > 0) {
      const total = user.ratings.reduce((acc, r) => acc + (r.rating || r.value || 0), 0);
      average = total / user.ratings.length;
    }

    const rounded = Math.round(average || 0);
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${i < rounded ? "text-yellow-400" : "text-gray-300"}`}
            fill={i < rounded ? "#facc15" : "none"}
          />
        ))}
        <span className="text-xs text-gray-600 ml-1">
          {average > 0 ? `(${average.toFixed(1)})` : "No ratings yet"}
        </span>
        {user?.ratings?.length && (<span className="text-sm text-gray-600 ml-1">
          ({user?.ratings?.length} {user?.ratings.length>1 ? "reviews" : "review"})
        </span>)}
      </div>
    );
  };

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-8">
      <div className="relative">
        <div className="w-8 h-8 border-4 border-gray-200 rounded-full"></div>
        <div className="w-8 h-8 border-4 border-teal-500 border-dashed rounded-full animate-spin absolute top-0 left-0"></div>
      </div>
      <span className="ml-3 text-gray-600 text-sm">Searching users...</span>
    </div>
  );

  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {query.trim() ? "No users found" : "Search for Skills to Hire"}
      </h3>
      <p className="text-gray-500 text-sm max-w-sm mx-auto">
        {query.trim()
          ? "Try different keywords or check your spelling"
          : "Search by skills, username, or bio to find the right person for the job"}
      </p>
    </div>
  );

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="relative mb-6">
        <input
          type="text"
          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 pr-10"
          placeholder="Search by skills, username, or bio..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-teal-500 border-dashed rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {query && !loading && !error && (
        <div className="mb-4 text-sm text-gray-600">
          {results.length === 0
            ? `No results found for "${query}"`
            : `Found ${results.length} user${results.length !== 1 ? "s" : ""} for "${query}"`}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingSpinner />
        ) : results.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {results.map(person => (
              <div
                onClick={() => {
                  if (person._id === user._id) navigate(`/profile`);
                  else navigate(`/profile/${person._id}`);
                }}
                key={person._id}
                className="p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 bg-white cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <img
                      src={person.userImage}
                      alt={person.username}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
                      onError={(e) => {
                        e.target.src =
                          "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg";
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {person.username}
                      </h3>
                      {person.verified?.email && person.verified?.phoneNumber && (
                        <BadgeCheck className="h-6 w-6 text-teal-400" />
                      )}
                    </div>

                    {person.userBio && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {person.userBio}
                      </p>
                    )}

                    {person.userSkills && person.userSkills.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {person.userSkills.slice(0, 5).map((skill, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 text-xs bg-teal-50 text-teal-700 rounded-full border border-teal-200"
                            >
                              {skill}
                            </span>
                          ))}
                          {person.userSkills.length > 5 && (
                            <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                              +{person.userSkills.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Star Rating */}
                    {renderStars(person)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchSkills;
