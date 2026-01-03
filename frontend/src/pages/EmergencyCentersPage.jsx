import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import SearchBar from '../components/Searchbar'
import Modal from '../components/Modal'
import './EmergencyCentersPage.css'
import { 
  get_emergency_centers, 
  create_emergency_center, 
  update_emergency_center, 
  delete_emergency_center, 
  convert_address 
} from '../services/api'
import { FaEdit, FaTrash } from 'react-icons/fa'

export default function EmergencyCentersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [centers, setCenters] = useState([])
  const [filteredCenters, setFilteredCenters] = useState([])
  const [activeModal, setActiveModal] = useState(null)
  const [formData, setFormData] = useState({})
  const [selectedCenter, setSelectedCenter] = useState(null)
  const navigate = useNavigate()

  const rawRole = localStorage.getItem('user_role')
  const userRole = rawRole?.toLowerCase() || ''

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // 1. Initial Fetch
  useEffect(() => {
    get_emergency_centers().then(data => {
      setCenters(data)
      setFilteredCenters(data)
    })
    if (userRole === '') {
      navigate('/login_page')
    }
  }, [])

  // 2. Real-time Polling
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 1000) 
    return () => clearInterval(interval)
  }, [])
  
  const fetchData = async () => {
    try {
        const data = await get_emergency_centers()
        setCenters(data)
        setFilteredCenters(data) 
      } catch (error) {
        console.error('Error fetching data:', error)
      }
  }

  const handleSearch = (filtered, query) => {
    setFilteredCenters(filtered)
  }

  // --- MODAL HANDLERS ---

  const openEditModal = (center) => {
    setSelectedCenter(center);
    setFormData({ ...center });
    setActiveModal('edit');
  };

  const openDeleteModal = (center) => {
    setSelectedCenter(center);
    setActiveModal('delete');
  };

  const openAddModal = () => {
    setFormData({});
    setActiveModal('add');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedCenter(null);
  };

  // --- SUBMISSION HANDLERS ---

  const handleDeleteConfirm = async () => {
    if (!selectedCenter) return;
    try {
      await delete_emergency_center(selectedCenter.id);

      const updated = centers.filter(c => c.id !== selectedCenter.id);
      setCenters(updated);
      setFilteredCenters(updated);

      closeModal();
    } catch (error) {
      alert("Failed to delete center: " + error.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Pydantic Model: EmergencyCenterUpdate(id, name, lat, lon)
      const payload = {
        id: formData.id,
        name: formData.name,
        lat: formData.lat,
        lon: formData.lon
      }
      
      const updated = await update_emergency_center(payload);

      const newCenters = centers.map(c => c.id === updated.id ? updated : c);
      setCenters(newCenters);
      setFilteredCenters(newCenters);

      closeModal();
    } catch (error) {
      alert("Failed to update center: " + error.message);
      console.log(formData);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.address) {
        alert("Please enter an address");
        return;
      }
      if (!formData.name) {
        alert("Please enter a name");
        return;
      }

      const coords = await convert_address(formData.address);

      if (!coords || !coords.lat || !coords.lon) {
        alert("Could not find coordinates for this address.");
        return;
      }

      const newCenter = {
        name: formData.name,
        lat: coords.lat,
        lon: coords.lon
      };

      const created = await create_emergency_center(newCenter);

      setCenters([...centers, created]);
      setFilteredCenters([...filteredCenters, created]);

      closeModal();
    } catch (error) {
      console.error(error);
      alert("Failed to create center: " + error.message);
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
        <div className={`emergency-centers-page ${sidebarOpen ? 'sidebar-open' : ''}`}>
          
          <div className="new-center-button-container">
            {(userRole === 'admin' || userRole === 'operator') && (
              <button className="new-center-button" onClick={() => openAddModal()}>
                New Center
              </button>
            )}
          </div>

          <div className="header">
            <h1>Emergency Centers</h1>
            <SearchBar
              items={centers}
              onSearch={handleSearch}
              placeholder="Search centers..."
              searchKeys={["id", "name"]}
            />
          </div>

          <div className="emergency-centers-list">
            {filteredCenters.map((center) => (
              <div key={center.id} className="emergency-centers-card">
                
                {userRole === 'admin' && (
                  <div className="CRUD-buttons">
                    <button onClick={() => openEditModal(center)}><FaEdit /></button>
                    <button onClick={() => openDeleteModal(center)}><FaTrash /></button>
                  </div>
                )}

                <h2>{center.name}</h2>
                <p><strong>ID:</strong> {center.id}</p>
                <p><strong>Location:</strong> ({center.lat?.toFixed(4)}, {center.lon?.toFixed(4)})</p>
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
        <p>Are you sure you want to delete <strong>{selectedCenter?.name}</strong>?</p>
        <p style={{color: 'red', fontSize: '0.9rem'}}>This action cannot be undone.</p>
      </Modal>

      {/* --- EDIT MODAL --- */}
      <Modal 
        isOpen={activeModal === 'edit'} 
        onClose={closeModal} 
        title={`Edit: ${selectedCenter?.name}`}
        actions={
          <>
            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn-primary" onClick={handleEditSubmit}>Save Changes</button>
          </>
        }
      >
        <form id="edit-form">
          <div className="form-group">
            <label>Center Name</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name || ''} 
              onChange={handleInputChange} 
            />
          </div>
        </form>
      </Modal>

      {/* --- ADD MODAL --- */}
      <Modal 
        isOpen={activeModal === 'add'} 
        onClose={closeModal} 
        title="Add New Emergency Center"
        actions={
          <>
            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn-primary" onClick={handleAddSubmit}>Create Center</button>
          </>
        }
      >
        <form>
          <div className="form-group">
            <label>Center Name</label>
            <input 
              type="text" 
              name="name" 
              placeholder="e.g. Central Emergency Unit"
              value={formData.name || ''} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <input 
              type="text" 
              name="address" 
              placeholder="e.g. Bulevardul Unirii 10"
              value={formData.address || ''} 
              onChange={handleInputChange} 
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}