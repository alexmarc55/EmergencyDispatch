import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import SearchBar from '../components/Searchbar'
import Modal from '../components/Modal'
import './AmbulancesPage.css'
import { create_ambulance, get_ambulances, update_ambulance, delete_ambulance, convert_address } from '../services/api'
import { FaEdit, FaTrash } from 'react-icons/fa'

export default function AmbulancesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [ambulances, setAmbulances] = useState([])
  const [filteredAmbulances, setFilteredAmbulances] = useState([])
  const [activeModal, setActiveModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const navigate = useNavigate()

  const rawRole = localStorage.getItem('user_role')
  const userRole = rawRole?.toLowerCase() || ''

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  useEffect(() => {
    get_ambulances().then(data => {
      setAmbulances(data)
      setFilteredAmbulances(data)
    })
    if (userRole === '') {
      navigate('/login_page')
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 1000)
    return () => clearInterval(interval)
  }, [])
  
  const fetchData = async () => {
    try {
        const data = await get_ambulances()
        setAmbulances(data)
        setFilteredAmbulances(data) 
      } catch (error) {
        console.error('Error fetching data:', error)
      }
  }

  const handleSearch = (filtered, query) => {
    setFilteredAmbulances(filtered)
  }

  const openEditModal = (ambulance) => {
    setSelectedAmbulance(ambulance);
    setFormData({ ...ambulance });
    setActiveModal('edit');
  };

  const openDeleteModal = (ambulance) => {
    setSelectedAmbulance(ambulance);
    setActiveModal('delete');
  };

  const openAddModal = () => {
    setFormData({});
    setActiveModal('add');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedAmbulance(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAmbulance) return;
    try {
      await delete_ambulance(selectedAmbulance.id);

      const updated = ambulances.filter(i => i.id !== selectedAmbulance.id);
      setAmbulances(updated);
      setFilteredAmbulances(updated);

      closeModal();
    } catch (error) {
      alert("Failed to delete ambulance: " + error.message);
      console.log(selectedAmbulance);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        id: formData.id,
        status: formData.status,
        capacity: parseInt(formData.capacity),
        lat: formData.lat,
        lon: formData.lon,
        default_lat: formData.default_lat,
        default_lon: formData.default_lon,
        driver_id: formData.driver_id,
        base_hospital_id: formData.base_hospital_id,
        assigned_unit_id: formData.assigned_unit_id
      }
      
      const updated = await update_ambulance(payload);

      const newAmbulances = ambulances.map(i => i.id === updated.id ? updated : i);
      setAmbulances(newAmbulances);
      setFilteredAmbulances(newAmbulances);

      closeModal();
    } catch (error) {
      alert("Failed to update ambulance: " + error.message);
      console.log(formData);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'capacity') {
      finalValue = value === '' ? '' : parseInt(value, 10);
    }
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.address) {
        alert("Please enter a base address");
        return;
      }

      const coords = await convert_address(formData.address);

      if (!coords || !coords.lat || !coords.lon) {
        alert("Could not find coordinates for this address.");
        return;
      }
      
      const newAmbulance = {
        status: formData.status || "Available",
        capacity: parseInt(formData.capacity) || 1,
        lat: coords.lat,
        lon: coords.lon,
        default_lat: coords.lat,
        default_lon: coords.lon,
        driver_id: formData.driver_id || null,
        base_hospital_id: formData.base_hospital_id || null
      };

      const created = await create_ambulance(newAmbulance);

      setAmbulances([...ambulances, created]);
      setFilteredAmbulances([...filteredAmbulances, created]);

      closeModal();
    } catch (error) {
      console.error(error);
      alert("Failed to create ambulance: " + error.message);
      console.log(formData);
    }
  }

  return (
    <div className="app-container">
      <Navbar onToggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} />
        <div className={`ambulances-page ${sidebarOpen ? 'sidebar-open' : ''}`}>
          
          <div className="new-incident-button-container">
            {(userRole === 'admin' || userRole === 'operator') && (
              <button className="new-incident-button" onClick={() => openAddModal()}>
                New Ambulance
              </button>
            )}
          </div>

          <div className="header">
            <h1>Ambulances</h1>
            <SearchBar
              items={ambulances}
              onSearch={handleSearch}
              placeholder="Search ambulances..."
              searchKeys={["id", "status"]}
            />
          </div>

          <div className="ambulances-list">
            {filteredAmbulances.map((ambulance) => (
              <div key={ambulance.id} className="ambulances-card">
                
                {userRole === 'admin' && (
                  <div className="CRUD-buttons">
                    <button onClick={() => openEditModal(ambulance)}><FaEdit /></button>
                    <button onClick={() => openDeleteModal(ambulance)}><FaTrash /></button>
                  </div>
                )}

                <h2>Ambulance ID: {ambulance.id}</h2>
                <p>Status: {ambulance.status}</p>
                <p>Capacity: {ambulance.capacity} Patients</p>
                <p>Location: ({ambulance.lat?.toFixed(4)}, {ambulance.lon?.toFixed(4)})</p>
                <p>Base: ({ambulance.default_lat?.toFixed(4)}, {ambulance.default_lon?.toFixed(4)})</p>
                <p>Driver ID: {ambulance.driver_id}</p>
                <p>Base Station ID: {ambulance.base_hospital_id}</p>
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
        <p>Are you sure you want to delete Ambulance #{selectedAmbulance?.id}?</p>
        <p style={{color: 'red', fontSize: '0.9rem'}}>This action cannot be undone.</p>
      </Modal>

      {/* --- EDIT MODAL --- */}
      <Modal 
        isOpen={activeModal === 'edit'} 
        onClose={closeModal} 
        title={`Edit Ambulance #${selectedAmbulance?.id}`}
        actions={
          <>
            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn-primary" onClick={handleEditSubmit}>Save Changes</button>
          </>
        }
      >
        <form id="edit-form">
          <div className="form-group">
            <label>Status</label>
            <select name="status" value={formData.status || ''} onChange={handleInputChange}>
               <option value="Available">Available</option>
               <option value="Busy">Busy</option>
               <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          <div className="form-group">
            <label>Capacity</label>
            <input 
              type="number" 
              name="capacity" 
              value={formData.capacity || 1} 
              onChange={handleInputChange} 
            />
          </div>
          <div className="form-group">
            <label>Driver ID</label>
            <input 
              type="number" 
              name="driver_id" 
              value={formData.driver_id || null} 
              onChange={handleInputChange} 
            />
          </div>
          <div className="form-group">
            <label>Base Station ID</label>
            <input 
              type="number" 
              name="base_hospital_id" 
              value={formData.base_hospital_id || null} 
              onChange={handleInputChange} 
            />
          </div>
        </form>
      </Modal>

      {/* --- ADD MODAL --- */}
      <Modal 
        isOpen={activeModal === 'add'} 
        onClose={closeModal} 
        title="Create New Ambulance"
        actions={
          <>
            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn-primary" onClick={handleAddSubmit}>Create Ambulance</button>
          </>
        }
      >
        <form>
          <div className="form-group">
            <label>Base Station Address</label>
            <input 
              type="text" 
              name="address" 
              placeholder="e.g. Spitalul Judetean"
              value={formData.address || ''} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Initial Status</label>
            <select name="status" value={formData.status || 'Available'} onChange={handleInputChange}>
               <option value="Available">Available</option>
               <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          <div className="form-group">
            <label>Capacity</label>
            <input 
              type="number" 
              name="capacity" 
              value={formData.capacity || 1} 
              onChange={handleInputChange} 
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}