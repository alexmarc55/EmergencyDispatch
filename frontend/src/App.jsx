import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Map from './Map'
import NewIncidentModal from './components/NewIncidentModal'
import './App.css'
import { get_incidents, get_ambulances, get_hospitals } from './services/api'
import { FaPlus } from 'react-icons/fa' // Import Plus Icon

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [incidents, setIncidents] = useState([])
  const [ambulances, setAmbulances] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [newIncidentModalOpen, setNewIncidentModalOpen] = useState(false)

  const rawRole = localStorage.getItem('user_role')
  const userRole = rawRole?.toLowerCase() || ''

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  useEffect(() => {
      fetchData()
      const interval = setInterval(fetchData, 1000) // Refresh every 1 second
      return () => clearInterval(interval)
    }, [] )

  const fetchData = async () => {
    try {
        const [incidentsData, ambulancesData, hospitalData] = await Promise.all([
          get_incidents(),
          get_ambulances(),
          get_hospitals()
        ])
        setIncidents(incidentsData)
        setAmbulances(ambulancesData)
        setHospitals(hospitalData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

  return (
    <div className="app-container">
      <Navbar onToggleSidebar={toggleSidebar} />
      
      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} />
        
        <NewIncidentModal 
            isOpen={newIncidentModalOpen} 
            onClose={() => setNewIncidentModalOpen(false)} 
            onSuccess={() => {
                fetchData();
                setNewIncidentModalOpen(false);
            }}
        />

        {(userRole === 'admin' || userRole === 'operator') && (
            <button 
                className="new-incident-fab" 
                onClick={() => setNewIncidentModalOpen(true)}
            >
                <FaPlus /> New Incident
            </button>
        )}

        <Map sidebarOpen={sidebarOpen}
            incidents={incidents}
            ambulances={ambulances}
            hospitals={hospitals}
            loading={loading}        
        />
      </div>
    </div>
  )
}