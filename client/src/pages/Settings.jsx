"use client";

import { useState } from "react";
import axios from "axios";

function Settings({ user, onLogout }) {
  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfilePhotoChange = (e) => {
    setProfilePhoto(e.target.files[0]);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await axios.put(
        "http://localhost:5000/users/profile",
        formData,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setSuccessMessage("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      setErrorMessage("Failed to update profile.");
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage("New password and confirm password do not match.");
      return;
    }

    try {
      const response = await axios.put(
        "http://localhost:5000/users/password",
        passwordData,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setSuccessMessage("Password updated successfully!");
    } catch (err) {
      console.error("Error updating password:", err);
      setErrorMessage("Failed to update password.");
    }
  };

  const handleProfilePhotoUpload = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!profilePhoto) {
      setErrorMessage("Please select a profile photo to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("profilePhoto", profilePhoto);

    try {
      const response = await axios.post(
        "http://localhost:5000/users/profile-photo",
        formData,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setSuccessMessage("Profile photo uploaded successfully!");
    } catch (err) {
      console.error("Error uploading profile photo:", err);
      setErrorMessage("Failed to upload profile photo.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl text-white mb-6">Settings</h1>

      {successMessage && <p className="text-green-500 mb-4">{successMessage}</p>}
      {errorMessage && <p className="text-red-500 mb-4">{errorMessage}</p>}

      {/* Update Profile Form */}
      <div className="bg-content-bg p-6 rounded-lg mb-6">
        <h2 className="text-xl text-white mb-4">Update Profile</h2>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label className="block text-white mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-white mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-white mb-1">Phone Number</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
            />
          </div>
          <button
            type="submit"
            className="bg-purple-accent text-white p-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Update Profile
          </button>
        </form>
      </div>

      {/* Change Password Form */}
      <div className="bg-content-bg p-6 rounded-lg mb-6">
        <h2 className="text-xl text-white mb-4">Change Password</h2>
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="block text-white mb-1">Current Password</label>
            <input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-white mb-1">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-white mb-1">Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-purple-accent text-white p-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Change Password
          </button>
        </form>
      </div>

      {/* Upload Profile Photo */}
      <div className="bg-content-bg p-6 rounded-lg mb-6">
        <h2 className="text-xl text-white mb-4">Upload Profile Photo</h2>
        <form onSubmit={handleProfilePhotoUpload} className="space-y-4">
          <div>
            <label className="block text-white mb-1">Profile Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleProfilePhotoChange}
              className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
            />
          </div>
          <button
            type="submit"
            className="bg-purple-accent text-white p-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Upload Photo
          </button>
        </form>
      </div>
    </div>
  );
}

export default Settings;