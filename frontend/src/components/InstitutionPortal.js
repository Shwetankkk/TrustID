import React, { useState, useEffect, useCallback } from 'react';
import './InstitutionPortal.css';

const InstitutionPortal = ({ contract, accounts, handleLogout }) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [institutionName, setInstitutionName] = useState('');
  const [requests, setRequests] = useState([]);
  const [resumes, setResumes] = useState([]);

  // Check if the current account is a registered institution
  const checkInstitutionRegistration = useCallback(async () => {
    try {
      const registered = await contract.methods.institutions(accounts[0]).call();
      setIsRegistered(registered);
    } catch (error) {
      console.error('Error checking institution registration:', error.message);
    }
  }, [contract, accounts]);

  // Get institution name from smart contract
  const fetchInstitutionName = useCallback(async () => {
    try {
      const name = await contract.methods.getInstitutionName(accounts[0]).call();
      setInstitutionName(name.toLowerCase());
    } catch (error) {
      console.error('Error fetching institution name:', error.message);
    }
  }, [contract, accounts]);

  // Fetch all institution verification requests directed to this institution
  const fetchRequests = useCallback(async () => {
    try {
      const events = await contract.getPastEvents('InstitutionVerificationRequested', {
        fromBlock: 0,
        toBlock: 'latest',
      });

      const filtered = events
        .filter(event => event.returnValues.institutionName.toLowerCase() === institutionName)
        .map(event => ({
          tokenId: event.returnValues.tokenId,
          employer: event.returnValues.employer,
          employerName: event.returnValues.employerName,
        }));

      setRequests(filtered);
    } catch (error) {
      console.error('Error fetching verification requests:', error.message);
    }
  }, [contract, institutionName]);

  // Get resume details for all requested token IDs
  const fetchResumes = useCallback(async () => {
    try {
      const detailedResumes = await Promise.all(
        requests.map(async req => {
          const result = await contract.methods.getResume(req.employer).call();
          return {
            tokenId: req.tokenId,
            applicantName: result[0],
            resumeHash: result[1],
            employerName: result[2],
          };
        })
      );
      setResumes(detailedResumes);
    } catch (error) {
      console.error('Error fetching resumes:', error.message);
    }
  }, [contract, requests]);

  const approveRequest = async (tokenId) => {
    try {
      await contract.methods.verifyByInstitution(tokenId).send({ from: accounts[0] });
      alert(`Resume with Token ID ${tokenId} approved.`);
      fetchRequests();
    } catch (error) {
      console.error('Error approving resume:', error.message);
    }
  };

  useEffect(() => {
    checkInstitutionRegistration();
    fetchInstitutionName();
  }, [checkInstitutionRegistration, fetchInstitutionName]);

  useEffect(() => {
    if (institutionName) fetchRequests();
  }, [institutionName, fetchRequests]);

  useEffect(() => {
    if (requests.length > 0) fetchResumes();
  }, [requests, fetchResumes]);

  if (!isRegistered) {
    return <div>You are not a registered institution. Please contact admin.</div>;
  }

  return (
    <div className="institution-portal">
      <div className="logout-container">
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </div>

      <h2>Institution Portal</h2>
      <h3>Verification Requests</h3>
      <ul>
        {resumes.map(resume => (
          <li key={resume.tokenId}>
            <strong>Token ID:</strong> {resume.tokenId}<br />
            <strong>Applicant:</strong> {resume.applicantName}<br />
            <a href={`https://gateway.pinata.cloud/ipfs/${resume.resumeHash}`} target="_blank" rel="noopener noreferrer">
              View Resume
            </a><br />
            <strong>Employer:</strong> {resume.employerName}<br />
            <button onClick={() => approveRequest(resume.tokenId)}>Approve</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InstitutionPortal;
