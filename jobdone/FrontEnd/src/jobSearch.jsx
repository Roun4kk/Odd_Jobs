import { useState, useEffect, useCallback } from "react";
import useAuth from "./hooks/useAuth.jsx";
import Sidebar from "./Sidebar";
import logo from "./assets/logo/logo-transparent.png";
import JobSearchFeed from "./jobSearchFeed.jsx";
import axios from "axios";
import useIsMobile from "./hooks/useIsMobile";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Star, X, Search } from "lucide-react";
import SearchSkills from "./components/searchSkills.jsx";
import BottomNavbar from "./bottomNavBar.jsx";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

function JobSearch() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [topBids, setTopBids] = useState({});
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [feedLoading, setFeedLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [activeTab, setActiveTab] = useState("jobs");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const performSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setFilteredPosts([]);
      setFilteredUsers([]);
      setSearchError(null);
      setFeedLoading(false);
      return;
    }
    setFeedLoading(true);
    setSearchError(null);

    try {
      if (activeTab === "jobs") {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/posts/search?query=${encodeURIComponent(query.trim())}`, { withCredentials: true });
        if (res.data && Array.isArray(res.data)) setFilteredPosts(res.data);
        else setSearchError("Invalid response from server");
      } else if (activeTab === "skills") {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users/search?query=${encodeURIComponent(query.trim())}`, { withCredentials: true });
        if (res.data && Array.isArray(res.data)) setFilteredUsers(res.data);
        else setSearchError("Invalid response from server");
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchError("Search failed. Please try again.");
    } finally {
      setFeedLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    performSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, performSearch]);

  const clearSearch = () => {
    setSearchTerm("");
    setFilteredPosts([]);
    setFilteredUsers([]);
    setSearchError(null);
  };

  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="relative">
        <div className="w-10 h-10 border-4 border-gray-200 rounded-full"></div>
        <div className="w-10 h-10 border-4 border-teal-500 border-dashed rounded-full animate-spin absolute top-0 left-0"></div>
      </div>
      <p className="text-gray-500 text-sm font-medium">Searching...</p>
    </div>
  );

  const renderUserCard = (person) => {
    const average = person.averageRating || 0;
    const stars = Math.round(average);

    return (
      <div
        key={person._id}
        onClick={() => navigate(person._id === user._id ? "/profile" : `/profile/${person._id}`)}
        className="p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 bg-white cursor-pointer mb-4"
      >
        <div className="flex items-start gap-4">
          <img
            src={person.userImage || "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"}
            alt={person.username}
            className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{person.username}</h3>
              {person.verified?.email && person.verified?.phoneNumber && (
                <BadgeCheck className="h-5 w-5 text-teal-400" />
              )}
            </div>
            {person.userBio && <p className="text-sm text-gray-600 mb-2 line-clamp-2">{person.userBio}</p>}
            <div className="flex flex-wrap gap-1 mb-2">
              {person.userSkills?.slice(0, 5).map((skill, i) => (
                <span key={i} className="inline-block px-2 py-1 text-xs bg-teal-50 text-teal-700 rounded-full border border-teal-200">{skill}</span>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < stars ? "text-yellow-400" : "text-gray-300"}`}
                  fill={i < stars ? "#facc15" : "none"}
                />
              ))}
              <span className="text-xs text-gray-600 ml-1">{average > 0 ? `(${average.toFixed(1)})` : "No ratings yet"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-white"><img src={logo} alt="Loading..." className="w-40 h-40 animate-pulse" /></div>;
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-white pb-20 px-4 pt-4">
        <div className="mb-6 bg-teal-50 p-4 rounded-xl shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search jobs or skills..."
              className="w-full pl-12 pr-10 py-3 border border-teal-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-teal-900 text-sm"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {feedLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-teal-500 border-dashed rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-around mb-6">
          <button
            onClick={() => setActiveTab("jobs")}
            className={`flex items-center px-5 py-2 rounded-full ${activeTab === "jobs" ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            Jobs
          </button>
          <button
            onClick={() => setActiveTab("skills")}
            className={`flex items-center px-5 py-2 rounded-full ${activeTab === "skills" ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            Skills
          </button>
        </div>

        {searchError && (
          <p className="text-red-500 text-sm mb-4 text-center bg-red-50 p-2 rounded-lg">{searchError}</p>
        )}

        {activeTab === "jobs" ? (
          <div className="w-full">
            <JobSearchFeed
              loading={feedLoading}
              setPosts={setFilteredPosts}
              posts={filteredPosts}
              topBids={topBids}
              setTopBids={setTopBids}
              sortByMap={{}}
              setSortByMap={() => {}}
            />
          </div>
        ) : (
          <div className="w-full">
            {feedLoading ? <LoadingSpinner /> : (
              filteredUsers.length > 0 ? (
                filteredUsers.map(renderUserCard)
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">{searchTerm.trim() ? "No users found" : "Start typing to search by skill or username."}</p>
              )
            )}
          </div>
        )}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-lg border-t border-gray-200">
          <BottomNavbar />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <div className="w-[70%] h-full fixed right-0 top-0 overflow-y-scroll">
        <div className="flex min-h-screen">
          <div className="w-[57%] flex flex-col items-center gap-6 pt-6">
            <div className="relative w-11/12">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

            {searchError && (
              <div className="w-11/12 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {searchError}
              </div>
            )}

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
              sortByMap={{}}
              setSortByMap={() => {}}
            />
          </div>

          <div className="w-[43%] bg-white sticky top-0 h-screen border-l border-gray-200">
            <SearchSkills />
          </div>
        </div>
      </div>
    </div>
  );
}

export default JobSearch;