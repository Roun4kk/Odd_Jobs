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

  // Mobile layout
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Mobile Header */}
        <div className="sticky top-0 bg-teal-50 z-10 shadow-sm flex-shrink-0">
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

        {/* Feed - Properly constrained container to prevent navbar overlap */}
        {!showJobPost && !showSkillsSearch && (
          <div className="flex-1 overflow-hidden">
            <div 
              className="h-full overflow-y-auto"
              style={{ 
                paddingBottom: '80px' // Account for bottom navbar height
              }}
            > 
              {/* JobPostInput is now a direct child and will control its own width */}
              <JobPostInput
                refresh={() => setRefreshFlag((prev) => !prev)}
                user={user}
              />
              {/* A wrapper for JobFeed to constrain its width and add padding */}
              <div className="w-full max-w-md mx-auto px-4">
                <JobFeed refreshFlag={refreshFlag} />
              </div>
            </div>
          </div>
        )}

        {/* Bottom Nav - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
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