import { useState, useEffect } from 'react'
import { create_incident, convert_address, dispatch_ambulance } from '../services/api'
import Modal from './Modal'

export default function NewIncidentModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        address: '',
        type: '',
        severity: 1,
        nr_patients: 1
      })
      setLoading(false)
    }
  }, [isOpen])

  const [formData, setFormData] = useState({
    address: '',
    type: '',
    severity: 1,
    nr_patients: 1
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'nr_patients' || name === 'severity') {
      finalValue = value === '' ? '' : parseInt(value, 10);
    }
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
    
      if (!formData.address) {
        alert("Please enter an address");
        setLoading(false);
        return;
      }

      const coords = await convert_address(formData.address);
      if (!coords || !coords.lat || !coords.lon) {
        alert("Could not find coordinates for this address.");
        setLoading(false);
        return;
      }

      const newIncident = {
        severity: parseInt(formData.severity),
        status: "Active",
        type: formData.type || "General Emergency",
        nr_patients: parseInt(formData.nr_patients),
        lat: coords.lat,
        lon: coords.lon
      };

      const created = await create_incident(newIncident);

      try {
        const dispatchResult = await dispatch_ambulance(created.id);
        alert(`Incident #${created.id} Created & Dispatched!\nResult: ${dispatchResult.msg}`);
      } catch (dispatchError) {
        console.error(dispatchError);
        alert(`Incident #${created.id} created, but auto-dispatch failed. Check logs.`);
      }

      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error(error);
      alert("Failed to create incident: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title="Dispatch New Incident"
        actions={
          <>
            <button className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Dispatching...' : 'Create & Dispatch'}
            </button>
          </>
        }
      >
        <form>
          <div className="form-group">
            <label>Incident Location</label>
            <input 
              type="text" 
              name="address" 
              placeholder="e.g. Piata Libertatii 1"
              value={formData.address} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Incident Type</label>
            <input 
              type="text" 
              name="type" 
              placeholder="e.g. Car Accident"
              value={formData.type} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Severity</label>
            <select name="severity" value={formData.severity} onChange={handleInputChange}>
               <option value={1}>1 - Critical (Life Threatening)</option>
               <option value={2}>2 - High (Urgent)</option>
               <option value={3}>3 - Medium</option>
               <option value={4}>4 - Low</option>
            </select>
          </div>

          <div className="form-group">
            <label>Number of Patients</label>
            <input 
              type="number" 
              name="nr_patients" 
              min="1"
              value={formData.nr_patients} 
              onChange={handleInputChange} 
            />
          </div>
        </form>
      </Modal>
  )
}