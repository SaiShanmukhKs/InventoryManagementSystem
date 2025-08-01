import React, { useEffect, useState } from "react";
import axios from "axios";

export default function UserAssets({ userId, onClose }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    // Fetch assets
    axios
      .get(`http://localhost:8000/users/${userId}/assets`)
      .then((res) => setAssets(res.data))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
    // Fetch user info
    axios
      .get(`http://localhost:8000/users/${userId}`)
      .then((res) => setUsername(res.data.name))
      .catch(() => setUsername(""));
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">
          Assets assigned to {username ? username : `User #${userId}`}
        </h2>
        {loading ? (
          <div>Loading...</div>
        ) : assets.length === 0 ? (
          <div>No assets assigned.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 mb-4">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Tag</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td className="px-4 py-2">{asset.name}</td>
                  <td className="px-4 py-2">{asset.asset_tag}</td>
                  <td className="px-4 py-2">{asset.category}</td>
                  <td className="px-4 py-2">{asset.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button
          onClick={onClose}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}