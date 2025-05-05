"use client"

import { useState, useEffect, useCallback } from "react"
import {
  LogOut,
  FileText,
  CheckCircle,
  Award,
  ExternalLink,
  ChevronDown,
  Info,
  Shield,
  User,
  Briefcase,
} from "react-feather"
import "./InstitutionPortal.css"

const InstitutionPortal = ({ contract, accounts, handleLogout }) => {
  const [isRegistered, setIsRegistered] = useState(false)
  const [institutionName, setInstitutionName] = useState("")
  const [requests, setRequests] = useState([])
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState({})
  const [processingTokens, setProcessingTokens] = useState({})

  // Toggle resume card expanded state
  const toggleExpanded = (tokenId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [tokenId]: !prev[tokenId],
    }))
  }

  // Check if the current account is a registered institution
  const checkInstitutionRegistration = useCallback(async () => {
    try {
      const registered = await contract.methods.institutions(accounts[0]).call()
      setIsRegistered(registered)
    } catch (error) {
      console.error("Error checking institution registration:", error.message)
    }
  }, [contract, accounts])

  // Get institution name from smart contract
  const fetchInstitutionName = useCallback(async () => {
    try {
      const name = await contract.methods.getInstitutionName(accounts[0]).call()
      setInstitutionName(name.toLowerCase())
    } catch (error) {
      console.error("Error fetching institution name:", error.message)
    }
  }, [contract, accounts])

  // Fetch all institution verification requests directed to this institution
  const fetchRequests = useCallback(async () => {
    try {
      const events = await contract.getPastEvents("InstitutionVerificationRequested", {
        fromBlock: 0,
        toBlock: "latest",
      })

      const filtered = events
        .filter((event) => event.returnValues.institutionName.toLowerCase() === institutionName)
        .map((event) => ({
          tokenId: event.returnValues.tokenId,
          employer: event.returnValues.employer,
          employerName: event.returnValues.employerName,
        }))

      setRequests(filtered)
    } catch (error) {
      console.error("Error fetching verification requests:", error.message)
    }
  }, [contract, institutionName])

  // Get resume details for all requested token IDs
  const fetchResumes = useCallback(async () => {
    try {
      setLoading(true)
      const detailedResumes = await Promise.all(
        requests.map(async (req) => {
          const result = await contract.methods.getResume(req.employer).call()

          // Check if this resume is already verified
          const isVerified = await contract.methods.isVerifiedByInstitution(req.tokenId).call()

          return {
            tokenId: req.tokenId,
            applicantName: result[0],
            resumeHash: result[1],
            employerName: result[2],
            isVerified: isVerified,
          }
        }),
      )
      setResumes(detailedResumes)
    } catch (error) {
      console.error("Error fetching resumes:", error.message)
    } finally {
      setLoading(false)
    }
  }, [contract, requests])

  const approveRequest = async (tokenId) => {
    try {
      setProcessingTokens((prev) => ({ ...prev, [tokenId]: true }))

      await contract.methods.verifyByInstitution(tokenId).send({ from: accounts[0] })

      // Show success notification
      const notification = document.createElement("div")
      notification.className = "notification success"
      notification.innerHTML = `<div class="notification-content"><CheckCircle size={18} /> Resume with Token ID ${tokenId} approved</div>`
      document.body.appendChild(notification)

      setTimeout(() => {
        notification.classList.add("hide")
        setTimeout(() => document.body.removeChild(notification), 500)
      }, 3000)

      // Update the local state to reflect the verification
      setResumes((prevResumes) =>
        prevResumes.map((resume) => (resume.tokenId === tokenId ? { ...resume, isVerified: true } : resume)),
      )
    } catch (error) {
      console.error("Error approving resume:", error.message)

      // Show error notification
      const notification = document.createElement("div")
      notification.className = "notification error"
      notification.innerHTML = `<div class="notification-content">Error approving resume</div>`
      document.body.appendChild(notification)

      setTimeout(() => {
        notification.classList.add("hide")
        setTimeout(() => document.body.removeChild(notification), 500)
      }, 3000)
    } finally {
      setProcessingTokens((prev) => ({ ...prev, [tokenId]: false }))
    }
  }

  useEffect(() => {
    const initializePortal = async () => {
      await checkInstitutionRegistration()
      await fetchInstitutionName()
      setLoading(false)
    }

    initializePortal()
  }, [checkInstitutionRegistration, fetchInstitutionName])

  useEffect(() => {
    if (institutionName) fetchRequests()
  }, [institutionName, fetchRequests])

  useEffect(() => {
    if (requests.length > 0) fetchResumes()
  }, [requests, fetchRequests, fetchResumes])

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
        <p>You are not a registered institution on this platform.</p>
        <button onClick={handleLogout} className="logout-button">
          <LogOut size={18} />
          <span>Return to Login</span>
        </button>
      </div>
    )
  }

  return (
    <div className="portal-wrapper">
      <div className="institution-portal">
        <header className="portal-header">
          <div className="portal-title">
            <h1>TrustID</h1>
            <span className="portal-subtitle">Institution Portal</span>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </header>

        <div className="portal-content">
          <div className="section-header">
            <div>
              <h2>Verification Requests</h2>
              <p>Review and approve credential verification requests</p>
            </div>
            <div className="stats">
              <div className="stat">
                <div className="stat-value">{resumes.length}</div>
                <div className="stat-label">Total Requests</div>
              </div>
              <div className="stat">
                <div className="stat-value">{resumes.filter((resume) => resume.isVerified).length}</div>
                <div className="stat-label">Approved</div>
              </div>
              <div className="stat">
                <div className="stat-value">{resumes.filter((resume) => !resume.isVerified).length}</div>
                <div className="stat-label">Pending</div>
              </div>
            </div>
          </div>

          {resumes.length === 0 ? (
            <div className="empty-state">
              <Award size={48} />
              <h3>No Verification Requests</h3>
              <p>You don't have any pending verification requests at this time.</p>
            </div>
          ) : (
            <div className="resume-list">
              {resumes.map((resume) => (
                <div key={resume.tokenId} className={`resume-card ${expandedItems[resume.tokenId] ? "expanded" : ""}`}>
                  <div className="resume-header" onClick={() => toggleExpanded(resume.tokenId)}>
                    <div className="resume-icon">
                      <FileText size={24} />
                    </div>
                    <div className="resume-title">
                      <h3>{resume.applicantName}</h3>
                      <div className="resume-meta">
                        <span className="token-id">Token ID: {resume.tokenId}</span>
                        <span className="employer-name">
                          <Briefcase size={14} />
                          <span>{resume.employerName}</span>
                        </span>
                        {resume.isVerified && (
                          <span className="verified-badge">
                            <CheckCircle size={14} />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`expand-icon ${expandedItems[resume.tokenId] ? "rotated" : ""}`}
                    />
                  </div>

                  <div className="resume-details">
                    <div className="detail-section">
                      <h4>Applicant Information</h4>
                      <div className="detail-row">
                        <div className="detail-label">
                          <User size={16} />
                          <span>Name</span>
                        </div>
                        <div className="detail-value">{resume.applicantName}</div>
                      </div>
                      <div className="detail-row">
                        <div className="detail-label">
                          <Shield size={16} />
                          <span>Token ID</span>
                        </div>
                        <div className="detail-value">{resume.tokenId}</div>
                      </div>
                      <div className="detail-row">
                        <div className="detail-label">
                          <Briefcase size={16} />
                          <span>Employer</span>
                        </div>
                        <div className="detail-value">{resume.employerName}</div>
                      </div>
                      <div className="detail-row">
                        <div className="detail-label">
                          <FileText size={16} />
                          <span>Resume</span>
                        </div>
                        <div className="detail-value">
                          <a
                            href={`https://gateway.pinata.cloud/ipfs/${resume.resumeHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="resume-link"
                          >
                            <span>View Resume</span>
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="verification-section">
                      <h4>Verification Status</h4>
                      {resume.isVerified ? (
                        <div className="verification-status verified">
                          <CheckCircle size={18} />
                          <span>Verified by {institutionName}</span>
                        </div>
                      ) : (
                        <div className="verification-actions">
                          <p className="verification-note">
                            <Info size={16} />
                            <span>Please review the resume before approving the verification request.</span>
                          </p>
                          <button
                            className="approve-button"
                            onClick={() => approveRequest(resume.tokenId)}
                            disabled={processingTokens[resume.tokenId]}
                          >
                            {processingTokens[resume.tokenId] ? (
                              <>
                                <div className="spinner small"></div>
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle size={18} />
                                <span>Approve Verification</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
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

export default InstitutionPortal
