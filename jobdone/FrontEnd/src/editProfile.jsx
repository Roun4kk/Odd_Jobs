import { useState, useEffect, useRef } from "react"; // Added useRef
import useAuth from "./hooks/useAuth.jsx";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { ArrowLeft, X, Plus, Camera } from "lucide-react";
import useIsMobile from "./hooks/useIsMobile.js";
import BottomNavbar from "./bottomNavBar.jsx";
import logo from "./assets/logo/logo-transparent-jobdone.svg";
import toast from "react-hot-toast";
import { useTheme } from "./ThemeContext";

// --- HOOK PORTED FROM App.jsx ---
// This hook provides a robust solution for the virtual keyboard covering inputs on mobile.
// It listens for the viewport to resize (which happens when the keyboard appears)
// and then scrolls the currently active input into the center of the view.
const useMobileInputFocus = () => {
  const isMobile = useIsMobile();
  const activeElementRef = useRef(null);

  useEffect(() => {
    if (!isMobile) return;

    const handleFocusIn = (e) => {
      const target = e.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        activeElementRef.current = target;
      }
    };

    const handleFocusOut = () => {
      activeElementRef.current = null;
    };

    const handleViewportResize = () => {
      if (activeElementRef.current) {
        setTimeout(() => {
          activeElementRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 100); 
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    // Use the visualViewport API for better reliability
    window.visualViewport?.addEventListener("resize", handleViewportResize);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
    };
  }, [isMobile]);
};


function EditProfile() {
  const { user, updateUser , loading } = useAuth();
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState("");
  const [image, setImage] = useState("");
  const [media, setMedia] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { theme } = useTheme();

  // Activate the keyboard handling hook for mobile
  useMobileInputFocus();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        console.log("No user found, redirecting to login");
        navigate("/");
      } else {
        console.log("User found, setting hasToken to true");
        setHasToken(true);
      }
    }
  }, [user, loading, navigate]);
  
  useEffect(() => {
    if (user) {
      setBio(user.userBio || "");
      setSkills(user.userSkills || []);
      setImage(user.userImage || "");
      setHasToken(true);
    }
  }, [user]);

  const postUpload = async () => {
    if (media.length === 0) return null;

    const formData = new FormData();
    for (let i = 0; i < media.length; i++) {
      formData.append("files", media[i]);
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/upload`,
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data.urls[0];
    } catch (error) {
      console.error("Error uploading media:", error);
      return null;
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill();
    }
  };
  const headingStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
      : '#f0fdfa' // This is the hex code for teal-400
  };
  const buttonStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
      : '#2dd4bf' // This is the hex code for teal-400
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const uploadedImage = await postUpload();
      const payload = {
        userBio: bio,
        userSkills: skills,
      };

      if (uploadedImage) {
        setImage(uploadedImage);
        payload.userImage = uploadedImage;
      }

      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/users/editprofile/${
          user.id || user._id
        }`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedUserData = response.data || payload;
      const updatedUser = { ...user, ...updatedUserData };
      updateUser(updatedUser);

      navigate("/Profile");
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error("Failed to update profile.");
    }
    setIsSaving(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <img src={logo} alt="Loading..." className="w-40 h-40 animate-pulse" />
      </div>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200  bg-teal-50 dark:bg-gray-800 flex-shrink-0" style={headingStyle}>
          <button
            onClick={() => navigate("/Profile")}
            className="p-2 rounded-full hover:bg-teal-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-6 h-6 text-teal-700 dark:text-teal-300 hover:text-teal-900" />
          </button>
          <h1 className="text-lg font-semibold text-teal-800 dark:text-teal-400">Edit Profile</h1>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              isSaving
                ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                : "bg-teal-600 text-white hover:bg-teal-600"
            }`}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>

        {/* Mobile Content - Removed scrollPaddingBottom style */}
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="p-4 space-y-6">
            {/* Profile Image Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-teal-400">
                  <img
                    src={
                      image ||
                      "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"
                    }
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <label
                  htmlFor="mediaUpload"
                  className="absolute -bottom-2 -right-2 bg-teal-500 text-white p-2 rounded-full cursor-pointer hover:bg-teal-600 transition"
                >
                  <Camera className="w-4 h-4" />
                </label>
                <input
                  type="file"
                  id="mediaUpload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    if (files.length > 0) {
                      setMedia(files);
                      const previewURL = URL.createObjectURL(files[0]);
                      setImage(previewURL);
                    }
                  }}
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tap to change photo</p>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Username - Read Only */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Username
                </label>
                <input
                  value={user?.username || ""}
                  disabled
                  className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                />
              </div>

              {/* Email - Read Only */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  value={user?.email || ""}
                  disabled
                  className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                />
              </div>

              {/* Bio - Removed onFocus */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:focus:border-teal-400 resize-none"
                  rows={4}
                />
              </div>

              {/* Skills */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Skills
                </label>
                
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 rounded-full text-sm"
                      >
                        {skill}
                        <button
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-teal-600 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-100 transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {/* Skill input - Removed onFocus */}
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add a skill"
                    className="flex-1 px-3 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:focus:border-teal-400"
                  />
                  <button
                    onClick={handleAddSkill}
                    disabled={!newSkill.trim() || skills.includes(newSkill.trim())}
                    className={`px-4 py-3 rounded-lg transition ${
                      !newSkill.trim() || skills.includes(newSkill.trim())
                        ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        : "bg-teal-500 text-white hover:bg-teal-600"
                    }`}
                    style={!newSkill.trim() || skills.includes(newSkill.trim()) ? {} : buttonStyle}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {hasToken && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <BottomNavbar />
          </div>
        )}
      </div>
    );
  }

  // Desktop Layout (unchanged)
  return (
    <div className="flex h-screen overflow-hidden dark:bg-gray-900">
      <Sidebar user={user} />
      <div className="w-[70%] h-full fixed right-0 top-0 bg-white dark:bg-gray-900 flex items-center justify-start overflow-y-scroll">
        <div className="w-5/6 mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4 dark:text-white">Edit Profile</h2>
          {image && (
            <div className="mb-4 flex items-center">
              <img
                src={image}
                alt="Profile preview"
                className="w-24 h-24 rounded-full object-cover border dark:border-gray-600"
              />
              <label
                htmlFor="mediaUpload"
                className="block text-white py-2 px-4 rounded-md cursor-pointer ml-auto hover:bg-teal-500"
                style={buttonStyle}
              >
                Change Photo
              </label>
              <input
                type="file"
                id="mediaUpload"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  setMedia(files);
                  const previewURL = URL.createObjectURL(files[0]);
                  setImage(previewURL);
                }}
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-gray-600 dark:text-gray-300 mb-1">Username</label>
            <input
              value={user?.username || ""}
              disabled
              className="w-full border dark:border-gray-600 rounded-md p-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-600 dark:text-gray-300 mb-1">Email</label>
            <input
              value={user?.email || ""}
              disabled
              className="w-full border dark:border-gray-600 rounded-md p-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-600 dark:text-gray-300 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2"
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-600 dark:text-gray-300 mb-1">Skills</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1  text-white rounded-full text-sm flex items-center gap-1"
                  style ={buttonStyle}
                >
                  {skill}
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="ml-1 text-white hover:text-red-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add new skill"
                className="flex-grow border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2"
              />
              <button
                onClick={handleAddSkill}
                disabled={!newSkill || skills.includes(newSkill)}
                className=" text-white px-4 py-2 rounded-md cursor-pointer hover:bg-teal-600 disabled:opacity-50"
                style={!newSkill.trim() || skills.includes(newSkill.trim()) ? {} : buttonStyle}
              >
                Add
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`mt-4 px-6 py-2 rounded-md text-white cursor-pointer ${
              isSaving
                ? "bg-teal-400/50 cursor-not-allowed"
                : "bg-teal-400 hover:bg-teal-600"
            }`}
            style={buttonStyle}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditProfile;