import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import SearchBar from '../components/Searchbar'
import './AmbulancesPage.css'
import { delete_ambulance, get_ambulances } from '../services/api'

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
    if (userRole == '') {
      navigate('/login_page')
    }

  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 1000) // Refresh every 1 second
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const ambulanceData = await get_ambulances()
      setAmbulances(ambulanceData)
      setFilteredAmbulances(ambulanceData)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const handleSearch = (filtered, query) => {
    setFilteredIncidents(filtered)
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
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload =
      {
        id: formData.id,
        status: formData.status,
        type: formData.type,
        nr_patients: formData.nr_patients
      }
      const updated = await update_incident(payload);

      const newIncidents = incidents.map(i => i.id === updated.id ? updated : i);
      setIncidents(newIncidents);
      setFilteredIncidents(newIncidents);

      closeModal();
    } catch (error) {
      alert("Failed to update incident: " + error.message);
      console.log(formData);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    // Convert to integer to make Pydantic happy
    if (name === 'nr_patients' || name === 'severity') {
      finalValue = value === '' ? '' : parseInt(value, 10);
    }
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.address) {
        alert("Please enter an address");
        return;
      }

      const coords = await convert_address(formData.address);

      if (!coords || !coords.lat || !coords.lon) {
        alert("Could not find coordinates for this address.");
        return;
      }


      const newIncident = {
        severity: parseInt(formData.severity) || 1,
        status: "Active",
        type: formData.type || "Unknown",
        nr_patients: parseInt(formData.nr_patients) || 1,
        lat: coords.lat,
        lon: coords.lon
      };

      const created = await create_incident(newIncident);

      setIncidents([...incidents, created]);
      setFilteredIncidents([...filteredIncidents, created]);

      closeModal();
    } catch (error) {
      console.error(error);
      alert("Failed to create incident: " + error.message);
      console.log(formData);
    }
  }
  return (
    <div className="app-container">
      <Navbar onToggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} />
        <div className={`ambulances-page ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="header">
            <h1>Ambulances</h1>
            <SearchBar
              items={ambulances}
              onSearch={handleSearch}
              placeholder="Search ambulances..."
              searchKeys={["id", "status", "type"]}
            />
          </div>
          <div className="ambulances-list">
            {filteredAmbulances.map((ambulance) => (
              <div key={ambulance.id} className="ambulances-card">
                <h2>Ambulance {ambulance.id}</h2>
                <p>Status: {ambulance.status}</p>
                <p>Location: ({ambulance.lat}, {ambulance.lon})</p>
                <p>Default Location: ({ambulance.default_lat}, {ambulance.default_lon})</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}