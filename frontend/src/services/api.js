import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Incidents
export const getIncidents = async () => {
  const response = await api.get('/incidents')
  return response.data
}

export const createIncident = async (incident) => {
  const response = await api.post('/create_incident', incident)
  return response.data
}

export const updateIncident = async (incident) => {
  const response = await api.put('/update_incident', incident)
  return response.data
}

export const deleteIncident = async (incidentId) => {
  const response = await api.delete(`/delete_incident?incident_id=${incidentId}`)
  return response.data
}

// Ambulances
export const getAmbulances = async () => {
  const response = await api.get('/ambulances')
  return response.data
}

export const createAmbulance = async (ambulance) => {
  const response = await api.post('/create_ambulance', ambulance)
  return response.data
}

export const updateAmbulance = async (ambulance) => {
  const response = await api.put('/update_ambulance', ambulance)
  return response.data
}

export const deleteAmbulance = async (ambulanceId) => {
  const response = await api.delete(`/delete_ambulance?ambulance_id=${ambulanceId}`)
  return response.data
}

// Dispatch
export const dispatchAmbulance = async (incidentId) => {
  const response = await api.post(`/dispatch/${incidentId}`)
  return response.data
}

export const dispatchAll = async () => {
  const response = await api.post('/dispatch_all')
  return response.data
}

export const getDispatchStatus = async () => {
  const response = await api.get('/dispatch_status')
  return response.data
}

export const convertAddress = async (address) => {
  const response = await api.post('/convert_address', null, {
    params: { address }
  })
  return response.data
}

export default api