"use client"

import { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import "./AuthPage.css"
import { Lock, User, ChevronDown, Loader } from "react-feather"

const AuthPage = ({ setUserRole, contract, accounts, web3 }) => {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("applicant")
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleAuth = async (e) => {
    e.preventDefault()
    const endpoint = isRegister ? "http://localhost:5001/api/register" : "http://localhost:5001/api/login"

    setLoading(true)

    try {
      if (!accounts || accounts.length === 0) {
        alert("No Ethereum account found. Please connect your wallet.")
        setLoading(false)
        return
      }

      const payload = {
        username,
        password,
        role,
        address: accounts[0],
        name: username,
      }

      const response = await axios.post(endpoint, payload)
      console.log("Response:", response.data)

      // Blockchain registration only for employer/institution
      if (isRegister && (role === "employer" || role === "institution")) {
        try {
          const methodName = role === "employer" ? "registerEmployer" : "registerInstitution"

          let receipt
          if (role === "institution") {
            receipt = await contract.methods[methodName](accounts[0], username).send({ from: accounts[0] })
          } else {
            receipt = await contract.methods[methodName](accounts[0]).send({
              from: accounts[0],
            })
          }

          if (receipt.status) {
            alert(`${role} registration successful on blockchain.`)
          } else {
            alert(`${role} blockchain registration failed.`)
          }
        } catch (err) {
          console.error(`Blockchain registration failed for ${role}:`, err.message)
          alert(`${role} registration failed on the blockchain.`)
        }
      }

      if (isRegister) {
        alert("Registration successful! Please log in with your credentials.")
        setIsRegister(false)
        setUsername("")
        setPassword("")
        return
      }

      // Login flow
      if (response.data.role) {
        setUserRole(response.data.role)
        navigate(`/${response.data.role}`)
      } else {
        alert("Authentication failed!")
      }
    } catch (error) {
      console.error("Error:", error.response?.data || error.message)
      alert(error.response?.data?.message || "Authentication failed!")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="branding">
        <h1 className="brand-title">TrustID</h1>
        <p className="brand-tagline">
          Blocks chained by
          <br />
          Shwetank, Uday, Suyash and Tanmay!
        </p>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <h1>{isRegister ? "Create Account" : "Welcome Back"}</h1>
          <p>{isRegister ? "Register to get started" : "Sign in to continue"}</p>
        </div>

        <form className="auth-form" onSubmit={handleAuth}>
          <div className="form-group">
            <label htmlFor="username">  Username</label>
            <div className="input-container">
              {/* <User size={18} className="input-icon" /> */}
              <input
                
                type="text"
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-container">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">Account Type</label>
            <div className="select-container">
              <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="applicant">Applicant</option>
                <option value="employer">Employer</option>
                <option value="institution">Institution</option>
                <option value="admin">Admin</option>
              </select>
              <ChevronDown size={18} className="select-icon" />
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <>
                <Loader size={18} className="spinner" />
                <span>Processing...</span>
              </>
            ) : isRegister ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>{isRegister ? "Already have an account?" : "Don't have an account?"}</p>
          <button className="switch-mode-button" onClick={() => setIsRegister(!isRegister)} disabled={loading}>
            {isRegister ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
