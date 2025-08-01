import { useState, useEffect } from "react";
import axios from "axios";

export default function ApproverDashboard() {
  const [applicants, setApplicants] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    fetchApplicants();
  }, []);

  const fetchApplicants = async () => {
    try {
      const response = await axios.get("/api/participants");
      setApplicants(response.data);
    } catch (error) {
      console.error("Error fetching applicants", error);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`/api/participants/${id}`, { verification_status: status });
      fetchApplicants();
      setSelectedApplicant(null);
    } catch (error) {
      console.error("Error updating status", error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Approver Dashboard</h1>
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        {["pending", "verified", "rejected"].map((status) => (
          <button key={status} onClick={() => setFilter(status)}>{status.toUpperCase()}</button>
        ))}
      </div>
      
      <table border="1" cellPadding="10" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>College</th>
            <th>Degree</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {applicants.filter(a => a.verification_status === filter).map((applicant) => (
            <tr key={applicant._id}>
              <td>{applicant.full_name}</td>
              <td>{applicant.email}</td>
              <td>{applicant.college_name}</td>
              <td>{applicant.degree}</td>
              <td>{applicant.verification_status}</td>
              <td>
                <button onClick={() => setSelectedApplicant(applicant)}>View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {selectedApplicant && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: "white", padding: "20px", borderRadius: "8px" }}>
            <h2>{selectedApplicant.full_name}</h2>
            <p><strong>Email:</strong> {selectedApplicant.email}</p>
            <p><strong>Phone:</strong> {selectedApplicant.phone_number}</p>
            <p><strong>Degree:</strong> {selectedApplicant.degree}</p>
            <p><strong>Year:</strong> {selectedApplicant.year_of_study}</p>
            <p><strong>CGPA:</strong> {selectedApplicant.cgpa}</p>
            <p><strong>Tech Stack:</strong> {selectedApplicant.tech_stack.join(", ")}</p>
            <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => updateStatus(selectedApplicant._id, "verified")} style={{ background: "green", color: "white", padding: "10px", border: "none", cursor: "pointer" }}>Approve</button>
              <button onClick={() => updateStatus(selectedApplicant._id, "rejected")} style={{ background: "red", color: "white", padding: "10px", border: "none", cursor: "pointer" }}>Reject</button>
            </div>
            <button onClick={() => setSelectedApplicant(null)} style={{ marginTop: "10px", display: "block", width: "100%" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
