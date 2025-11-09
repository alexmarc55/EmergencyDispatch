import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Map from './Map'
import './App.css'
import { get_incidents, get_ambulances, get_hospitals } from './services/api'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [incidents, setIncidents] = useState([])
  const [ambulances, setAmbulances] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Fetch data from backend
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