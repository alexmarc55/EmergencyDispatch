import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import SearchBar from '../components/Searchbar'
import Modal from '../components/Modal'
import './HospitalsPage.css'
import { 
  get_hospitals, 
  create_hospital, 
  update_hospital, 
  delete_hospital, 
  convert_address 
} from '../services/api'
import { FaEdit, FaTrash } from 'react-icons/fa'

export default function HospitalsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hospitals, setHospitals] = useState([])
  const [filteredHospitals, setFilteredHospitals] = useState([])
  const [activeModal, setActiveModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectedHospital, setSelectedHospital] = useState(null);
  const navigate = useNavigate()

  const rawRole = localStorage.getItem('user_role')
  const userRole = rawRole?.toLowerCase() || ''

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // 1. Initial Fetch
  useEffect(() => {
    get_hospitals().then(data => {
      setHospitals(data)
      setFilteredHospitals(data)
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
        const data = await get_hospitals()
        setHospitals(data)
        setFilteredHospitals(data) 
      } catch (error) {
        console.error('Error fetching data:', error)
      }
  }

  const handleSearch = (filtered, query) => {
    setFilteredHospitals(filtered)
  }

  // --- MODAL HANDLERS ---

  const openEditModal = (hospital) => {
    setSelectedHospital(hospital);
    setFormData({ ...hospital });
    setActiveModal('edit');
  };

  const openDeleteModal = (hospital) => {
    setSelectedHospital(hospital);
    setActiveModal('delete');
  };

  const openAddModal = () => {
    setFormData({});
    setActiveModal('add');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedHospital(null);
  };

  // --- SUBMISSION HANDLERS ---

  const handleDeleteConfirm = async () => {
    if (!selectedHospital) return;
    try {
      await delete_hospital(selectedHospital.id);

      const updated = hospitals.filter(h => h.id !== selectedHospital.id);
      setHospitals(updated);
      setFilteredHospitals(updated);

      closeModal();
    } catch (error) {
      alert("Failed to delete hospital: " + error.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Pydantic Model: HospitalUpdate(id, name, type, lat, lon)
      const payload = {
        id: formData.id,
        name: formData.name,
        type: formData.type,
        lat: formData.lat,
        lon: formData.lon
      }
      
      const updated = await update_hospital(payload);

      const newHospitals = hospitals.map(h => h.id === updated.id ? updated : h);
      setHospitals(newHospitals);
      setFilteredHospitals(newHospitals);

      closeModal();
    } catch (error) {
      alert("Failed to update hospital: " + error.message);
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

      // Pydantic Model: Hospital(name, type, lat, lon)
      const newHospital = {
        name: formData.name,
        type: formData.type || "General",
        lat: coords.lat,
        lon: coords.lon
      };

      const created = await create_hospital(newHospital);

      setHospitals([...hospitals, created]);
      setFilteredHospitals([...filteredHospitals, created]);

      closeModal();
    } catch (error) {
      console.error(error);
      alert("Failed to create hospital: " + error.message);
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
        <div className={`hospitals-page ${sidebarOpen ? 'sidebar-open' : ''}`}>
          
          <div className="new-hospital-button-container">
            {(userRole === 'admin' || userRole === 'operator') && (
              <button className="new-hospital-button" onClick={() => openAddModal()}>
                New Hospital
              </button>
            )}
          </div>

          <div className="header">
            <h1>Hospitals</h1>
            <SearchBar
              items={hospitals}
              onSearch={handleSearch}
              placeholder="Search hospitals..."
              searchKeys={["id", "name", "type"]}
            />
          </div>

          <div className="hospitals-list">
            {filteredHospitals.map((hospital) => (
              <div key={hospital.id} className="hospitals-card">
                
                {userRole === 'admin' && (
                  <div className="CRUD-buttons">
                    <button onClick={() => openEditModal(hospital)}><FaEdit /></button>
                    <button onClick={() => openDeleteModal(hospital)}><FaTrash /></button>
                  </div>
                )}

                <h2>{hospital.name}</h2>
                <p><strong>ID:</strong> {hospital.id}</p>
                <p><strong>Type:</strong> {hospital.type}</p>
                <p><strong>Location:</strong> ({hospital.lat?.toFixed(4)}, {hospital.lon?.toFixed(4)})</p>
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
        <p>Are you sure you want to delete <strong>{selectedHospital?.name}</strong>?</p>
        <p style={{color: 'red', fontSize: '0.9rem'}}>This action cannot be undone.</p>
      </Modal>

      {/* --- EDIT MODAL --- */}
      <Modal 
        isOpen={activeModal === 'edit'} 
        onClose={closeModal} 
        title={`Edit: ${selectedHospital?.name}`}
        actions={
          <>
            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn-primary" onClick={handleEditSubmit}>Save Changes</button>
          </>
        }
      >
        <form id="edit-form">
          <div className="form-group">
            <label>Name</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name || ''} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Type</label>
            <input 
              type="text" 
              name="type" 
              value={formData.type || ''} 
              onChange={handleInputChange} 
            />
          </div>
        </form>
      </Modal>

      {/* --- ADD MODAL --- */}
      <Modal 
        isOpen={activeModal === 'add'} 
        onClose={closeModal} 
        title="Add New Hospital"
        actions={
          <>
            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn-primary" onClick={handleAddSubmit}>Create Hospital</button>
          </>
        }
      >
        <form>
          <div className="form-group">
            <label>Name</label>
            <input 
              type="text" 
              name="name" 
              placeholder="e.g. Spitalul Judetean"
              value={formData.name || ''} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Type</label>
            <input 
              type="text" 
              name="type" 
              placeholder="e.g. General, Pediatric, Psychiatric"
              value={formData.type || ''} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <input 
              type="text" 
              name="address" 
              placeholder="e.g. Strada George Cosbuc 31"
              value={formData.address || ''} 
              onChange={handleInputChange} 
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}