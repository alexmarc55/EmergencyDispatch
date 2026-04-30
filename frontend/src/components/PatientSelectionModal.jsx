import { useState, useEffect } from "react";
import Modal from "./Modal";
import SearchBar from "./Searchbar";
import { get_patients, create_patient } from "../services/api";
import { FaPlus, FaUserCheck } from "react-icons/fa";
import "./PatientSelectionModal.css";

export default function PatientSelectionModal({
  isOpen,
  onClose,
  onSelectPatient,
  currentPatient,
}) {
  const [loading, setLoading] = useState(false);
  const [allPatients, setAllPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [activeTab, setActiveTab] = useState("selectExisting");
  const [newPatientFormData, setNewPatientFormData] = useState({
    name: "",
    age: "",
    phone_number: "",
    medical_history: "",
  });

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      get_patients()
        .then((data) => {
          setAllPatients(data);
          setFilteredPatients(data);
        })
        .catch((error) => console.error("Error fetching patients:", error))
        .finally(() => setLoading(false));

      setNewPatientFormData({
        name: "",
        age: "",
        phone_number: "",
        medical_history: "",
      });
      setActiveTab("selectExisting");
    }
  }, [isOpen]);

  const handleNewPatientInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === "age") {
      finalValue = value === "" ? "" : parseInt(value, 10);
    }
    setNewPatientFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

  const handleCreateNewPatient = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!newPatientFormData.name) {
        alert("Please enter a patient name");
        return;
      }

      const historyList = newPatientFormData.medical_history
        ? newPatientFormData.medical_history
            .split(",")
            .map((item) => item.trim())
        : [];

      const newPatient = {
        name: newPatientFormData.name,
        age: parseInt(newPatientFormData.age) || 0,
        phone_number: newPatientFormData.phone_number || "",
        medical_history: historyList,
      };

      const createdPatient = await create_patient(newPatient);
      onSelectPatient(createdPatient);
      onClose();
    } catch (error) {
      console.error("Failed to create patient:", error);
      alert("Failed to create patient: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExistingPatient = (patient) => {
    onSelectPatient(patient);
    onClose();
  };

  const handleSearch = (filtered, query) => {
    setFilteredPatients(filtered);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select or Add Patient"
      actions={
        <>
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          {activeTab === "addNew" && (
            <button
              className="btn-primary"
              onClick={handleCreateNewPatient}
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Patient"}
            </button>
          )}
        </>
      }
    >
      <div className="patient-selection-tabs">
        <button
          className={`tab-button ${activeTab === "selectExisting" ? "active" : ""}`}
          onClick={() => setActiveTab("selectExisting")}
        >
          <FaUserCheck /> Select Existing
        </button>
        <button
          className={`tab-button ${activeTab === "addNew" ? "active" : ""}`}
          onClick={() => setActiveTab("addNew")}
        >
          <FaPlus /> Add New
        </button>
      </div>

      {activeTab === "selectExisting" && (
        <div className="tab-content">
          <SearchBar
            items={allPatients}
            onSearch={handleSearch}
            placeholder="Search patients by name or phone..."
            searchKeys={["name", "phone_number"]}
          />
          {loading ? (
            <p>Loading patients...</p>
          ) : filteredPatients.length === 0 ? (
            <p>No patients found. Try adding a new one.</p>
          ) : (
            <div className="patient-list-scroll">
              {filteredPatients.map((patient) => (
                <div key={patient.id} className="patient-list-item">
                  <span>
                    {patient.name} (Age: {patient.age}, Phone:{" "}
                    {patient.phone_number})
                  </span>
                  <button
                    className="btn-primary btn-small"
                    onClick={() => handleSelectExistingPatient(patient)}
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "addNew" && (
        <div className="tab-content">
          <form onSubmit={handleCreateNewPatient}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                placeholder="e.g. Ion Popescu"
                value={newPatientFormData.name}
                onChange={handleNewPatientInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                name="age"
                value={newPatientFormData.age}
                onChange={handleNewPatientInputChange}
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                name="phone_number"
                placeholder="e.g. 0740..."
                value={newPatientFormData.phone_number}
                onChange={handleNewPatientInputChange}
              />
            </div>

            <div className="form-group">
              <label>Medical History (Comma separated)</label>
              <textarea
                name="medical_history"
                rows="3"
                placeholder="e.g. Diabetes, Asthma"
                value={newPatientFormData.medical_history}
                onChange={handleNewPatientInputChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              />
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}
