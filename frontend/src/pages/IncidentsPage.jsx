import { useState, useEffect, use } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import SearchBar from "../components/Searchbar";
import Modal from "../components/Modal";
import NewIncidentModal from "../components/NewIncidentModal";
import PatientSelectionModal from "../components/PatientSelectionModal";
import "./IncidentsPage.css";
import "../components/NewIncidentModal.css";
import {
  create_incident,
  get_incidents,
  update_incident,
  delete_incident,
  convert_address,
  get_patients,
  create_patient,
} from "../services/api";
import { FaEdit, FaTrash, FaUserPlus, FaUserCheck } from "react-icons/fa";

export default function IncidentsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [newIncidentModalOpen, setNewIncidentModalOpen] = useState(false);
  const [editPatients, setEditPatients] = useState([]);
  const [patientSelectionOpen, setPatientSelectionOpen] = useState(false);
  const [currentPatientSlot, setCurrentPatientSlot] = useState(null);
  const navigate = useNavigate();

  const rawRole = localStorage.getItem("user_role");
  const userRole = rawRole?.toLowerCase() || "";

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    get_incidents().then((data) => {
      setIncidents(data);
      setFilteredIncidents(data);
    });
    if (userRole == "") {
      navigate("/login_page");
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeModal !== "edit") return;
    const newCount = formData.nr_patients || 1;
    setEditPatients((prev) => {
      if (newCount > prev.length)
        return [...prev, ...Array(newCount - prev.length).fill(null)];
      return prev.slice(0, newCount);
    });
  }, [formData.nr_patients]);

  const handleOpenEditPatientSlot = (index) => {
    setCurrentPatientSlot(index);
    setPatientSelectionOpen(true);
  };

  const handleEditPatientSelected = (patient) => {
    setEditPatients((prev) => {
      const next = [...prev];
      next[currentPatientSlot] = patient;
      return next;
    });
    setPatientSelectionOpen(false);
    setCurrentPatientSlot(null);
  };

  const fetchData = async () => {
    try {
      const incidentsData = await get_incidents();
      setIncidents(incidentsData);
      setFilteredIncidents(incidentsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleSearch = (filtered, query) => {
    setFilteredIncidents(filtered);
  };

  const openEditModal = async (incident) => {
    setSelectedIncident(incident);
    setFormData({ ...incident });
    setActiveModal("edit");

    try {
      const allPatients = await get_patients();
      const slots = Array(incident.nr_patients || 1)
        .fill(null)
        .map((_, i) => {
          const id = incident.patient_ids?.[i];
          return id ? (allPatients.find((p) => p.id === id) ?? null) : null;
        });
      setEditPatients(slots);
    } catch (err) {
      console.error("Failed to load patients for edit:", err);
      setEditPatients(Array(incident.nr_patients || 1).fill(null));
    }
  };

  const openDeleteModal = (incident) => {
    setSelectedIncident(incident);
    setActiveModal("delete");
  };

  const openAddModal = () => {
    setFormData({});
    setActiveModal("add");
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedIncident(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedIncident) return;
    try {
      await delete_incident(selectedIncident.id);

      const updated = incidents.filter((i) => i.id !== selectedIncident.id);
      setIncidents(updated);
      setFilteredIncidents(updated);

      closeModal();
    } catch (error) {
      alert("Failed to delete incident" + error.message);
      console.log(selectedIncident);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        id: formData.id,
        severity: formData.severity,
        status: formData.status,
        type: formData.type,
        nr_patients: formData.nr_patients,
        needs_UPU: formData.needs_UPU || true,
        patient_ids: editPatients.filter((p) => p?.id).map((p) => p.id),
      };
      const updated = await update_incident(payload);

      const newIncidents = incidents.map((i) =>
        i.id === updated.id ? updated : i,
      );
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
    if (name === "nr_patients" || name === "severity") {
      finalValue = value === "" ? "" : parseInt(value, 10);
    }
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
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
        lon: coords.lon,
        needs_UPU: formData.needs_UPU || true,
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
  };
  return (
    <div className="app-container">
      <Navbar onToggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} />
        <div className={`incidents-page ${sidebarOpen ? "sidebar-open" : ""}`}>
          <div className="header">
            <h1>Incidents</h1>
            <SearchBar
              items={incidents}
              onSearch={handleSearch}
              placeholder="Search incidents..."
              searchKeys={["id", "status", "severity", "type"]}
            />
            {(userRole === "admin" || userRole === "operator") && (
              <button
                className="new-incident-button"
                onClick={() => setNewIncidentModalOpen(true)}
              >
                New Incident
              </button>
            )}
          </div>
          <div className="incidents-list">
            {filteredIncidents.map((incident) => (
              <div key={incident.id} className="incidents-card">
                {(userRole === "admin" ||
                  (userRole === "operator" &&
                    incident.status === "Active")) && (
                  <div className="CRUD-buttons">
                    <button onClick={() => openEditModal(incident)}>
                      <FaEdit />
                    </button>
                    <button onClick={() => openDeleteModal(incident)}>
                      <FaTrash />
                    </button>
                  </div>
                )}
                <h2>Incident ID: {incident.id}</h2>
                <p>Status: {incident.status}</p>
                <p>Severity: {incident.severity}</p>
                <p>
                  Location: ({incident.lat}, {incident.lon})
                </p>
                <p>
                  Assigned Unit(s):{" "}
                  {incident.assigned_units && incident.assigned_units.length > 0
                    ? incident.assigned_units.join(", ")
                    : "None"}
                </p>
                <p>Started at: {incident.started_at}</p>
                <p>Ended at: {incident.ended_at}</p>
                <p>Type: {incident.type}</p>
                <p>Number of Patients: {incident.nr_patients}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        isOpen={activeModal === "delete"}
        onClose={closeModal}
        title="Confirm Delete"
        actions={
          <>
            <button className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button className="btn-danger" onClick={handleDeleteConfirm}>
              Delete
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete Incident #{selectedIncident?.id}?</p>
        <p style={{ color: "red", fontSize: "0.9rem" }}>
          This action cannot be undone.
        </p>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={activeModal === "edit"}
        onClose={closeModal}
        title={`Edit Incident #${selectedIncident?.id}`}
        actions={
          <>
            <button className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleEditSubmit}>
              Save Changes
            </button>
          </>
        }
      >
        <form id="edit-form">
          <div className="form-group">
            <label>Severity</label>
            <select
              name="severity"
              value={formData.severity || 1}
              onChange={handleInputChange}
            >
              <option value={1}>1 - Critical</option>
              <option value={2}>2 - Medium</option>
              <option value={3}>3 - Low</option>
            </select>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              name="status"
              value={formData.status || ""}
              onChange={handleInputChange}
            >
              <option value="Active">Active</option>
              <option value="Assigned">Assigned</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <div className="form-group">
            <label>Type</label>
            <input
              type="text"
              name="type"
              value={formData.type || ""}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Number of Patients</label>
            <input
              type="number"
              name="nr_patients"
              value={formData.nr_patients || ""}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Needs Urgent Care? (UPU)</label>
            <select
              name="needs_UPU"
              value={formData.needs_UPU || true}
              onChange={handleInputChange}
            >
              <option value={true}>Yes</option>
              <option value={false}>No</option>
            </select>
          </div>

          {formData.nr_patients > 0 && (
            <div className="form-group">
              <label>Patients</label>
              <div className="patient-slots-container">
                {editPatients.map((patient, index) => (
                  <button
                    key={index}
                    type="button"
                    className="patient-slot-button"
                    onClick={() => handleOpenEditPatientSlot(index)}
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

      {/* --- ADD INCIDENT MODAL --- */}

      <NewIncidentModal
        isOpen={newIncidentModalOpen}
        onClose={() => setNewIncidentModalOpen(false)}
        onSuccess={() => {
          fetchData();
          setNewIncidentModalOpen(false);
        }}
      />

      <PatientSelectionModal
        isOpen={patientSelectionOpen}
        onClose={() => {
          setPatientSelectionOpen(false);
          setCurrentPatientSlot(null);
        }}
        onSelectPatient={handleEditPatientSelected}
        currentPatient={
          currentPatientSlot !== null ? editPatients[currentPatientSlot] : null
        }
      />
    </div>
  );
}
