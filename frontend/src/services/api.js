import axios from 'axios'

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
  const response = await api.delete('/delete_incident', { 
    params: { incident_id: incidentId } 
  })
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
  const response = await api.delete('/delete_ambulance', {
    params: { ambulance_id: ambulanceId }
  })
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
  const response = await api.delete('/delete_hospital', {
    params: { hospital_id: hospitalId }
  }
  )
  return response.data
}

// Emergency Center

export const create_emergency_center = async (center) => {
  const response = await api.post('/create_emergency_center', center)
  return response.data
}

export const get_emergency_centers = async () => {
  const response = await api.get('/emergency_centers')
  return response.data
}

export const update_emergency_center = async (center) => {
  const response = await api.put('/update_emergency_center', center)
  return response.data
}

export const delete_emergency_center = async (centerId) => {
  const response = await api.delete(`/delete_emergency_center`, {
    params: { emergency_center_id: centerId }
  }
  )
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

export const get_route_geometry = async (startLat, startLon, endLat, endLon) => {
  const response = await api.get('/get_route_geometry', {
    params: {
      start_lat: startLat,
      start_lon: startLon,
      end_lat: endLat,
      end_lon: endLon
    }
  });
  return response.data;
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

export const get_users = async () => {
  const response = await api.get('/users')
  return response.data
}

export const delete_user = async (userId) => {
  const response = await api.delete(`/delete_user`, {
    params: { user_id: userId }
  })
  return response.data
}

export const check_login = async (username, password) => {
    const response = await api.post('/login', {
        username: username,
        password: password
    });
    return response.data;
};

// Patients
export const create_patient = async (patient) => {
  const response = await api.post('/create_patient', patient)
  return response.data
}

export const get_patients = async () => {
  const response = await api.get('/patients')
  return response.data
}

export const update_patient = async (patient) => {
  const response = await api.put('/update_patient', patient)
  return response.data
}

export const delete_patient = async (patientId) => {
  const response = await api.delete(`/delete_patient`, {
    params: { patient_id: patientId }
  })
  return response.data
}

export default api