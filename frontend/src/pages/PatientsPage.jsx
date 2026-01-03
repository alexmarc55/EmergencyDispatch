import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import SearchBar from '../components/Searchbar'
import Modal from '../components/Modal'
import './PatientsPage.css'
import { get_patients, create_patient, update_patient, delete_patient } from '../services/api'
import { FaEdit, FaTrash } from 'react-icons/fa'

export default function PatientsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [patients, setPatients] = useState([])
  const [filteredPatients, setFilteredPatients] = useState([])
  const [activeModal, setActiveModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectedPatient, setSelectedPatient] = useState(null);
  const navigate = useNavigate()

  const rawRole = localStorage.getItem('user_role')
  const userRole = rawRole?.toLowerCase() || ''

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  useEffect(() => {
    get_patients().then(data => {
      setPatients(data)
      setFilteredPatients(data)
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
        const data = await get_patients()
        setPatients(data)
        setFilteredPatients(data) 
      } catch (error) {
        console.error('Error fetching data:', error)
      }
  }

  const handleSearch = (filtered, query) => {
    setFilteredPatients(filtered)
  }

  const openEditModal = (patient) => {
    setSelectedPatient(patient);
    
    const historyString = patient.medical_history 
      ? Array.isArray(patient.medical_history) 
        ? patient.medical_history.join(', ') 
        : patient.medical_history
      : '';

    setFormData({ ...patient, medical_history: historyString });
    setActiveModal('edit');
  };

  const openDeleteModal = (patient) => {
    setSelectedPatient(patient);
    setActiveModal('delete');
  };

  const openAddModal = () => {
    setFormData({});
    setActiveModal('add');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedPatient(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPatient) return;
    try {
      await delete_patient(selectedPatient.id);

      const updated = patients.filter(i => i.id !== selectedPatient.id);
      setPatients(updated);
      setFilteredPatients(updated);

      closeModal();
    } catch (error) {
      alert("Failed to delete patient: " + error.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convert comma-separated string back to List for backend
      const historyList = formData.medical_history 
        ? typeof formData.medical_history === 'string' 
            ? formData.medical_history.split(',').map(item => item.trim()) 
            : formData.medical_history
        : [];

      const payload = {
        id: formData.id,
        name: formData.name,
        age: parseInt(formData.age),
        phone_number: formData.phone_number,
        medical_history: historyList
      }
      
      const updated = await update_patient(payload);

      const newPatients = patients.map(i => i.id === updated.id ? updated : i);
      setPatients(newPatients);
      setFilteredPatients(newPatients);

      closeModal();
    } catch (error) {
      alert("Failed to update patient: " + error.message);
      console.log(formData);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.name) {
        alert("Please enter a patient name");
        return;
      }

      // Convert string to list
      const historyList = formData.medical_history 
      ? formData.medical_history.split(',').map(item => item.trim()) 
      : [];

      const newPatient = {
        name: formData.name,
        age: parseInt(formData.age) || 0,
        phone_number: formData.phone_number || "",
        medical_history: historyList
      };

      const created = await create_patient(newPatient);

      setPatients([...patients, created]);
      setFilteredPatients([...filteredPatients, created]);

      closeModal();
    } catch (error) {
      console.error(error);
      alert("Failed to create patient: " + error.message);
      console.log(formData);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'age') {
      finalValue = value === '' ? '' : parseInt(value, 10);
    }
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  return (
    <div className="app-container">
      <Navbar onToggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} />
        <div className={`patients-page ${sidebarOpen ? 'sidebar-open' : ''}`}>
          
          <div className="new-patient-button-container">
            {(userRole === 'admin' || userRole === 'operator') && (
              <button className="new-patient-button" onClick={() => openAddModal()}>
                New Patient
              </button>
            )}
          </div>

          <div className="header">
            <h1>Patients</h1>
            <SearchBar
              items={patients}
              onSearch={handleSearch}
              placeholder="Search patients..."
              searchKeys={["id", "name", "phone_number"]}
            />
          </div>

          <div className="patients-list">
            {filteredPatients.map((patient) => (
              <div key={patient.id} className="patients-card">
                
                {(userRole === 'admin' || userRole === 'operator') && (
                  <div className="CRUD-buttons">
                    <button onClick={() => openEditModal(patient)}><FaEdit /></button>
                    <button onClick={() => openDeleteModal(patient)}><FaTrash /></button>
                  </div>
                )}

                <h2>{patient.name} (ID: {patient.id})</h2>
                <p><strong>Age:</strong> {patient.age}</p>
                <p><strong>Phone:</strong> {patient.phone_number}</p>
                <p><strong>Medical History:</strong> {Array.isArray(patient.medical_history) ? patient.medical_history.join(', ') : patient.medical_history}</p>
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
        <p>Are you sure you want to delete patient <strong>{selectedPatient?.name}</strong>?</p>
        <p style={{color: 'red', fontSize: '0.9rem'}}>This action cannot be undone.</p>
      </Modal>

      {/* --- EDIT MODAL --- */}
      <Modal 
        isOpen={activeModal === 'edit'} 
        onClose={closeModal} 
        title={`Edit Patient: ${selectedPatient?.name}`}
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
            <label>Age</label>
            <input 
              type="number" 
              name="age" 
              value={formData.age || ''} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input 
              type="text" 
              name="phone_number" 
              value={formData.phone_number || ''} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Medical History (Comma separated)</label>
            <textarea 
              name="medical_history" 
              rows="3"
              placeholder="e.g. Diabetes, Asthma, Allergy to Penicillin"
              value={formData.medical_history || ''} 
              onChange={handleInputChange} 
              style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}
            />
          </div>
        </form>
      </Modal>

      {/* --- ADD MODAL --- */}
      <Modal 
        isOpen={activeModal === 'add'} 
        onClose={closeModal} 
        title="Register New Patient"
        actions={
          <>
            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn-primary" onClick={handleAddSubmit}>Create Patient</button>
          </>
        }
      >
        <form>
          <div className="form-group">
            <label>Name</label>
            <input 
              type="text" 
              name="name" 
              placeholder="e.g. Ion Popescu"
              value={formData.name || ''} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Age</label>
            <input 
              type="number" 
              name="age" 
              value={formData.age || ''} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input 
              type="text" 
              name="phone_number" 
              placeholder="e.g. 0740..."
              value={formData.phone_number || ''} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Medical History (Comma separated)</label>
            <textarea 
              name="medical_history" 
              rows="3"
              placeholder="e.g. Diabetes, Asthma"
              value={formData.medical_history || ''} 
              onChange={handleInputChange}
              style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}