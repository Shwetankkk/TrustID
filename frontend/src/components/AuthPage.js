import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AuthPage.css';

const AuthPage = ({ setUserRole, contract, accounts, web3 }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('applicant');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isRegister
      ? 'http://localhost:5001/api/register'
      : 'http://localhost:5001/api/login';

    setLoading(true);

    try {
      if (!accounts || accounts.length === 0) {
        alert('No Ethereum account found. Please connect your wallet.');
        setLoading(false);
        return;
      }

      const payload = {
        username,
        password,
        role,
        address: accounts[0], // ✅ Always include address for all roles
        name: username,        // Optional, in case backend uses it
      };

      const response = await axios.post(endpoint, payload);
      console.log('Response:', response.data);

      // ✅ Blockchain registration only for employer/institution
      if (isRegister && (role === 'employer' || role === 'institution')) {
        try {
          const methodName =
            role === 'employer' ? 'registerEmployer' : 'registerInstitution';

          let receipt;
          if (role === 'institution') {
            receipt = await contract.methods[methodName](
              accounts[0],
              username
            ).send({ from: accounts[0] });
          } else {
            receipt = await contract.methods[methodName](accounts[0]).send({
              from: accounts[0],
            });
          }

          if (receipt.status) {
            alert(`${role} registration successful on blockchain.`);
          } else {
            alert(`${role} blockchain registration failed.`);
          }
        } catch (err) {
          console.error(`Blockchain registration failed for ${role}:`, err.message);
          alert(`${role} registration failed on the blockchain.`);
        }
      }

      if (isRegister) {
        alert('Registration successful! Please log in with your credentials.');
        setIsRegister(false);
        setUsername('');
        setPassword('');
        return;
      }

      // ✅ Login flow
      if (response.data.role) {
        setUserRole(response.data.role);
        navigate(`/${response.data.role}`);
      } else {
        alert('Authentication failed!');
      }
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
      alert(error.response?.data?.message || 'Authentication failed!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1>{isRegister ? 'Register' : 'Login'}</h1>
      <form className="auth-form" onSubmit={handleAuth}>
        <input
          type="text"
          className="username"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          className="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="applicant">Applicant</option>
          <option value="employer">Employer</option>
          <option value="institution">Institution</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : isRegister ? 'Register' : 'Login'}
        </button>
      </form>
      <button
        className="switch-button"
        onClick={() => setIsRegister(!isRegister)}
        disabled={loading}
      >
        Switch to {isRegister ? 'Login' : 'Register'}
      </button>
    </div>
  );
};

export default AuthPage;
