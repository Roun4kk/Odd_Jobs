import { useState, useEffect } from "react";
import useAuth from "./hooks/useAuth.jsx";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { ArrowLeft, X, Plus, Camera } from "lucide-react";
import useIsMobile from "./hooks/useIsMobile.js";
import BottomNavbar from "./bottomNavBar.jsx";
import logo from "./assets/logo/logo-transparent-jobdone.svg";
import toast from "react-hot-toast";

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
      <div className="flex items-center justify-center h-screen bg-white">
        <img src={logo} alt="Loading..." className="w-40 h-40 animate-pulse" />
      </div>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-teal-50 flex-shrink-0">
          <button
            onClick={() => navigate("/Profile")}
            className="p-2 rounded-full hover:bg-teal-100"
          >
            <ArrowLeft className="w-6 h-6 text-teal-700 hover:text-teal-900" />
          </button>
          <h1 className="text-lg font-semibold text-teal-800">Edit Profile</h1>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              isSaving
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-teal-500 text-white hover:bg-teal-600"
            }`}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>

        {/* Mobile Content */}
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
              <p className="text-sm text-gray-600">Tap to change photo</p>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Username - Read Only */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  value={user?.username || ""}
                  disabled
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>

              {/* Email - Read Only */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  value={user?.email || ""}
                  disabled
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                  rows={4}
                />
              </div>

              {/* Skills */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  Skills
                </label>
                
                {/* Skills Display */}
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm"
                      >
                        {skill}
                        <button
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-teal-600 hover:text-teal-800 transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add Skill Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add a skill"
                    className="flex-1 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <button
                    onClick={handleAddSkill}
                    disabled={!newSkill.trim() || skills.includes(newSkill.trim())}
                    className={`px-4 py-3 rounded-lg transition ${
                      !newSkill.trim() || skills.includes(newSkill.trim())
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-teal-500 text-white hover:bg-teal-600"
                    }`}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navbar */}
        {hasToken && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
            <BottomNavbar />
          </div>
        )}
      </div>
    );
  }

  // Desktop Layout (Original)
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <div className="w-[70%] h-full fixed right-0 top-0 bg-white flex items-center justify-start overflow-y-scroll">
        <div className="w-5/6 mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
          {image && (
            <div className="mb-4 flex ">
              <img
                src={image}
                alt="Profile preview"
                className="w-24 h-24 rounded-full object-cover border"
              />
              <label
                htmlFor="mediaUpload"
                className="block text-white h-11 py-2 px-2 mt-2 mb-1 bg-teal-400 rounded-md cursor-pointer ml-auto"
              >
                change photo
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
            <label className="block text-gray-600 mb-1">Username</label>
            <input
              value={user?.username || ""}
              disabled
              className="w-full border rounded-md p-2 bg-gray-100"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-600 mb-1">Email</label>
            <input
              value={user?.email || ""}
              disabled
              className="w-full border rounded-md p-2 bg-gray-100"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-600 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full border rounded-md p-2"
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-600 mb-1">Skills</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-teal-400 text-white rounded-full text-sm flex items-center gap-1"
                >
                  {skill}
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="ml-1 text-white hover:text-red-300"
                  >
                    ×
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
                className="flex-grow border rounded-md p-2"
              />
              <button
                onClick={handleAddSkill}
                disabled={!newSkill || skills.includes(newSkill)}
                className="bg-teal-400 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-teal-600"
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
                ? "bg-teal-400 cursor-not-allowed"
                : "bg-teal-400 hover:bg-teal-600"
            }`}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditProfile;