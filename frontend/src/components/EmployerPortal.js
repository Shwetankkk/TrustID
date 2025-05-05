"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import {
  FileText,
  CheckCircle,
  Clock,
  LogOut,
  Award,
  User,
  ExternalLink,
  ChevronDown,
  Info,
  ArrowRight,
} from "react-feather"
import "./EmployerPortal.css"

const EmployerPortal = ({ contract, accounts, handleLogout }) => {
  const [resumes, setResumes] = useState([])
  const [isRegistered, setIsRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [registeredInstitutions, setRegisteredInstitutions] = useState([])
  const [selectedInstitutions, setSelectedInstitutions] = useState({})
  const [requestStatus, setRequestStatus] = useState({})
  const [expandedItems, setExpandedItems] = useState({})

  // Toggle resume card expanded state
  const toggleExpanded = (tokenId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [tokenId]: !prev[tokenId],
    }))
  }

  // Check if the employer is registered
  const checkEmployerRegistration = useCallback(async () => {
    try {
      const registered = await contract.methods.employers(accounts[0]).call()
      setIsRegistered(registered)
    } catch (error) {
      console.error("Error checking employer registration:", error.message)
    } finally {
      setLoading(false)
    }
  }, [contract, accounts])

  // Fetch registered institutions from backend
  const fetchRegisteredInstitutions = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:5001/api/institutions")
      if (response.data && response.data.institutions) {
        setRegisteredInstitutions(response.data.institutions)
      }
    } catch (error) {
      console.error("Error fetching institutions:", error.message)
    }
  }, [])

  const fetchResumes = useCallback(async () => {
    try {
      setLoading(true)
      const events = await contract.getPastEvents("NFTMinted", {
        fromBlock: 0,
        toBlock: "latest",
      })

      const resumeList = await Promise.all(
        events.map(async (event) => {
          const tokenId = event.returnValues.tokenId
          const applicantAddress = event.returnValues.applicant
          const resumeData = await contract.methods.getResume(applicantAddress).call()
          const isVerifiedByEmployer = await contract.methods.isVerifiedByEmployer(tokenId).call()

          // Defensive unpacking of institution request
          const request = await contract.methods.getInstitutionRequest(tokenId).call()
          const instName = request[0] || ""
          const requested = request[1] || false

          const isVerifiedByInstitution = await contract.methods.isVerifiedByInstitution(tokenId).call()

          return {
            tokenId,
            applicantName: resumeData[0],
            resumeHash: resumeData[1],
            employerName: resumeData[2],
            institutionRequested: instName,
            requested,
            isVerifiedByEmployer,
            isVerifiedByInstitution,
          }
        }),
      )

      setResumes(resumeList)
    } catch (error) {
      console.error("Error fetching resumes:", error.message)
    } finally {
      setLoading(false)
    }
  }, [contract])

  const requestVerification = async (tokenId) => {
    const institutionName = selectedInstitutions[tokenId]
    if (!institutionName) {
      alert("Please select an institution.")
      return
    }

    try {
      setRequestStatus((prev) => ({
        ...prev,
        [tokenId]: "processing",
      }))

      await contract.methods
        .requestVerificationByInstitution(
          tokenId,
          institutionName,
          "EmployerName" // Replace with actual employer name if dynamic
        )
        .send({ from: accounts[0] })

      setRequestStatus((prev) => ({
        ...prev,
        [tokenId]: "requested",
      }))
      
      // Show success notification
      const notification = document.createElement("div")
      notification.className = "notification success"
      notification.innerHTML = `<CheckCircle size={18} /> Requested verification from ${institutionName}`
      document.body.appendChild(notification)
      
      setTimeout(() => {
        notification.classList.add("hide")
        setTimeout(() => document.body.removeChild(notification), 500)
      }, 3000)
      
      fetchResumes()
    } catch (error) {
      console.error("Error requesting verification:", error.message)
      setRequestStatus((prev) => ({
        ...prev,
        [tokenId]: "error",
      }))
      
      // Show error notification
      const notification = document.createElement("div")
      notification.className = "notification error"
      notification.innerHTML = "Verification request failed"
      document.body.appendChild(notification)
      
      setTimeout(() => {
        notification.classList.add("hide")
        setTimeout(() => document.body.removeChild(notification), 500)
      }, 3000)
    }
  }

  const verifyResume = async (tokenId) => {
    try {
      await contract.methods.verifyByEmployer(tokenId).send({ from: accounts[0] })
      
      // Show success notification
      const notification = document.createElement("div")
      notification.className = "notification success"
      notification.innerHTML = `<CheckCircle size={18} /> Resume with Token ID ${tokenId} verified`
      document.body.appendChild(notification)
      
      setTimeout(() => {
        notification.classList.add("hide")
        setTimeout(() => document.body.removeChild(notification), 500)
      }, 3000)
      
      fetchResumes()
    } catch (error) {
      console.error("Error verifying resume:", error.message)
      
      // Show error notification
      const notification = document.createElement("div")
      notification.className = "notification error"
      notification.innerHTML = "Verification failed"
      document.body.appendChild(notification)
      
      setTimeout(() => {
        notification.classList.add("hide")
        setTimeout(() => document.body.removeChild(notification), 500)
      }, 3000)
    }
  }

  useEffect(() => {
    checkEmployerRegistration()
    fetchRegisteredInstitutions()
    fetchResumes()
  }, [checkEmployerRegistration, fetchRegisteredInstitutions, fetchResumes])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading portal data...</p>
      </div>
    )
  }

  if (!isRegistered) {
    return (
      <div className="not-registered">
        <Info size={48} />
        <h2>Access Restricted</h2>
        <p>You are not a registered employer on this platform.</p>
        <button onClick={handleLogout} className="logout-button">
          <LogOut size={18} />
          <span>Return to Login</span>
        </button>
      </div>
    )
  }

  return (
    <div className="portal-wrapper">
      <div className="employer-portal">
        <header className="portal-header">
          <div className="portal-title">
            <h1>TrustID</h1>
            <span className="portal-subtitle">Employer Portal</span>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </header>

        <div className="portal-content">
          <div className="section-header">
            <div>
              <h2>Candidate Verifications</h2>
              <p>Manage resume verification requests for your company</p>
            </div>
            <div className="stats">
              <div className="stat">
                <div className="stat-value">{resumes.length}</div>
                <div className="stat-label">Total Applications</div>
              </div>
              <div className="stat">
                <div className="stat-value">
                  {resumes.filter((resume) => resume.isVerifiedByEmployer).length}
                </div>
                <div className="stat-label">Verified by You</div>
              </div>
              <div className="stat">
                <div className="stat-value">
                  {resumes.filter((resume) => resume.isVerifiedByInstitution).length}
                </div>
                <div className="stat-label">Verified by Institution</div>
              </div>
            </div>
          </div>

          {resumes.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <h3>No Resumes Found</h3>
              <p>No applications have been submitted to your company yet.</p>
            </div>
          ) : (
            <div className="resume-list">
              {resumes.map((resume) => (
                <div 
                  key={resume.tokenId} 
                  className={`resume-card ${expandedItems[resume.tokenId] ? 'expanded' : ''}`}
                >
                  <div className="resume-header" onClick={() => toggleExpanded(resume.tokenId)}>
                    <div className="resume-icon">
                      <FileText size={24} />
                    </div>
                    <div className="resume-title">
                      <h3>{resume.applicantName}</h3>
                      <div className="resume-meta">
                        <span className="token-id">Token ID: {resume.tokenId}</span>
                        {resume.isVerifiedByEmployer && (
                          <span className="verified-badge employer">
                            <CheckCircle size={14} />
                            <span>Employer Verified</span>
                          </span>
                        )}
                        {resume.isVerifiedByInstitution && (
                          <span className="verified-badge institution">
                            <CheckCircle size={14} />
                            <span>Institution Verified</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown 
                      size={20} 
                      className={`expand-icon ${expandedItems[resume.tokenId] ? 'rotated' : ''}`} 
                    />
                  </div>
                  
                  <div className="resume-details">
                    <div className="detail-section">
                      <h4>Resume Details</h4>
                      <div className="detail-row">
                        <div className="detail-label">Applicant Name</div>
                        <div className="detail-value">{resume.applicantName}</div>
                      </div>
                      <div className="detail-row">
                        <div className="detail-label">Token ID</div>
                        <div className="detail-value">{resume.tokenId}</div>
                      </div>
                      <div className="detail-row">
                        <div className="detail-label">Resume</div>
                        <div className="detail-value">
                          <a 
                            href={`https://gateway.pinata.cloud/ipfs/${resume.resumeHash}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="resume-link"
                          >
                            <span>View Resume</span>
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </div>
                    </div>
                    
                    <div className="verification-section">
                      <div className="employer-verification">
                        <h4>Employer Verification</h4>
                        {resume.isVerifiedByEmployer ? (
                          <div className="verification-status verified">
                            <CheckCircle size={18} />
                            <span>Verified by Employer</span>
                          </div>
                        ) : (
                          <button 
                            className="verify-button"
                            onClick={() => verifyResume(resume.tokenId)}
                          >
                            <CheckCircle size={18} />
                            <span>Verify Resume</span>
                          </button>
                        )}
                      </div>
                      
                      <div className="institution-verification">
                        <h4>Institution Verification</h4>
                        {resume.isVerifiedByInstitution ? (
                          <div className="verification-status verified">
                            <CheckCircle size={18} />
                            <span>Verified by {resume.institutionRequested}</span>
                          </div>
                        ) : resume.requested ? (
                          <div className="verification-status pending">
                            <Clock size={18} />
                            <span>Requested from {resume.institutionRequested}</span>
                          </div>
                        ) : (
                          <div className="request-form">
                            <div className="select-container">
                              <select
                                value={selectedInstitutions[resume.tokenId] || ""}
                                onChange={(e) =>
                                  setSelectedInstitutions((prev) => ({
                                    ...prev,
                                    [resume.tokenId]: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Select Institution</option>
                                {registeredInstitutions.map((institution, idx) => (
                                  <option key={idx} value={institution}>{institution}</option>
                                ))}
                              </select>
                              <ChevronDown size={16} className="select-icon" />
                            </div>
                            <button
                              className="request-button"
                              onClick={() => requestVerification(resume.tokenId)}
                              disabled={!selectedInstitutions[resume.tokenId] || requestStatus[resume.tokenId] === "processing"}
                            >
                              {requestStatus[resume.tokenId] === "processing" ? (
                                <>
                                  <div className="spinner small"></div>
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <Award size={18} />
                                  <span>Request Verification</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmployerPortal

