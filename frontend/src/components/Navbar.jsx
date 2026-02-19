import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dispatch_ambulance, handle_queue_api, get_ambulances, update_ambulance } from '../services/api'
import Modal from './Modal'
import './Navbar.css'

export default function Navbar({ onToggleSidebar }) {
  const navigate = useNavigate()
  const [isRedispatchOpen, setIsRedispatchOpen] = useState(false)
  const [redispatchId, setRedispatchId] = useState('')
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const rawRole = localStorage.getItem('user_role')
  const userRole = rawRole?.toLowerCase() || ''

  const handleRedispatchSubmit = async (e) => {
    e.preventDefault()
    if (!redispatchId) return
    
    setLoading(true)
    try {
      const result = await dispatch_ambulance(redispatchId)
      alert(`Result: ${result.msg}`)
      setIsRedispatchOpen(false)
      setRedispatchId('')
    } catch (error) {
      alert("Dispatch failed: " + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleCleanup = async () => {
    if (!window.confirm("Are you sure you want to force a system-wide cleanup?")) return
    try {
      await handle_queue_api()
      alert("Stale missions reset and queue processed.")
    } catch (error) {
      alert("Cleanup error: " + error.message)
    }
  }

const handleStatusUpdate = async (e) => {
  if (e) e.preventDefault();
  setLoading(true);

  try {
    const ambulancesResponse = await get_ambulances();
    const ambulance = ambulancesResponse.find(amb => amb.driver_id === parseInt(localStorage.getItem('user_id')));

    if (!ambulance) {
      alert("No ambulance found for this driver.");
      return;
    }

    const payload = {
      id: ambulance.id,
      status: newStatus
    };

    const response = await update_ambulance(payload);

    alert("Status updated to: " + response.status);
    setIsStatusOpen(false);
  } catch (error) {
    alert("Status update failed: " + error.message);
    console.log(payload);
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      <nav className="navbar">
        <button className="hamburger-btn" onClick={onToggleSidebar}>
          <span></span><span></span><span></span>
        </button>
        
        <div className="logo">
          <a href="/"><img src="images/logo.png" alt="Logo" /></a>


        <div className="nav-actions">
          {(userRole === 'operator' || userRole === 'admin') && (
            <div className="operator-tools">
              <button className="nav-btn" onClick={() => setIsRedispatchOpen(true)}>
                Redispatch
              </button>
              
              <button className="nav-btn" onClick={() => navigate('/logs')}>
                Logs
              </button>

              {userRole === 'admin' && (
                <button className="nav-btn cleanup-btn" onClick={handleCleanup}>
                  Cleanup Stale
                </button>
              )}
            </div>
          )}
          {userRole === 'driver' && (
            <button className="nav-btn driver-btn" onClick={() => setIsStatusOpen(true)}>
              Ambulance Status
            </button>
          )}
          </div>
        </div>

          <div className="account-logo">
            <a href="/settings"><img src="images/settings1.png" alt="Settings" /></a>
          </div>

      </nav>

      {/* --- REDISPATCH MODAL --- */}
      <Modal 
        isOpen={isRedispatchOpen} 
        onClose={() => setIsRedispatchOpen(false)} 
        title="Manual Redispatch"
        actions={
          <>
            <button className="btn-secondary" onClick={() => setIsRedispatchOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleRedispatchSubmit} disabled={loading}>
              {loading ? "Dispatching..." : "Confirm Dispatch"}
            </button>
          </>
        }
      >
        <form onSubmit={handleRedispatchSubmit}>
          <div className="form-group">
            <label>Enter Incident ID</label>
            <input 
              type="number" 
              placeholder="e.g. 105"
              value={redispatchId}
              onChange={(e) => setRedispatchId(e.target.value)}
              style={{ width: '100%', padding: '10px', marginTop: '10px' }}
              autoFocus
            />
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '10px' }}>
              This will re-run the dispatch algorithm for the specified incident.
            </p>
          </div>
        </form>
      </Modal>

      {/* --- STATUS MODAL --- */}
      <Modal 
        isOpen={isStatusOpen} 
        onClose={() => setIsStatusOpen(false)} 
        title="Update Ambulance Status"
        actions={
          <>
            <button className="btn-secondary" onClick={() => setIsStatusOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleStatusUpdate} disabled={loading}>
              {loading ? "Updating..." : "Update Status"}
            </button>
          </>
        }
      >
        <form onSubmit={handleStatusUpdate}>
          <div className="form-group">
            <label>Enter New Status</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="Available">Available</option>
              <option value="Busy">Busy</option>
              <option value="Unavailable">Unavailable</option>
            </select>
          </div>
        </form>
      </Modal>

    </>
  )
}