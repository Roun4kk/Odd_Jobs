import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import { BadgeCheck , MoreVertical , Star} from "lucide-react";
import axios from "axios";
import  useAuth  from "./hooks/useAuth.jsx";
import UserJobs from "./userJobs";
import { useNavigate } from "react-router-dom";
import ProfileComp from "./profileComp.jsx";
import logo from "./assets/logo/logo-transparent-jobdone.svg";
function OtherProfile() {
    const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [verified, setVerified] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [job, setJob] = useState("posts");
  const { user } = useAuth();
  const [comp, setComp] = useState(false);

    const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setHasToken(true);
    } else {
      setHasToken(false);
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users/${userId}`);
        setProfile(response.data);

        if (response.data?.verified?.email && response.data?.verified?.phoneNumber) {
          setVerified(true);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfile();
  }, [userId]);

  if (!profile) {
      return (
        <div className="flex items-center justify-center h-screen bg-white">
          <img src={logo} alt="Loading..." className="w-40 h-40 animate-pulse" />
        </div>
      );
    }

  return (
    <div className="flex h-screen overflow-hidden">
      {hasToken && <Sidebar user={user} />}

      <div className={`h-full overflow-y-scroll ${hasToken ? "fixed right-0 w-[70%]" : "w-full"} bg-white`}>
        {profile.blockedUsers?.includes(user?._id) ? (
          <div className="flex items-center text-bold justify-center h-screen text-gray-500">
            User not available.
          </div>
        ) : (
          <div className={`h-full flex flex-col items-center justify-start ${!hasToken ? 'mx-auto max-w-[70%]' : ''}`}>
            {/* Profile Header */}
            <div className="w-2/3 flex items-center justify-start py-6">
              <div className="w-40 h-40 flex-shrink-0">
                <button disabled={!hasToken} className="w-full h-full cursor-pointer">
                  <img
                    src={
                      profile?.userImage ||
                      "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"
                    }
                    alt="User"
                    className="w-full h-full rounded-full border-2 border-white object-cover"
                  />
                </button>
              </div>
              <div className="ml-6 flex-1 flex-col items-start justify-center">
                <div className="flex items-center justify-start w-full gap-2">
                  <button disabled={!hasToken} className="text-2xl font-bold text-gray-800 cursor-pointer">
                    {profile?.username || "User not found"}
                  </button>
                  {verified && <BadgeCheck className="h-6 w-6 text-teal-400" />}
                  <div className="h-full ml-auto">
                    {hasToken && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate("/messages", { state: { newChatWith: profile } })}
                          className="ml-5 px-4 py-2 bg-teal-400 text-white rounded-3xl hover:bg-teal-600 transition cursor-pointer duration-200"
                        >
                          Message
                        </button>
                        <button>
                          <MoreVertical onClick = {() => {setComp(true)}}className="h-6 w-6 text-gray-400 cursor-pointer ml-2"
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-gray-600">{profile?.email || "User not found"}</p>
                <p className="text-gray-600">{profile?.userBio || "there is many many many many many many something"}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {profile?.userSkills?.map((skill, index) => (
                    <span key={index} className="bg-teal-400 text-white px-2 py-1 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                  <div className="mt-1 flex items-center gap-1 ml-auto">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.round(profile?.averageRating || 0)
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }`}
                        fill={i < Math.round(profile?.averageRating || 0) ? "#facc15" : "none"}
                      />
                    ))}
                    {profile?.averageRating && (
                      <span className="text-sm text-gray-600 ml-1">
                        {profile.averageRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Posts / Bids Toggle */}
            <div className="w-5/6 flex items-center justify-center border-t">
              <button
                onClick={() => setJob("posts")}
                className={`w-1/2 flex justify-center cursor-pointer border-t-4 ${
                  job === "posts" ? "border-teal-400" : "border-transparent"
                }`}
              >
                <div className="py-2">POSTS</div>
              </button>
              <button
                onClick={() => setJob("reviews")}
                className={`w-1/2 flex justify-center cursor-pointer border-t-4 ${
                  job === "reviews" ? "border-teal-400" : "border-transparent"
                }`}
              >
                <div className="py-2">REVIEWS</div>
              </button>
            </div>

            {/* Posts / Bids Display */}
            <div className="w-5/6 flex items-center justify-center mt-4">
              <UserJobs job={job} userProfile={profile} hasToken={hasToken} />
            </div>
          </div>
        )}
      </div>
      {hasToken && comp && <ProfileComp userId={userId} setComp={setComp}/>}
    </div>
  );

}

export default OtherProfile;