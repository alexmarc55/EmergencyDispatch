import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import IncidentsPage from './pages/IncidentsPage.jsx'
import AmbulancesPage from './pages/AmbulancesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import PatientsPage from './pages/PatientsPage.jsx'
import HospitalsPage from './pages/HospitalsPage.jsx'
import EmergencyCentersPage from './pages/EmergencyCentersPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
import LogsPage from './pages/LogsPage.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/ambulances" element={<AmbulancesPage />} />
        <Route path="/login_page" element={<LoginPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/hospitals" element={<HospitalsPage />} />
        <Route path="/emergency-centers" element={<EmergencyCentersPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/logs" element={<LogsPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)