import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './EmployerPortal.css';

const EmployerPortal = ({ contract, accounts, handleLogout }) => {
  const [resumes, setResumes] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredInstitutions, setRegisteredInstitutions] = useState([]);
  const [selectedInstitutions, setSelectedInstitutions] = useState({});
  const [requestStatus, setRequestStatus] = useState({});

  // Check if the employer is registered
  const checkEmployerRegistration = useCallback(async () => {
    try {
      const registered = await contract.methods.employers(accounts[0]).call();
      setIsRegistered(registered);
    } catch (error) {
      console.error('Error checking employer registration:', error.message);
    }
  }, [contract, accounts]);

  // Fetch registered institutions from backend
  const fetchRegisteredInstitutions = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/institutions');
      if (response.data && response.data.institutions) {
        setRegisteredInstitutions(response.data.institutions);
      }
    } catch (error) {
      console.error('Error fetching institutions:', error.message);
    }
  }, []);

  const fetchResumes = useCallback(async () => {
    try {
      const events = await contract.getPastEvents('NFTMinted', {
        fromBlock: 0,
        toBlock: 'latest',
      });

      const resumeList = await Promise.all(events.map(async event => {
        const tokenId = event.returnValues.tokenId;
        const applicantAddress = event.returnValues.applicant;
        const resumeData = await contract.methods.getResume(applicantAddress).call();
        const isVerifiedByEmployer = await contract.methods.isVerifiedByEmployer(tokenId).call();

        // Defensive unpacking of institution request
        const request = await contract.methods.getInstitutionRequest(tokenId).call();
        const instName = request[0] || '';
        const requested = request[1] || false;

        const isVerifiedByInstitution = await contract.methods.isVerifiedByInstitution(tokenId).call();

        return {
          tokenId,
          applicantName: resumeData[0],
          resumeHash: resumeData[1],
          employerName: resumeData[2],
          institutionRequested: instName,
          requested,
          isVerifiedByEmployer,
          isVerifiedByInstitution,
        };
      }));

      setResumes(resumeList);
    } catch (error) {
      console.error('Error fetching resumes:', error.message);
    }
  }, [contract]);

  const requestVerification = async (tokenId) => {
    const institutionName = selectedInstitutions[tokenId];
    if (!institutionName) {
      alert('Please select an institution.');
      return;
    }

    try {
      await contract.methods.requestVerificationByInstitution(
        tokenId,
        institutionName,
        'EmployerName' // Replace with actual employer name if dynamic
      ).send({ from: accounts[0] });

      alert(`Requested verification from ${institutionName}`);
      setRequestStatus(prev => ({
        ...prev,
        [tokenId]: 'requested',
      }));
      fetchResumes();
    } catch (error) {
      console.error('Error requesting verification:', error.message);
      alert('Verification request failed.');
    }
  };

  const verifyResume = async (tokenId) => {
    try {
      await contract.methods.verifyByEmployer(tokenId).send({ from: accounts[0] });
      alert(`Resume with Token ID ${tokenId} verified.`);
      fetchResumes();
    } catch (error) {
      console.error('Error verifying resume:', error.message);
    }
  };

  useEffect(() => {
    checkEmployerRegistration();
    fetchRegisteredInstitutions();
    fetchResumes();
  }, [checkEmployerRegistration, fetchRegisteredInstitutions, fetchResumes]);

  if (!isRegistered) {
    return <div>You are not a registered employer.</div>;
  }

  return (
    <div className="employer-portal">
      <div className="logout-container">
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </div>

      <h2>Employer Portal</h2>
      <h3>Resumes Associated with Your Company</h3>

      <ul>
        {resumes.map(resume => (
          <li key={resume.tokenId}>
            <strong>Token ID:</strong> {resume.tokenId}<br />
            <strong>Applicant:</strong> {resume.applicantName}<br />
            <a href={`https://gateway.pinata.cloud/ipfs/${resume.resumeHash}`} target="_blank" rel="noreferrer">View Resume</a><br />
            <strong>Employer Verified:</strong>{' '}
            {resume.isVerifiedByEmployer ? (
              <span className="status-badge verified">Verified</span>
            ) : (
              <button onClick={() => verifyResume(resume.tokenId)}>Verify</button>
            )}
            <br />

            <h4>Request Institution Verification</h4>
            <select
              value={selectedInstitutions[resume.tokenId] || ''}
              onChange={(e) =>
                setSelectedInstitutions(prev => ({
                  ...prev,
                  [resume.tokenId]: e.target.value,
                }))
              }
            >
              <option value="">Select Institution</option>
              {registeredInstitutions.map((name, idx) => (
                <option key={idx} value={name}>{name}</option>
              ))}
            </select>
            <br />
            {resume.isVerifiedByInstitution ? (
              <span className="status-badge verified">Institution Verified</span>
            ) : resume.requested ? (
              <span className="status-badge pending">Requested</span>
            ) : (
              <button
                className="request-verification-button"
                onClick={() => requestVerification(resume.tokenId)}
              >
                Request Verification
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EmployerPortal;
