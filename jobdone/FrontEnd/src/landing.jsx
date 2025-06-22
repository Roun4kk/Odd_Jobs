import { useState } from "react";
import useAuth from "./hooks/useAuth.jsx";
import JobPostInput from "./components/jobpostinput.jsx";
import JobFeed from "./components/jobfeed.jsx";
import Sidebar from "./Sidebar";
import logo from "./assets/logo/logo-jobddone.svg";
import loadingLogo from "./assets/logo/logo-transparent-jobdone.svg";
import SearchSkills from "./components/searchSkills.jsx";
import BottomNavbar from "./bottomNavBar.jsx";
import useIsMobile from "./hooks/useIsMobile";

function Landing() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [showJobPost, setShowJobPost] = useState(false);
  const [showSkillsSearch, setShowSkillsSearch] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <img src={loadingLogo} alt="Loading..." className="w-40 h-40 animate-pulse" />
      </div>
    );
  }

  const handleOverlay = (type) => {
    if (type === "post") {
      setShowJobPost(true);
      setShowSkillsSearch(false);
    } else if (type === "skills") {
      setShowSkillsSearch(true);
      setShowJobPost(false);
    } else {
      setShowJobPost(false);
      setShowSkillsSearch(false);
    }
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Header */}
        <div className="sticky top-0 z-50 bg-white shadow-sm">
          <div className="flex items-center justify-center h-12 px-4">
            <div className="w-full items-center mt-4 justify-center max-w-[160px]">
              <img
                src={logo}
                alt="JobDone Logo"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>


        {/* Feed - Fixed container height to prevent navbar overlap */}
        {!showJobPost && !showSkillsSearch && (
          <div 
            className="w-full overflow-y-auto" // Removed padding and flex properties
            style={{ 
              height: 'calc(100dvh - 7rem)',
            }}
          > 
            {/* JobPostInput is now a direct child and will control its own width */}
            <JobPostInput
              refresh={() => setRefreshFlag((prev) => !prev)}
              user={user}
            />
            {/* A new wrapper for JobFeed to constrain its width and add padding */}
            <div className="w-full max-w-md mx-auto px-4">
              <JobFeed refreshFlag={refreshFlag} />
            </div>
          </div>
        )}

        {/* Bottom Nav - No gap, directly attached */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-md">
          <BottomNavbar />
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <div className="w-[70%] h-full fixed right-0 top-0 overflow-y-scroll">
        <div className="flex min-h-screen">
          {/* Center */}
          <div className="w-[57%] flex flex-col items-center gap-6">
            <JobPostInput
              refresh={() => setRefreshFlag((prev) => !prev)}
              user={user}
            />
            <JobFeed refreshFlag={refreshFlag} />
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

export default Landing;