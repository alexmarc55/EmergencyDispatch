import { useState, useEffect } from "react";
import {
  create_incident,
  convert_address,
  dispatch_ambulance,
  get_patients,
  create_patient,
} from "../services/api";
import Modal from "./Modal";
import PatientSelectionModal from "./PatientSelectionModal";
import "./NewIncidentModal.css";
import { FaUserPlus, FaUserCheck } from "react-icons/fa";

export default function NewIncidentModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    address: "",
    type: "",
    severity: 1,
    nr_patients: 1,
  });
  const [selectedPatients, setSelectedPatients] = useState([null]);
  const [isPatientSelectionModalOpen, setIsPatientSelectionModalOpen] =
    useState(false);
  const [currentPatientSlotIndex, setCurrentPatientSlotIndex] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({ address: "", type: "", severity: 1, nr_patients: 1 });
      setSelectedPatients(Array(1).fill(null));
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const currentLength = selectedPatients.length;
    const newLength = formData.nr_patients;
    if (newLength > currentLength) {
      setSelectedPatients((prev) => [
        ...prev,
        ...Array(newLength - currentLength).fill(null),
      ]);
    } else if (newLength < currentLength) {
      setSelectedPatients((prev) => prev.slice(0, newLength));
    }
  }, [formData.nr_patients, selectedPatients.length]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === "nr_patients" || name === "severity") {
      finalValue = value === "" ? "" : parseInt(value, 10);
    }
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

  const handleOpenPatientSelection = (index) => {
    setCurrentPatientSlotIndex(index);
    setIsPatientSelectionModalOpen(true);
  };

  const handlePatientSelected = (patient) => {
    setSelectedPatients((prev) => {
      const newPatients = [...prev];
      newPatients[currentPatientSlotIndex] = patient;
      return newPatients;
    });
    setIsPatientSelectionModalOpen(false);
    setCurrentPatientSlotIndex(null);
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
      const patientIds = selectedPatients
        .filter((p) => p && p.id)
        .map((p) => p.id);
      const newIncident = {
        severity: parseInt(formData.severity),
        status: "Active",
        type: formData.type || "General Emergency",
        nr_patients: parseInt(formData.nr_patients),
        lat: coords.lat,
        lon: coords.lon,
        patient_ids: patientIds,
      };
      const created = await create_incident(newIncident);
      try {
        const dispatchResult = await dispatch_ambulance(created.id);
        alert(
          `Incident #${created.id} Created & Dispatched!\nResult: ${dispatchResult.msg}`,
        );
      } catch (dispatchError) {
        console.error(dispatchError);
        alert(
          `Incident #${created.id} created, but auto-dispatch failed. Check logs.`,
        );
      }
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      alert("Failed to create incident: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Dispatch New Incident"
        actions={
          <>
            <button
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Dispatching..." : "Create & Dispatch"}
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
            <select
              name="severity"
              value={formData.severity}
              onChange={handleInputChange}
            >
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

          {/* Patient Slots */}
          {formData.nr_patients > 0 && (
            <div className="form-group">
              <label>Patients</label>
              <div className="patient-slots-container">
                {selectedPatients.map((patient, index) => (
                  <button
                    key={index}
                    type="button"
                    className="patient-slot-button"
                    onClick={() => handleOpenPatientSelection(index)}
                    title={patient ? patient.name : "Click to assign a patient"}
                  >
                    {patient ? (
                      <>
                        <FaUserCheck
                          style={{ color: "#28a745", marginRight: 6 }}
                        />
                        {patient.name} (Age: {patient.age})
                      </>
                    ) : (
                      <>
                        <FaUserPlus
                          style={{ color: "#007bff", marginRight: 6 }}
                        />
                        Patient {index + 1} — Click to assign
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Patient Selection Modal — rendered outside the main Modal to avoid nesting issues */}
      <PatientSelectionModal
        isOpen={isPatientSelectionModalOpen}
        onClose={() => {
          setIsPatientSelectionModalOpen(false);
          setCurrentPatientSlotIndex(null);
        }}
        onSelectPatient={handlePatientSelected}
        currentPatient={
          currentPatientSlotIndex !== null
            ? selectedPatients[currentPatientSlotIndex]
            : null
        }
      />
    </>
  );
}
