import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./SettingsPage.css";
import Sidebar from "../components/Sidebar";
import { get_users, update_user, check_password } from "../services/api";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const userId = parseInt(localStorage.getItem("user_id"));

  useEffect(() => {
    if (!userId) {
      navigate("/login_page");
      return;
    }
    const fetchUser = async () => {
      try {
        const data = await get_users();
        const user = data.find((u) => u.id === userId);
        if (user) setUserInfo(user);
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };
    fetchUser();
  }, []);

  const change_password = async () => {
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    try {
      const isCurrentPasswordValid = await check_password(
        currentPassword,
        userInfo.password,
      );
      if (!isCurrentPasswordValid) {
        alert("Current password is incorrect.");
        return;
      }
      const newUserInfo = { ...userInfo, password: newPassword };
      const response = await update_user(newUserInfo);
      if (response) {
        alert("Password updated successfully!");
      } else {
        alert("Failed to update password. Please try again.");
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };
  if (!userInfo) return <div>Loading...</div>;

  return (
    <div className="app-container">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} />
        <div className={`settings-page ${sidebarOpen ? "sidebar-open" : ""}`}>
          <div className="profile-section">
            <h2>Profile Settings</h2>
            <h3>Username: {userInfo.username}</h3>
            <h3>Role: {userInfo.role}</h3>
            <h3>Badge Number: {userInfo.badge_number}</h3>
          </div>
          <div className="security-section">
            <h2>Change Password</h2>
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button onClick={change_password}>Update Password</button>
          </div>
        </div>
      </div>
    </div>
  );
}
