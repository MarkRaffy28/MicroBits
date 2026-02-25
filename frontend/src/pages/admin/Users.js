import axios from "axios";
import React, { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import AnimatedTableRows from "../../react_bits/AnimatedTableRows";
import Switch from "../../components/Switch";
import "../../styles/StyleSheet.css";

const API_URL = "http://localhost:5000/api/users";

/* ─── Avatar ─── */
const Avatar = ({ src, name, size = "w-10 h-10" }) => (
  src ? (
    <img
      src={`http://localhost:5000${src}`}
      alt={name}
      loading="lazy"
      decoding="async"
      className={`${size} object-cover rounded-full mx-auto`}
    />
  ) : (
    <div className={`${size} bg-gray-700 rounded-full flex items-center justify-center mx-auto`}>
      <i className="bi bi-person text-gray-400" />
    </div>
  )
);

/* ─── Reusable field ─── */
const Field = ({ id, label, type = "text", value, onChange, required = false, disabled = false, placeholder = " " }) => {
  const inputCls  = "w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white";
  const disabledCls = "w-full px-3 pt-5 pb-2 bg-gray-800/50 border border-gray-700/50 rounded text-gray-500 cursor-not-allowed";
  return (
    <div className="mb-3 relative">
      <input
        id={id} type={type} placeholder={placeholder} value={value}
        onChange={onChange} required={required} disabled={disabled}
        className={disabled ? disabledCls : inputCls}
      />
      <label htmlFor={id} className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">{label}</label>
    </div>
  );
};

/* ─── Reusable image upload ─── */
const ImageUpload = ({ imagePreview, onImageChange }) => (
  <div className="mb-4">
    <label className="block text-sm text-gray-400 mb-2">Profile Picture</label>
    <div className="flex flex-col items-center gap-3">
      {imagePreview ? (
        <img src={imagePreview} alt="Preview" loading="lazy" decoding="async" className="w-20 h-20 object-cover rounded-full" />
      ) : (
        <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center">
          <i className="bi bi-person text-3xl text-gray-500" />
        </div>
      )}
      <input
        type="file" accept="image/*" onChange={onImageChange}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
      />
    </div>
  </div>
);

function Users() {
  const { addToast } = useToast();
  const { role } = useParams();
  const { setPageTitle, setHeaderAction } = useOutletContext();
  const activeRole = role || "all";

  /* ─── Full table toggle ─── */
  const [showFull, setShowFull] = useState(false);

  /* ─── Modal state ─── */
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal,   setShowViewModal]   = useState(false);
  const [selectedUser,    setSelectedUser]    = useState(null);

  const handleAddClose    = () => { setShowAddModal(false);    resetImage(); };
  const handleAddShow     = () =>   setShowAddModal(true);
  const handleEditClose   = () => { setShowEditModal(false);   resetImage(); };
  const handleEditShow    = (user) => {
    setSelectedUser(user);
    setEditingUser({
      email:       user.email       || "",
      firstName:   user.firstName   || "",
      middleName:  user.middleName  || "",
      lastName:    user.lastName    || "",
      phoneNumber: user.phoneNumber || "",
      address:     user.address     || "",
      role:        user.role        || "user",
    });
    setImagePreview(user.profilePicture ? `http://localhost:5000${user.profilePicture}` : null);
    setShowEditModal(true);
  };
  const handleDeleteClose = () => setShowDeleteModal(false);
  const handleDeleteShow  = (user) => { setSelectedUser(user); setShowDeleteModal(true); };
  const handleViewClose   = () => setShowViewModal(false);
  const handleViewShow    = (user) => { setSelectedUser(user); setShowViewModal(true); };

  /* ─── Data ─── */
  const [users, setUsers] = useState([]);

  /* ─── Image ─── */
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const resetImage = () => { setImageFile(null); setImagePreview(null); };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  /* ─── Add state ─── */
  const blankNew = { username: "", password: "", email: "", firstName: "", middleName: "", lastName: "", phoneNumber: "", address: "", role: "user" };
  const [newUser, setNewUser] = useState(blankNew);

  /* ─── Edit state (no username/password) ─── */
  const blankEdit = { email: "", firstName: "", middleName: "", lastName: "", phoneNumber: "", address: "", role: "user" };
  const [editingUser, setEditingUser] = useState(blankEdit);

  /* ─── Header action — re-set when showFull changes ─── */
  useEffect(() => {
    setPageTitle("Users");
    setHeaderAction(
      <div className="flex items-center gap-3">
        <button
          className="bg-green-600 hover:bg-green-700 text-neutral-200 text-sm px-3 py-1 rounded transition-all duration-200 transform hover:scale-105"
          onClick={handleAddShow}
        >
          Add
        </button>
        <Switch
          id="full-table-switch"
          checked={showFull}
          onChange={setShowFull}
          label="Show full table"
        />
      </div>
    );
    return () => { setPageTitle("Admin"); setHeaderAction(null); };
  }, [showFull]);

  useEffect(() => { fetchUsers(); }, [activeRole]);

  const fetchUsers = async () => {
    const res = await axios.get(API_URL);
    const all = res.data;
    setUsers(activeRole === "all" ? all : all.filter((u) => u.role === activeRole));
  };

  /* ─── Helpers ─── */
  const getFullName = (u) => {
    const parts = [u.firstName, u.middleName, u.lastName].filter(Boolean);
    return parts.length ? parts.join(" ") : <span className="text-gray-500 italic">N/A</span>;
  };
  const cartCount = (u) => u.cart?.length ?? 0;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : <span className="text-gray-500 italic">N/A</span>;
  const roleBadge = (r) => (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold text-white ${r === "admin" ? "bg-purple-600" : "bg-blue-600"}`}>
      {r}
    </span>
  );

  /* ─── ADD ─── */
  const addUser = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(newUser).forEach(([k, v]) => formData.append(k, v));
      if (imageFile) formData.append("profilePicture", imageFile);

      const res = await axios.post(API_URL, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setUsers((prev) => [...prev, res.data]);
      setNewUser(blankNew);
      resetImage();
      handleAddClose();
      addToast(`User "${res.data.username}" added.`, "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to add user.", "error");
    }
  };

  /* ─── EDIT ─── */
  const editUser = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(editingUser).forEach(([k, v]) => formData.append(k, v));
      if (imageFile) formData.append("profilePicture", imageFile);

      const res = await axios.put(`${API_URL}/${selectedUser.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? res.data : u)));
      resetImage();
      handleEditClose();
      addToast(`User "${res.data.username}" updated.`, "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update user.", "error");
    }
  };

  /* ─── DELETE ─── */
  const deleteUser = async () => {
    try {
      await axios.delete(`${API_URL}/${selectedUser.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      handleDeleteClose();
      addToast(`User "${selectedUser.username}" deleted.`, "success");
    } catch {
      addToast("Failed to delete user.", "error");
    }
  };

  /* ─── Shared styles ─── */
  const modalOverlay = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn";
  const modalBox     = "bg-gray-900 rounded-lg w-full mx-4 max-h-[90vh] overflow-y-auto animate-slideUp";
  const inputCls     = "w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white";
  const disabledCls  = "w-full px-3 pt-5 pb-2 bg-gray-800/50 border border-gray-700/50 rounded text-gray-500 cursor-not-allowed";
  const selectCls    = "w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white";

  /* ─── Table rows ─── */
  const userRows = users.map((user) => (
    <>
      <td className="text-center px-3 py-3">
        <Avatar src={user.profilePicture} name={user.username} />
      </td>
      <td className="text-center px-3 py-3 text-sm">{user.id}</td>
      <td className="text-center px-3 py-3 text-sm font-medium">{user.username}</td>
      <td className="text-center px-3 py-3 text-sm">{getFullName(user)}</td>
      <td className="text-center px-3 py-3 text-sm">{user.email || <span className="text-gray-500 italic">N/A</span>}</td>
      {showFull && <>
        <td className="text-center px-3 py-3 text-sm">{user.phoneNumber || <span className="text-gray-500 italic">N/A</span>}</td>
        <td className="text-center px-3 py-3 text-sm">{user.address || <span className="text-gray-500 italic">N/A</span>}</td>
        <td className="text-center px-3 py-3 text-sm">{formatDate(user.createdAt)}</td>
      </>}
      <td className="text-center px-3 py-3">{roleBadge(user.role)}</td>
      <td className="text-center px-3 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${cartCount(user) > 0 ? "bg-orange-600 text-white" : "bg-gray-700 text-gray-400"}`}>
          <i className="bi bi-cart2" />
          {cartCount(user)}
        </span>
      </td>
      <td className="text-center px-3 py-3 whitespace-nowrap">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded mr-1 transition-all duration-200 transform hover:scale-105"
          onClick={(e) => { e.stopPropagation(); handleViewShow(user); }}
        >
          <i className="bi bi-eye mr-1" />View
        </button>
        <button
          className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-sm px-3 py-1.5 rounded mr-1 transition-all duration-200 transform hover:scale-105"
          onClick={(e) => { e.stopPropagation(); handleEditShow(user); }}
        >
          <i className="bi bi-pencil mr-1" />Edit
        </button>
        <button
          className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded transition-all duration-200 transform hover:scale-105"
          onClick={(e) => { e.stopPropagation(); handleDeleteShow(user); }}
        >
          <i className="bi bi-trash mr-1" />Delete
        </button>
      </td>
    </>
  ));

  return (
    <>
      {/* ─── Table ─── */}
      <div className="container mx-auto p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="border-b-4 border-blue-600">
              <tr className="align-middle">
                <th className="text-center px-3 py-3">Avatar</th>
                <th className="text-center px-3 py-3">ID</th>
                <th className="text-center px-3 py-3">Username</th>
                <th className="text-center px-3 py-3">Full Name</th>
                <th className="text-center px-3 py-3">Email</th>
                {showFull && <>
                  <th className="text-center px-3 py-3">Phone</th>
                  <th className="text-center px-3 py-3">Address</th>
                  <th className="text-center px-3 py-3">Joined</th>
                </>}
                <th className="text-center px-3 py-3">Role</th>
                <th className="text-center px-3 py-3">Cart</th>
                <th className="text-center px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatedTableRows items={userRows} />
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────── VIEW MODAL ─────────── */}
      {showViewModal && selectedUser && (
        <div className={modalOverlay} onClick={handleViewClose}>
          <div className={`${modalBox} max-w-md`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">USER DETAILS</h2>
              <button onClick={handleViewClose} className="hover:opacity-70 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              {/* Avatar + username */}
              <div className="flex flex-col items-center mb-6">
                <Avatar src={selectedUser.profilePicture} name={selectedUser.username} size="w-24 h-24" />
                <p className="text-white font-bold text-lg mt-3">{selectedUser.username}</p>
                {roleBadge(selectedUser.role)}
              </div>

              <div className="space-y-3">
                {[
                  { label: "ID",          value: `#${selectedUser.id}` },
                  { label: "Full Name",   value: getFullName(selectedUser) },
                  { label: "Email",       value: selectedUser.email       || <span className="text-gray-500 italic">N/A</span> },
                  { label: "Phone",       value: selectedUser.phoneNumber || <span className="text-gray-500 italic">N/A</span> },
                  { label: "Address",     value: selectedUser.address     || <span className="text-gray-500 italic">N/A</span> },
                  { label: "Joined",      value: formatDate(selectedUser.createdAt) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-start gap-4 py-2 border-b border-gray-800">
                    <span className="text-gray-400 text-sm whitespace-nowrap">{label}</span>
                    <span className="text-white text-sm text-right">{value}</span>
                  </div>
                ))}

                {/* Cart */}
                <div className="py-2 border-b border-gray-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm">Cart</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${cartCount(selectedUser) > 0 ? "bg-orange-600 text-white" : "bg-gray-700 text-gray-400"}`}>
                      <i className="bi bi-cart2" /> {cartCount(selectedUser)} item{cartCount(selectedUser) !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {selectedUser.cart?.length > 0 && (
                    <div className="space-y-1 mt-1">
                      {selectedUser.cart.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-400 bg-gray-800 px-3 py-1.5 rounded">
                          <span>Product ID: {item.productId}</span>
                          <span>Qty: {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <button onClick={handleViewClose}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded transition-all duration-200 transform hover:scale-105">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── ADD MODAL ─────────── */}
      {showAddModal && (
        <div className={modalOverlay} onClick={handleAddClose}>
          <div className={`${modalBox} max-w-lg`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">ADD USER</h2>
              <button onClick={handleAddClose} className="hover:opacity-70 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-4">
              <form onSubmit={addUser}>
                <ImageUpload imagePreview={imagePreview} onImageChange={handleImageChange} />

                <div className="grid grid-cols-2 gap-3">
                  <Field id="add_username"  label="Username *" value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required />
                  <Field id="add_password"  label="Password *" type="password" value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
                  <Field id="add_firstName" label="First Name"  value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} />
                  <Field id="add_middleName" label="Middle Name" value={newUser.middleName}
                    onChange={(e) => setNewUser({ ...newUser, middleName: e.target.value })} />
                  <Field id="add_lastName"  label="Last Name"   value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} />
                  <Field id="add_email"     label="Email"       type="email" value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                  <Field id="add_phone"     label="Phone"       type="tel" value={newUser.phoneNumber}
                    onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })} />
                </div>

                <Field id="add_address" label="Address" value={newUser.address}
                  onChange={(e) => setNewUser({ ...newUser, address: e.target.value })} />

                {/* Role */}
                <div className="mb-3 relative">
                  <select id="add_role" value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className={selectCls}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <label htmlFor="add_role" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Role</label>
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <button type="button" onClick={handleAddClose}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105">
                    Cancel
                  </button>
                  <button type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105">
                    Add User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── EDIT MODAL ─────────── */}
      {showEditModal && selectedUser && (
        <div className={modalOverlay} onClick={handleEditClose}>
          <div className={`${modalBox} max-w-lg`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">EDIT USER</h2>
              <button onClick={handleEditClose} className="hover:opacity-70 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-4">
              <form onSubmit={editUser}>
                <ImageUpload imagePreview={imagePreview} onImageChange={handleImageChange} />

                {/* Read-only: username & password */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="relative">
                    <input value={selectedUser.username} disabled className={disabledCls} />
                    <label className="absolute left-3 top-1 text-xs pointer-events-none text-gray-500">Username (locked)</label>
                  </div>
                  <div className="relative">
                    <input value="••••••••" disabled className={disabledCls} />
                    <label className="absolute left-3 top-1 text-xs pointer-events-none text-gray-500">Password (locked)</label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field id="edit_firstName"  label="First Name"  value={editingUser.firstName}
                    onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })} />
                  <Field id="edit_middleName" label="Middle Name" value={editingUser.middleName}
                    onChange={(e) => setEditingUser({ ...editingUser, middleName: e.target.value })} />
                  <Field id="edit_lastName"   label="Last Name"   value={editingUser.lastName}
                    onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })} />
                  <Field id="edit_email"      label="Email"       type="email" value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} />
                  <Field id="edit_phone"      label="Phone"       type="tel" value={editingUser.phoneNumber}
                    onChange={(e) => setEditingUser({ ...editingUser, phoneNumber: e.target.value })} />
                </div>

                <Field id="edit_address" label="Address" value={editingUser.address}
                  onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })} />

                {/* Role */}
                <div className="mb-3 relative">
                  <select id="edit_role" value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className={selectCls}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <label htmlFor="edit_role" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Role</label>
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <button type="button" onClick={handleEditClose}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105">
                    Cancel
                  </button>
                  <button type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── DELETE MODAL ─────────── */}
      {showDeleteModal && selectedUser && (
        <div className={modalOverlay} onClick={handleDeleteClose}>
          <div className="bg-gray-900 rounded-lg max-w-md w-full mx-4 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">DELETE USER?</h2>
              <button onClick={handleDeleteClose} className="hover:opacity-70 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-4 text-center">
              <i className="bi bi-exclamation-triangle text-6xl text-red-500 mb-3 animate-bounce" />
              <p className="mb-1 px-2 text-white">
                Are you sure you want to delete <span className="font-bold">"{selectedUser.username}"</span>?
              </p>
              <p className="text-gray-400 text-sm">This action cannot be undone.</p>
            </div>
            <div className="p-4 flex justify-center gap-3">
              <button onClick={handleDeleteClose}
                className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded transition-all duration-200 transform hover:scale-105">
                Close
              </button>
              <button onClick={deleteUser}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded transition-all duration-200 transform hover:scale-105">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Users;