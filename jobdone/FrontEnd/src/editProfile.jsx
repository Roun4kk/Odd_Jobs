import { useState, useEffect } from "react";
import useAuth from "./hooks/useAuth.jsx";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";


function EditProfile() {
  const { user , updateUser} = useAuth();
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState("");
  const [image, setImage] = useState("");
  const [media, setMedia] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setBio(user.userBio || "");
      setSkills(user.userSkills || []);
      setImage(user.userImage || "");
    }
  }, [user]);
  const postUpload = async () => {
      if (media.length === 0) return null;
    
      const formData = new FormData();
      for (let i = 0; i < media.length; i++) {
        formData.append("files", media[i]);
      }
    
      try {
        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/upload`, formData, {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
        return response.data.urls[0];
      } catch (error) {
        console.error("Error uploading media:", error);
        return [];
      }
    };
  const handleAddSkill = () => {
    if (newSkill && !skills.includes(newSkill)) {
      setSkills([...skills, newSkill]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
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
      console.log("userid" , user._id);
      if (uploadedImage) {
        setImage(uploadedImage);
        payload.userImage = uploadedImage;
      }
      
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/users/editprofile/${user.id||user._id}`,
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
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile.");
    }
    setIsSaving(false);
  };

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
                        <label htmlFor="mediaUpload" className="block text-white h-11 py-2 px-2 mt-2 mb-1 bg-teal-400 rounded-md cursor-pointer ml-auto">change photo</label>
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
                        isSaving ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-400 hover:bg-teal-600'
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
