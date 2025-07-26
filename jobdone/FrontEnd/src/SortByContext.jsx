// --- START OF FILE SortByContext.jsx ---

import { createContext, useContext, useState, useCallback } from "react";

const SortByContext = createContext();

export const SortByProvider = ({ children }) => {
  const [state, setState] = useState({
    // Key to track which feed is currently displayed to the user
    activeFeedKey: null, 
    // An object to hold the sort maps for different feeds
    feeds: {
      jobFeed: {},
      userJobs: {},
      // You could add more here later, e.g., 'searchFeed'
    },
  });

  // Action: A component (like JobFeed or UserJobs) calls this on mount
  // to tell the context "I am now the active feed".
  const setActiveFeed = useCallback((feedKey) => {
    setState(prev => ({ ...prev, activeFeedKey: feedKey }));
  }, []);

  // Action: Replaces the entire sort map for a specific feed.
  // This is used on the initial data fetch.
  const setFeedMap = useCallback((feedKey, newMap) => {
    setState(prev => ({
      ...prev,
      feeds: {
        ...prev.feeds,
        [feedKey]: newMap,
      },
    }));
  }, []);

  // Action: Updates the sort value for a single post within a specific feed.
  // This is used when a user changes a dropdown.
  const updatePostSort = useCallback((feedKey, postId, sortValue) => {
    setState(prev => {
      // Ensure the feed key exists to avoid errors
      if (!prev.feeds[feedKey]) return prev;

      return {
        ...prev,
        feeds: {
          ...prev.feeds,
          [feedKey]: {
            ...prev.feeds[feedKey],
            [postId]: sortValue,
          },
        },
      };
    });
  }, []);

  // Derived State: The currently active sort map.
  // Components like BidOverlay or PostCard only need to know about this.
  // This simplifies their logic immensely. They don't need to know which feed they are in.
  const activeSortMap = state.feeds[state.activeFeedKey] || {};

  // The value provided to all consumer components
  const value = {
    // Actions
    setActiveFeed,
    setFeedMap,
    updatePostSort,
    // State
    activeSortMap, // The one most components will use
  };

  return (
    <SortByContext.Provider value={value}>
      {children}
    </SortByContext.Provider>
  );
};

export const useSortBy = () => useContext(SortByContext);