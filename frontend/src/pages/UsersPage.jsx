import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import SearchBar from '../components/Searchbar'
import Modal from '../components/Modal'
import './UsersPage.css'
import { get_users, create_user, update_user, delete_user } from '../services/api'
import { FaEdit, FaTrash } from 'react-icons/fa'

export default function UsersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [activeModal, setActiveModal] = useState(null)
  const [formData, setFormData] = useState({})
  const [selectedUser, setSelectedUser] = useState(null)
  const navigate = useNavigate()

  const rawRole = localStorage.getItem('user_role')
  const userRole = rawRole?.toLowerCase() || ''

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  useEffect(() => {
    if (userRole !== 'admin') {
        navigate('/') 
        return
    }

    get_users().then(data => {
      setUsers(data)
      setFilteredUsers(data)
    })
  }, [])

  useEffect(() => {
    if (userRole !== 'admin') return

    fetchData()
    const interval = setInterval(fetchData, 1000) 
    return () => clearInterval(interval)
  }, [])
  
  const fetchData = async () => {
    try {
        const data = await get_users()
        setUsers(data)
        setFilteredUsers(data) 
      } catch (error) {
        console.error('Error fetching data:', error)
      }
  }

  const handleSearch = (filtered, query) => {
    setFilteredUsers(filtered)
  }

  // --- MODAL HANDLERS ---

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({ 
        id: user.id,
        username: user.username,
        role: user.role,
        badge_number: user.badge_number,
        password: "" 
    });
    setActiveModal('edit');
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setActiveModal('delete');
  };

  const openAddModal = () => {
    setFormData({});
    setActiveModal('add');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedUser(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    try {
      await delete_user(selectedUser.id);

      const updated = users.filter(u => u.id !== selectedUser.id);
      setUsers(updated);
      setFilteredUsers(updated);

      closeModal();
    } catch (error) {
      alert("Failed to delete user: " + error.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.password) {
          alert("Please enter a new password (or re-enter old one) to update user.");
          return;
      }

      const payload = {
        id: formData.id,
        username: formData.username,
        password: formData.password,
        role: formData.role,
        badge_number: formData.badge_number
      }
      
      const updated = await update_user(payload);

      const newUsers = users.map(u => u.id === updated.id ? updated : u);
      setUsers(newUsers);
      setFilteredUsers(newUsers);

      closeModal();
    } catch (error) {
      alert("Failed to update user: " + error.message);
      console.log(formData);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.username || !formData.password || !formData.badge_number) {
        alert("Please fill in all fields");
        return;
      }

      const newUser = {
        username: formData.username,
        password: formData.password,
        role: formData.role || "operator",
        badge_number: formData.badge_number
      };

      const created = await create_user(newUser);

      setUsers([...users, created]);
      setFilteredUsers([...filteredUsers, created]);

      closeModal();
    } catch (error) {
      console.error(error);
      alert("Failed to create user: " + error.message);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="app-container">
      <Navbar onToggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} />
        <div className={`users-page ${sidebarOpen ? 'sidebar-open' : ''}`}>
          
          <div className="new-user-button-container">
            {userRole === 'admin' && (
              <button className="new-user-button" onClick={() => openAddModal()}>
                New User
              </button>
            )}
          </div>

          <div className="header">
            <h1>Users</h1>
            <SearchBar
              items={users}
              onSearch={handleSearch}
              placeholder="Search users..."
              searchKeys={["id", "username", "badge_number", "role"]}
            />
          </div>

          <div className="users-list">
            {filteredUsers.map((user) => (
              <div key={user.id} className="users-card">
                
                {userRole === 'admin' && (
                  <div className="CRUD-buttons">
                    <button onClick={() => openEditModal(user)}><FaEdit /></button>
                    <button onClick={() => openDeleteModal(user)}><FaTrash /></button>
                  </div>
                )}

                <h2>{user.username}</h2>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>Badge #:</strong> {user.badge_number}</p>
                <p style={{fontSize: '0.8rem', color: '#666'}}>ID: {user.id}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- DELETE MODAL --- */}
      <Modal 
        isOpen={activeModal === 'delete'} 
        onClose={closeModal} 
        title="Confirm Delete"
        actions={
          <>
            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn-danger" onClick={handleDeleteConfirm}>Delete</button>
          </>
        }
      >
        <p>Are you sure you want to delete user <strong>{selectedUser?.username}</strong>?</p>
        <p style={{color: 'red', fontSize: '0.9rem'}}>This action cannot be undone.</p>
      </Modal>

      {/* --- EDIT MODAL --- */}
      <Modal 
        isOpen={activeModal === 'edit'} 
        onClose={closeModal} 
        title={`Edit User: ${selectedUser?.username}`}
        actions={
          <>
            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn-primary" onClick={handleEditSubmit}>Save Changes</button>
          </>
        }
      >
        <form id="edit-form">
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              name="username" 
              value={formData.username || ''} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>New Password</label>
            <input 
              type="text" 
              name="password" 
              placeholder="Enter new password"
              value={formData.password || ''} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select name="role" value={formData.role || 'operator'} onChange={handleInputChange}>
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label>Badge Number</label>
            <input 
              type="text" 
              name="badge_number" 
              value={formData.badge_number || ''} 
              onChange={handleInputChange} 
            />
          </div>
        </form>
      </Modal>

      {/* --- ADD MODAL --- */}
      <Modal 
        isOpen={activeModal === 'add'} 
        onClose={closeModal} 
        title="Create New User"
        actions={
          <>
            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn-primary" onClick={handleAddSubmit}>Create User</button>
          </>
        }
      >
        <form>
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              name="username" 
              placeholder="Username"
              value={formData.username || ''} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              name="password" 
              placeholder="Password"
              value={formData.password || ''} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select name="role" value={formData.role || 'operator'} onChange={handleInputChange}>
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label>Badge Number</label>
            <input 
              type="text" 
              name="badge_number" 
              placeholder="e.g. OP-1234"
              value={formData.badge_number || ''} 
              onChange={handleInputChange} 
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}