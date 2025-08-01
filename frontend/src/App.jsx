import React, { useState, useEffect, useRef } from 'react';
import { Plus, Users, Package, Edit3, Trash2, UserCheck, UserX, Download } from 'lucide-react';
import UserAssets from './UserAssets';

const API_BASE = 'http://localhost:8000';
import './index.css'

const App = () => {
  // filepath: c:\Users\shanmukh\Desktop\Project\frontend\src\App.jsx
  const [showUserAssets, setShowUserAssets] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('assets');
  const [users, setUsers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    department: ''
  });

  const [assetForm, setAssetForm] = useState({
    name: '',
    asset_tag: '',
    category: '',
    description: '',
    serial_number: '',
    purchase_date: ''
  });

  const [importLoading, setImportLoading] = useState(false);
  const userCsvInputRef = useRef(null);
  const assetCsvInputRef = useRef(null);

  // Fetch data
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/users/`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await fetch(`${API_BASE}/assets/`);
      const data = await response.json();
      setAssets(data);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAssets();
  }, []);

  // User operations
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });
      if (response.ok) {
        fetchUsers();
        setShowUserModal(false);
        setUserForm({ name: '', email: '', department: '' });
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
    setLoading(false);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
        fetchUsers();
        fetchAssets();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  // Asset operations
  const handleCreateAsset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const assetData = {
        ...assetForm,
        purchase_date: new Date(assetForm.purchase_date).toISOString()
      };
      
      const response = await fetch(`${API_BASE}/assets/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
      });
      if (response.ok) {
        fetchAssets();
        setShowAssetModal(false);
        setAssetForm({
          name: '',
          asset_tag: '',
          category: '',
          description: '',
          serial_number: '',
          purchase_date: ''
        });
      }
    } catch (error) {
      console.error('Error creating asset:', error);
    }
    setLoading(false);
  };

  const handleUpdateAsset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/assets/${editingAsset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: assetForm.name,
          category: assetForm.category,
          description: assetForm.description,
          serial_number: assetForm.serial_number,
          status: assetForm.status
        })
      });
      if (response.ok) {
        fetchAssets();
        setEditingAsset(null);
        setShowAssetModal(false);
        setAssetForm({
          name: '',
          asset_tag: '',
          category: '',
          description: '',
          serial_number: '',
          purchase_date: ''
        });
      }
    } catch (error) {
      console.error('Error updating asset:', error);
    }
    setLoading(false);
  };

  const handleDeleteAsset = async (assetId) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        await fetch(`${API_BASE}/assets/${assetId}`, { method: 'DELETE' });
        fetchAssets();
      } catch (error) {
        console.error('Error deleting asset:', error);
      }
    }
  };

  const handleAssignAsset = async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/assets/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_id: selectedAsset.id,
          user_id: parseInt(userId)
        })
      });
      if (response.ok) {
        fetchAssets();
        setShowAssignModal(false);
        setSelectedAsset(null);
      }
    } catch (error) {
      console.error('Error assigning asset:', error);
    }
  };

  const handleUnassignAsset = async (assetId) => {
    try {
      await fetch(`${API_BASE}/assets/${assetId}/unassign`, { method: 'POST' });
      fetchAssets();
    } catch (error) {
      console.error('Error unassigning asset:', error);
    }
  };

  const openEditAsset = (asset) => {
    setEditingAsset(asset);
    setAssetForm({
      name: asset.name,
      asset_tag: asset.asset_tag,
      category: asset.category,
      description: asset.description,
      serial_number: asset.serial_number,
      purchase_date: asset.purchase_date.split('T')[0],
      status: asset.status
    });
    setShowAssetModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // CSV Import Handlers
  const handleUserCsvImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/import/users/`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        fetchUsers();
        alert('Users imported successfully!');
      } else {
        alert('Failed to import users.');
      }
    } catch {
      alert('Failed to import users.');
    }
    setImportLoading(false);
    userCsvInputRef.current.value = '';
  };

  const handleAssetCsvImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/import/assets/`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        fetchAssets();
        alert('Assets imported successfully!');
      } else {
        alert('Failed to import assets.');
      }
    } catch {
      alert('Failed to import assets.');
    }
    setImportLoading(false);
    assetCsvInputRef.current.value = '';
  };

  // Download CSV handlers
  const handleDownloadAssets = () => {
    window.open(`${API_BASE}/export/assets/`, '_blank');
  };

  const handleDownloadUsers = () => {
    window.open(`${API_BASE}/export/users/`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <div className="flex space-x-4">
              {activeTab === 'users' && (
                <button
                  onClick={handleDownloadUsers}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center space-x-2"
                >
                  <Download size={18} />
                  <span>Export Users (CSV)</span>
                </button>
              )}
              {activeTab === 'assets' && (
                <button
                  onClick={handleDownloadAssets}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center space-x-2"
                >
                  <Download size={18} />
                  <span>Export Assets (CSV)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('assets')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'assets'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="inline mr-2" size={16} />
              Assets
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="inline mr-2" size={16} />
              Users
            </button>
          </nav>
        </div>

        {activeTab === 'assets' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Assets</h3>
              <button
                onClick={() => setShowAssetModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Add Asset</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tag</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                          <div className="text-sm text-gray-500">{asset.serial_number}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.asset_tag}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(asset.status)}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.assigned_user ? asset.assigned_user.name : 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => openEditAsset(asset)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit3 size={16} />
                        </button>
                        {asset.status === 'available' ? (
                          <button
                            onClick={() => {
                              setSelectedAsset(asset);
                              setShowAssignModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            <UserCheck size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnassignAsset(asset.id)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            <UserX size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Users</h3>
              <button
                onClick={() => setShowUserModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Add User</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assets Assigned</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {assets.filter(asset => asset.assigned_user_id === user.id).length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setShowUserAssets(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Assets
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowUserModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New User</h3>
            <form onSubmit={handleCreateUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <input
                    type="text"
                    required
                    value={userForm.department}
                    onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-between space-x-3">
                <label className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 cursor-pointer flex items-center space-x-2">
                  <span>Import Users (CSV)</span>
                  <input
                    type="file"
                    accept=".csv"
                    ref={userCsvInputRef}
                    onChange={handleUserCsvImport}
                    style={{ display: 'none' }}
                    disabled={importLoading}
                  />
                </label>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Modal */}
      {showAssetModal && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setShowAssetModal(false);
            setEditingAsset(null);
            setAssetForm({
              name: '',
              asset_tag: '',
              category: '',
              description: '',
              serial_number: '',
              purchase_date: ''
            });
          }}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingAsset ? 'Edit Asset' : 'Add New Asset'}
            </h3>
            <form onSubmit={editingAsset ? handleUpdateAsset : handleCreateAsset}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {!editingAsset && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Asset Tag</label>
                    <input
                      type="text"
                      required
                      value={assetForm.asset_tag}
                      onChange={(e) => setAssetForm({ ...assetForm, asset_tag: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    required
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    required
                    value={assetForm.description}
                    onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                  <input
                    type="text"
                    required
                    value={assetForm.serial_number}
                    onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {!editingAsset && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
                    <input
                      type="date"
                      required
                      value={assetForm.purchase_date}
                      onChange={(e) => setAssetForm({ ...assetForm, purchase_date: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
                {editingAsset && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={assetForm.status}
                      onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="available">Available</option>
                      <option value="assigned">Assigned</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-between space-x-3">
                <label className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 cursor-pointer flex items-center space-x-2">
                  <span>Import Assets (CSV)</span>
                  <input
                    type="file"
                    accept=".csv"
                    ref={assetCsvInputRef}
                    onChange={handleAssetCsvImport}
                    style={{ display: 'none' }}
                    disabled={importLoading}
                  />
                </label>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssetModal(false);
                      setEditingAsset(null);
                      setAssetForm({
                        name: '',
                        asset_tag: '',
                        category: '',
                        description: '',
                        serial_number: '',
                        purchase_date: ''
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? (editingAsset ? 'Updating...' : 'Creating...') : (editingAsset ? 'Update Asset' : 'Create Asset')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Asset Modal */}
      {showAssignModal && selectedAsset && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setShowAssignModal(false);
            setSelectedAsset(null);
          }}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Assign Asset: {selectedAsset.name}
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
              <select
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                defaultValue=""
                onChange={e => {
                  if (e.target.value) handleAssignAsset(e.target.value);
                }}
              >
                <option value="" disabled>
                  -- Select a user --
                </option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email} - {user.department})
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedAsset(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showUserAssets && selectedUserId && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
          onClick={() => {
            setShowUserAssets(false);
            setSelectedUserId(null);
          }}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            <UserAssets
              userId={selectedUserId}
              onClose={() => {
                setShowUserAssets(false);
                setSelectedUserId(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;