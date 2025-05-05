// SPDX-License-Identifier: MIT
pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Token.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract TrustID is ERC721Token, Ownable {
    struct Resume {
        string applicantName;
        string resumeHash;
        string employerName;
    }

    struct InstitutionRequest {
        uint256 tokenId;
        string institutionName;
        bool requested;
    }

    mapping(address => Resume) public resumes;
    mapping(address => bool) public employers;
    mapping(address => bool) public institutions;
    mapping(uint256 => InstitutionRequest) public institutionRequests;
    mapping(uint256 => bool) public employerVerified;
    mapping(address => string) public institutionNames;
    mapping(uint256 => bool) public institutionVerified;

    uint256 public tokenCounter;

    event EmployerRegistered(address indexed employer);
    event InstitutionRegistered(address indexed institution);
    event ResumeUploaded(address indexed applicant, string resumeHash);
    event NFTMinted(address indexed applicant, uint256 tokenId, string employerName);
    event InstitutionVerificationRequested(uint256 tokenId, string institutionName, address indexed employer, string employerName);
    event ResumeVerifiedByEmployer(uint256 tokenId, address indexed employer);
    event ResumeVerifiedByInstitution(uint256 tokenId, address indexed institution);
    event InstitutionApprovalUpdated(uint256 tokenId, address institution);
    event EmployerApprovalUpdated(uint256 tokenId, address employer);

    function TrustID() public ERC721Token("Digital Identity Verification NFT", "DIVNFT") {
        tokenCounter = 0;
    }

    function registerEmployer(address employer) public onlyOwner {
        require(employer != address(0));
        employers[employer] = true;
        emit EmployerRegistered(employer);
    }

    function registerInstitution(address institution, string name) public onlyOwner {
        require(institution != address(0));
        require(bytes(name).length > 0);
        institutions[institution] = true;
        institutionNames[institution] = name;
        emit InstitutionRegistered(institution);
    }

    function getInstitutionName(address institution) public view returns (string) {
        require(institutions[institution]);
        return institutionNames[institution];
    }

    function uploadResume(string applicantName, string hash, string employerName) public {
        require(bytes(applicantName).length > 0);
        require(bytes(hash).length > 0);
        require(bytes(employerName).length > 0);

        resumes[msg.sender] = Resume(applicantName, hash, employerName);
        emit ResumeUploaded(msg.sender, hash);

        uint256 tokenId = tokenCounter;
        _mint(msg.sender, tokenId);
        emit NFTMinted(msg.sender, tokenId, employerName);
        tokenCounter++;
    }

    function requestVerificationByInstitution(uint256 tokenId, string institutionName, string employerName) public {
        require(employers[msg.sender]);
        require(ownerOf(tokenId) != address(0));
        require(bytes(institutionName).length > 0);
        require(bytes(employerName).length > 0);

        institutionRequests[tokenId] = InstitutionRequest({
            tokenId: tokenId,
            institutionName: institutionName,
            requested: true
        });

        emit InstitutionVerificationRequested(tokenId, institutionName, msg.sender, employerName);
    }

    function verifyByInstitution(uint256 tokenId) public {
        require(ownerOf(tokenId) != address(0));
        require(institutions[msg.sender]);
        require(institutionRequests[tokenId].requested);
        require(bytes(institutionRequests[tokenId].institutionName).length > 0);

        institutionVerified[tokenId] = true;
        emit ResumeVerifiedByInstitution(tokenId, msg.sender);
        emit InstitutionApprovalUpdated(tokenId, msg.sender);
    }

    function verifyByEmployer(uint256 tokenId) public {
        require(employers[msg.sender]);
        require(ownerOf(tokenId) != address(0));
        require(institutionVerified[tokenId]);

        employerVerified[tokenId] = true;
        emit ResumeVerifiedByEmployer(tokenId, msg.sender);
        emit EmployerApprovalUpdated(tokenId, msg.sender);
    }

    function getResume(address applicant) public view returns (string, string, string) {
        Resume memory resume = resumes[applicant];
        return (resume.applicantName, resume.resumeHash, resume.employerName);
    }

    function isVerifiedByEmployer(uint256 tokenId) public view returns (bool) {
        return employerVerified[tokenId];
    }

    function isVerifiedByInstitution(uint256 tokenId) public view returns (bool) {
        return institutionVerified[tokenId];
    }

    function getInstitutionRequest(uint256 tokenId) public view returns (string, bool) {
        InstitutionRequest memory request = institutionRequests[tokenId];
        return (request.institutionName, request.requested);
    }
}
