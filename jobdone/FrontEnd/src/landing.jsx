import { useState } from "react";
import useAuth from "./hooks/useAuth.jsx";
import JobPostInput from "./components/jobpostinput.jsx";
import JobFeed from "./components/jobfeed.jsx";
import Sidebar from "./Sidebar";
import logo from "./assets/logo/logo-transparent.png";
import SearchSkills from "./components/searchSkills.jsx";

function Landing() {
  const { user , loading } = useAuth();
  const [refreshFlag, setRefreshFlag] = useState(false);
  
  if (loading) {
  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <img src={logo} alt="Loading..." className="w-40 h-40 animate-pulse" />
    </div>
  );
  }
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar (30%) */}
      <Sidebar user={user} />
      {/* Main Content (70%) */}
      <div className="w-[70%] h-full fixed right-0 top-0 overflow-y-scroll">
        <div className="flex min-h-screen">
          {/* Center */}
          <div className="w-[57%] flex flex-col items-center gap-6">
            <JobPostInput
              refresh={() => setRefreshFlag((prev) => !prev)}
              user={user}
            />
            <JobFeed
              refreshFlag={refreshFlag}
            />
          </div>
          {/* Right */}
          <div className="w-[43%] bg-white sticky top-0 h-screen border-l border-gray-200">
            <SearchSkills/>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Landing;