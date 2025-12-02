import axios from 'axios'
import { useResolvedPath } from 'react-router-dom'

const API_BASE_URL = 'http://localhost:8000'


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Incidents
export const get_incidents = async () => {
  const response = await api.get('/incidents')
  return response.data
}

export const create_incident = async (incident) => {
  const response = await api.post('/create_incident', incident)
  return response.data
}

export const update_incident = async (incident) => {
  const response = await api.put('/update_incident', incident)
  return response.data
}

export const delete_incident = async (incidentId) => {
  const response = await api.delete(`/delete_incident?incident_id=${incidentId}`)
  return response.data
}

// Ambulances
export const get_ambulances = async () => {
  const response = await api.get('/ambulances')
  return response.data
}

export const create_ambulance = async (ambulance) => {
  const response = await api.post('/create_ambulance', ambulance)
  return response.data
}

export const update_ambulance = async (ambulance) => {
  const response = await api.put('/update_ambulance', ambulance)
  return response.data
}

export const delete_ambulance = async (ambulanceId) => {
  const response = await api.delete(`/delete_ambulance?ambulance_id=${ambulanceId}`)
  return response.data
}

// Hospitals
export const get_hospitals = async () => {
  const response = await api.get('/hospitals')
  return response.data
}

export const create_hospital = async (hospital) => {
  const response = await api.post('/create_hospital', hospital)
  return response.data
}

export const update_hospital = async (hospital) => {
  const response = await api.put('/update_hospital', hospital)
  return response.data
}

export const delete_hospital = async (hospitalId) => {
  const response = await api.delete(`/delete_hospital?hospital_id=${hospitalId}`)
  return response.data
}

// Emergency Center
export const get_emergency_centers = async () => {
  const response = await api.get('/emergency_center')
  return response.data
}

export const update_emergency_center = async (center) => {
  const response = await api.put('/update_emergency_center', center)
  return response.data
}

export const delete_emergency_center = async (centerId) => {
  const response = await api.delete(`/delete_emergency_center?center_id=${centerId}`)
  return response.data
}


// Dispatch
export const dispatch_ambulance = async (incidentId) => {
  const response = await api.post(`/dispatch/${incidentId}`)
  return response.data
}

export const dispatch_all = async () => {
  const response = await api.post('/dispatch_all')
  return response.data
}

export const get_dispatch_status = async () => {
  const response = await api.get('/dispatch_status')
  return response.data
}

export const convert_address = async (address) => {
  const response = await api.post('/convert_address', null, {
    params: { address }
  })
  return response.data
}

export const get_route = async (ambulance_id, incident_id) => {
  const response = await api.get(`/get_route/${ambulance_id}/${incident_id}`)
  if(!response.ok)
    throw new Error('Failed to fetch route')
  return await response.json()
}

// Users 
export const create_user = async (user) => {
  const response = await api.post('/create_user', user)
  return response.data
}

export const update_user = async (user) => {
  const response = await api.put('/update_user', user)
  return response.data
}

export const list_users = async () => {
  const response = await api.get('/list_users')
  return response.data
}

export const delete_user = async (userId) => {
  const response = await api.delete(`/delete_user?user_id=${userId}`)
  return response.data
}

export const check_login = async (username, password) => {
    const response = await api.post('/login', {
        username: username,
        password: password
    });
    return response.data;
};

export default api