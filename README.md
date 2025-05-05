# 🔐 TrustID - Blockchain-Based Digital Identity Verification

TrustID is a decentralized application (DApp) built to revolutionize how digital identities and resumes are verified. It provides a secure, transparent, and decentralized platform for Applicants, Employers, and Institutions to interact and verify credentials without relying on centralized authorities.

---

## 🚀 Features

- ✅ Register as **Applicant**, **Employer**, or **Institution**
- 📄 Applicants can upload resumes securely to **IPFS via Pinata**
- 🧑‍💼 Employers can view resumes and request verification from institutions
- 🏫 Institutions approve verification requests
- 🔗 Verification statuses are updated both **on-chain (Ethereum)** and **off-chain (MongoDB)**
- 🔒 Secured via cryptographic hashing and smart contracts
- 🎛️ Role-based access and Metamask login for all users

---

## 🛠️ Technologies Used

- **Solidity** – Smart contracts
- **Truffle + Ganache** – Ethereum development and local blockchain
- **React** – Frontend framework
- **Node.js + Express** – Backend server
- **MongoDB** – Off-chain data storage
- **Pinata (IPFS)** – Decentralized file storage for resumes
- **Web3.js** – Ethereum interaction
- **Metamask** – Ethereum wallet integration

---

## 🧾 Project Structure

```
DigitalIdentityVerification_DApp/
├── contracts/               # Solidity contracts
├── migrations/              # Truffle deployment scripts
├── frontend/                # React app
├── my-app-backend/          # Node.js backend
├── truffle-config.js        # Truffle config
├── package.json             # Root dependencies
```

---

## ⚙️ How It Works

1. **Applicant** registers and uploads a resume. It's stored on IPFS and linked to a minted NFT on the blockchain.
2. **Employer** browses registered applicants and requests verification from a specific institution.
3. **Institution** logs in and verifies the request.
4. The verification status updates on-chain for transparency and off-chain in MongoDB for efficiency.

---

## 📦 Installation & Setup

### 📋 Prerequisites

- Node.js and npm
- MongoDB (local or cloud)
- Ganache CLI or Ganache GUI
- Metamask browser extension
- Truffle
- Pinata API credentials

---

### 🔧 Environment Setup

1. **Clone the repo**

```bash
git clone https://github.com/Shwetankkk/TrustID.git
cd TrustID
```

2. **Install dependencies**

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../my-app-backend
npm install
```

3. **Add your environment variables**

Create a `.env` file inside `my-app-backend/` and add:

```env
MONGO_URI=mongodb://localhost:27017/trustid
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret
JWT_SECRET=your_jwt_secret
```

---

### 🚀 Running the Application

```bash
# 1. Start Ganache
ganache-cli

# 2. Compile and deploy contracts
truffle migrate --reset

# 3. Run backend server
cd my-app-backend
node server.js

# 4. Start frontend
cd ../frontend
npm start
```

Then open: `http://localhost:3000`

---

## 📸 Screenshots

*You can add screenshots here such as:*
- Applicant Dashboard
- Resume Upload Modal
- Employer Verification Request
- Institution Verification Panel

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 🙋‍♂️ Author

**Shwetank Singh**  
📫 [GitHub Profile](https://github.com/Shwetankkk)
