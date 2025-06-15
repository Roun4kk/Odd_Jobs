import { useState, useEffect, useCallback } from "react";
import useAuth from "./hooks/useAuth.jsx";
import Sidebar from "./Sidebar";
import logo from "./assets/logo/logo-transparent.png";
import JobSearchFeed from "./jobSearchFeed.jsx";
import SearchSkills from "./components/searchSkills.jsx";
import axios from "axios";

// Debounce hook for search optimization
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

function JobSearch() {
  const { user, loading } = useAuth();
  const [topBids, setTopBids] = useState({});
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [feedLoading, setFeedLoading] = useState(false);
  const [sortByMap, setSortByMap] = useState({});
  const [searchError, setSearchError] = useState(null);
  
  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fetchTopBids = async (posts) => {
    if (!posts || posts.length === 0) return;
    
    const newTopBids = {};
    const bidPromises = posts.map(async (post) => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/posts/topbid`, {
          params: { postId: post._id, sortBy: sortByMap[post._id] || "1" },
        });
        newTopBids[post._id] = res.data;
      } catch (err) {
        console.error(`Error fetching top bid for post ${post._id}:`, err);
        newTopBids[post._id] = null;
      }
    });

    await Promise.all(bidPromises);
    setTopBids(newTopBids);
  };

  const performSearch = useCallback(async (query) => {
    if (!query || query.trim() === "") {
      setFilteredPosts([]);
      setSearchError(null);
      setFeedLoading(false);
      return;
    }

    setFeedLoading(true);
    setSearchError(null);

    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/posts/search?query=${encodeURIComponent(query.trim())}`, {
        withCredentials: true
      });

      if (res.data && Array.isArray(res.data)) {
        setFilteredPosts(res.data);
        await fetchTopBids(res.data);
      } else {
        setFilteredPosts([]);
        setSearchError("Invalid response from server");
      }
    } catch (err) {
      console.error("Search error:", err);
      setFilteredPosts([]);
      
      if (err.response?.status === 400) {
        setSearchError("Please enter a valid search term");
      } else if (err.response?.status === 500) {
        setSearchError("Server error. Please try again later.");
      } else {
        setSearchError("Search failed. Please check your connection.");
      }
    } finally {
      setFeedLoading(false);
    }
  }, [sortByMap]);

  // Effect to handle debounced search
  useEffect(() => {
    performSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, performSearch]);

  const handleSearchChange = (e) => {
    const input = e.target.value;
    setSearchTerm(input);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setFilteredPosts([]);
    setSearchError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <img src={logo} alt="Loading..." className="w-40 h-40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Main Content */}
      <div className="w-[70%] h-full fixed right-0 top-0 overflow-y-scroll">
        <div className="flex min-h-screen">
          {/* Center */}
          <div className="w-[57%] flex flex-col items-center gap-6 pt-6">
            {/* Search Input with Clear Button */}
            <div className="relative w-11/12">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by description or username..."
                className="p-3 border w-full border-gray-300 rounded-md focus:outline-teal-500 focus:border-teal-500 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
              {feedLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-teal-500 border-dashed rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Search Error Display */}
            {searchError && (
              <div className="w-11/12 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {searchError}
              </div>
            )}

            {/* Search Results Info */}
            {searchTerm && !feedLoading && !searchError && (
              <div className="w-11/12 text-sm text-gray-600">
                {filteredPosts.length === 0 
                  ? `No results found for "${searchTerm}"` 
                  : `Found ${filteredPosts.length} result${filteredPosts.length !== 1 ? 's' : ''} for "${searchTerm}"`
                }
              </div>
            )}

            <JobSearchFeed 
              loading={feedLoading} 
              setPosts={setFilteredPosts} 
              posts={filteredPosts} 
              topBids={topBids} 
              setTopBids={setTopBids}
              sortByMap={sortByMap}
              setSortByMap={setSortByMap}
            />
          </div>

          {/* Right */}
          <div className="w-[43%] bg-white sticky top-0 h-screen border-l border-gray-200">
            <SearchSkills />
          </div>
        </div>
      </div>
    </div>
  );
}

export default JobSearch;