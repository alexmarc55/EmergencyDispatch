import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'
import { check_login } from '../services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [loginData, setLoginData] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setLoginData(prev => ({ ...prev, [name]: value }))
    setError('') // Clear error when user types
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await check_login(loginData.username, loginData.password)
        if (response.msg === 'Login successful') {
            navigate('/')
        } else {
            setError('Invalid username or password.')
        }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="main-content">
      <div className="container">
        <img src="images/logo.png" alt="Emergency Dispatch System Logo" className="logo" />
        <h2>Log In</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="login-form">
          <label htmlFor="username">Username:</label>
          <input 
            type="text" 
            id="username" 
            name="username" 
            value={loginData.username}
            onChange={handleChange}
            required 
            disabled={loading}
          />
          
          <label htmlFor="password">Password:</label>
          <input 
            type="password" 
            id="password" 
            name="password" 
            value={loginData.password}
            onChange={handleChange}
            required 
            disabled={loading}
          />
          
          <button type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  )
}