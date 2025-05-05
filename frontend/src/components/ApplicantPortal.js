"use client"

import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import {
  Briefcase,
  Award,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Upload,
  User,
  LogOut,
  ChevronRight,
  Shield,
} from "react-feather"
import "./ApplicantPortal.css"

const ApplicantPortal = ({ contract, accounts, web3, handleLogout }) => {
  const [applicantName, setApplicantName] = useState("")
  const [resumeHash, setResumeHash] = useState("")
  const [uploading, setUploading] = useState(false)
  const [nfts, setNFTs] = useState([])
  const [verificationStatuses, setVerificationStatuses] = useState([])
  const [employers, setEmployers] = useState([])
  const [selectedEmployer, setSelectedEmployer] = useState("")
  const [activeTab, setActiveTab] = useState("employers")

  const PINATA_API_KEY = "6ead6cca462a961c7273"
  const PINATA_SECRET_API_KEY = "744cf8fe8bdeaef78027a3b96bb4d5876199a5520f4430280280c3dfae3b4c5b"

  const fetchRegisteredEmployers = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:5001/api/employers")
      if (response.status === 200) {
        setEmployers(response.data.employers)
        console.log("Registered Employers:", response.data.employers)
      } else {
        console.error("Failed to fetch employers:", response.statusText)
      }
    } catch (error) {
      console.error("Error fetching employers:", error.message)
    }
  }, [])

  const uploadToPinata = async (file) => {
    const formData = new FormData()
    formData.append("file", file)

    const metadata = JSON.stringify({ name: file.name })
    formData.append("pinataMetadata", metadata)

    try {
      setUploading(true)
      console.log("Starting Pinata upload...")
      const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      })
      console.log("Pinata Response:", response.data)
      setUploading(false)
      return response.data.IpfsHash
    } catch (error) {
      setUploading(false)
      console.error("Pinata Error:", error.response?.data || error.message)
      throw new Error("Failed to upload file to IPFS")
    }
  }

  const fetchVerificationStatus = useCallback(
    async (mintedNFTs) => {
      try {
        const statuses = await Promise.all(
          mintedNFTs.map(async (nft) => {
            const employerVerified = await contract.methods.isVerifiedByEmployer(nft.tokenId).call()

            const institutionRequest = await contract.methods.getInstitutionRequest(nft.tokenId).call()

            const institutionVerified = await contract.methods.isVerifiedByInstitution(nft.tokenId).call()

            const institutionName = institutionRequest[0]
            const institutionRequested = institutionRequest[1]

            return {
              tokenId: nft.tokenId,
              employerName: nft.employerName,
              employerVerified,
              institutionVerified,
              institutionName: institutionName || "N/A",
              institutionStatus: institutionVerified
                ? "Approved"
                : institutionRequested
                  ? "Requested"
                  : "Not Requested",
            }
          }),
        )

        setVerificationStatuses(statuses)
        console.log("User-specific verification statuses:", statuses)
      } catch (error) {
        console.error("Error fetching verification statuses:", error.message)
      }
    },
    [contract],
  )

  const fetchNFTs = useCallback(async () => {
    if (!contract || accounts.length === 0) {
      console.warn("Contract or accounts not initialized.")
      return
    }

    try {
      console.log("Fetching NFTMinted events...")
      const pastEvents = await contract.getPastEvents("NFTMinted", {
        fromBlock: 0,
        toBlock: "latest",
      })

      const mintedNFTs = pastEvents
        .filter((event) => event.returnValues.applicant.toLowerCase() === accounts[0].toLowerCase())
        .map((event) => ({
          tokenId: Number.parseInt(event.returnValues.tokenId, 10),
          employerName: event.returnValues.employerName,
        }))

      console.log("Filtered NFTs for current user:", mintedNFTs)
      setNFTs(mintedNFTs)

      fetchVerificationStatus(mintedNFTs)
    } catch (error) {
      console.error("Error fetching NFTs:", error.message)
    }
  }, [contract, accounts, fetchVerificationStatus])

  useEffect(() => {
    if (contract && accounts.length > 0) {
      fetchNFTs()
      fetchRegisteredEmployers()
    }
  }, [contract, accounts, fetchNFTs, fetchRegisteredEmployers])

  const uploadResume = async (e) => {
    e.preventDefault()
    console.log("uploadResume triggered")

    if (!resumeHash || !applicantName || !selectedEmployer) {
      alert("Please provide a resume, applicant name, and select an employer.")
      return
    }

    console.log("Parameters:", { applicantName, resumeHash, selectedEmployer })

    try {
      const txReceipt = await contract.methods
        .uploadResume(applicantName, resumeHash, selectedEmployer)
        .send({ from: accounts[0] })

      console.log("Transaction Receipt:", txReceipt)

      const nftMintedEvent = txReceipt.events.NFTMinted
      if (nftMintedEvent) {
        const { tokenId, applicant } = nftMintedEvent.returnValues
        console.log("NFT Minted Event:", { tokenId, applicant })

        if (applicant.toLowerCase() === accounts[0].toLowerCase()) {
          const newNFT = {
            tokenId: Number.parseInt(tokenId, 10),
            employerName: selectedEmployer,
          }
          setNFTs((prevNFTs) => [...prevNFTs, newNFT])
          alert(`NFT Minted with Token ID: ${tokenId}`)
        } else {
          console.warn("NFT minted for a different account:", applicant)
        }
        setSelectedEmployer("")
      } else {
        console.error("No NFTMinted event found in transaction receipt.")
      }
    } catch (error) {
      console.error("Blockchain Error:", error.message)
      alert("Failed to upload resume to the blockchain.")
    }
  }

  return (
    <div className="portal-wrapper">
      <div className="portal-container">
        <header className="portal-header">
          <div className="portal-title">
            <h1>TrustID</h1>
            <span className="portal-subtitle">Applicant Portal</span>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </header>

        <div className="portal-tabs">
          <button
            className={`tab-button ${activeTab === "employers" ? "active" : ""}`}
            onClick={() => setActiveTab("employers")}
          >
            <Briefcase size={18} />
            <span>Employers</span>
          </button>
          <button className={`tab-button ${activeTab === "nfts" ? "active" : ""}`} onClick={() => setActiveTab("nfts")}>
            <Shield size={18} />
            <span>Your NFTs</span>
          </button>
          <button
            className={`tab-button ${activeTab === "verification" ? "active" : ""}`}
            onClick={() => setActiveTab("verification")}
          >
            <Award size={18} />
            <span>Verification</span>
          </button>
        </div>

        <div className="portal-content">
          {activeTab === "employers" && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Registered Employers</h2>
                <p>Apply to employers or check your application status</p>
              </div>

              <div className="employer-grid">
                {employers.map((employer, index) => {
                  const isApplied = nfts.some(
                    (nft) => nft.employerName.toLowerCase() === employer.username.toLowerCase(),
                  )

                  const employerStatus = verificationStatuses.find(
                    (v) => v.employerName.toLowerCase() === employer.username.toLowerCase(),
                  )

                  return (
                    <div key={index} className="employer-card">
                      <div className="employer-icon">
                        <Briefcase size={24} />
                      </div>
                      <div className="employer-info">
                        <h3>{employer.username}</h3>
                        {employerStatus?.employerVerified && employerStatus?.institutionVerified ? (
                          <div className="status-badge verified">
                            <CheckCircle size={16} />
                            <span>Verified by employer & institution</span>
                          </div>
                        ) : isApplied ? (
                          <div className="status-badge pending">
                            <AlertTriangle size={16} />
                            <span>Awaiting verification</span>
                          </div>
                        ) : (
                          <button className="apply-button" onClick={() => setSelectedEmployer(employer.username)}>
                            Apply Now
                            <ChevronRight size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {selectedEmployer && (
                <div className="application-form">
                  <div className="form-header">
                    <h3>Apply to {selectedEmployer}</h3>
                    <button className="close-button" onClick={() => setSelectedEmployer("")}>
                      ×
                    </button>
                  </div>
                  <form onSubmit={uploadResume}>
                    <div className="form-group">
                      <label>
                        <User size={16} />
                        <span>Full Name</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your full name"
                        value={applicantName}
                        onChange={(e) => setApplicantName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        <FileText size={16} />
                        <span>Resume</span>
                      </label>
                      <div className="file-input-wrapper">
                        <input
                          type="file"
                          id="resume-upload"
                          onChange={async (e) => {
                            const file = e.target.files[0]
                            if (file) {
                              try {
                                const hash = await uploadToPinata(file)
                                setResumeHash(hash)
                              } catch (error) {
                                console.error("Error uploading file:", error.message)
                              }
                            }
                          }}
                          required
                        />
                        <label htmlFor="resume-upload" className="file-input-label">
                          <Upload size={16} />
                          <span>{resumeHash ? "File Selected" : "Choose File"}</span>
                        </label>
                      </div>
                    </div>
                    <button type="submit" className="submit-button" disabled={!resumeHash || uploading}>
                      {uploading ? (
                        <>
                          <div className="spinner"></div>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          <span>Submit Application</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === "nfts" && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Your NFT Credentials</h2>
                <p>View your credential tokens</p>
              </div>

              {nfts.length > 0 ? (
                <div className="nft-list">
                  {nfts.map((nft, index) => (
                    <div key={index} className="nft-card">
                      <div className="nft-icon">
                        <Shield size={24} />
                      </div>
                      <div className="nft-info">
                        <h3>Token ID: {nft.tokenId}</h3>
                        <p>Employer: {nft.employerName}</p>

                        {verificationStatuses.find((status) => status.tokenId === nft.tokenId)?.employerVerified && (
                          <div className="nft-badge">
                            <CheckCircle size={14} />
                            <span>Employer Verified</span>
                          </div>
                        )}

                        {verificationStatuses.find((status) => status.tokenId === nft.tokenId)?.institutionVerified && (
                          <div className="nft-badge">
                            <CheckCircle size={14} />
                            <span>Institution Verified</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Shield size={48} />
                  <h3>No NFTs Found</h3>
                  <p>Apply to employers to receive credential NFTs</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "verification" && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Verification Status</h2>
                <p>Track the verification status of your credentials</p>
              </div>

              {verificationStatuses.length > 0 ? (
                <div className="verification-table">
                  <div className="table-header">
                    <div className="table-cell">NFT ID</div>
                    <div className="table-cell">Employer</div>
                    <div className="table-cell">Employer Status</div>
                    <div className="table-cell">Institution</div>
                    <div className="table-cell">Institution Status</div>
                  </div>

                  {verificationStatuses.map((status, index) => (
                    <div key={index} className="table-row">
                      <div className="table-cell">{status.tokenId}</div>
                      <div className="table-cell">{status.employerName}</div>
                      <div className="table-cell">
                        {status.employerVerified ? (
                          <div className="status-pill verified">
                            <CheckCircle size={14} />
                            <span>Verified</span>
                          </div>
                        ) : (
                          <div className="status-pill pending">
                            <XCircle size={14} />
                            <span>Pending</span>
                          </div>
                        )}
                      </div>
                      <div className="table-cell">{status.institutionName}</div>
                      <div className="table-cell">
                        {status.institutionStatus === "Approved" ? (
                          <div className="status-pill verified">
                            <CheckCircle size={14} />
                            <span>Approved</span>
                          </div>
                        ) : status.institutionStatus === "Requested" ? (
                          <div className="status-pill pending">
                            <AlertTriangle size={14} />
                            <span>Requested</span>
                          </div>
                        ) : (
                          <div className="status-pill not-started">
                            <XCircle size={14} />
                            <span>Not Requested</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Award size={48} />
                  <h3>No Verifications Yet</h3>
                  <p>Apply to employers to start the verification process</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ApplicantPortal
