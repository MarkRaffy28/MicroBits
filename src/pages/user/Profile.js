import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, sendEmailVerification, verifyBeforeUpdateEmail, } from "firebase/auth";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../firebase/config";
import { getUserById, updateUser, deleteUser, isUsernameTaken } from "../../firebase/services/users";
import { getOrdersByUser } from "../../firebase/services/orders";
import { getAllProducts }   from "../../firebase/services/products";
import { logout }           from "../../firebase/services/auth";
import { ORDER_STATUS_LABELS } from "../../firebase/services/orders";

// =========================
// Module-level components
// =========================

const Field = ({
  id, label, type = "text", value, onChange,
  required = false, disabled = false,
  suffix, error, hint,
}) => (
  <div className="relative">
    <input
      id={id} type={type} placeholder=" " value={value}
      onChange={onChange} required={required} disabled={disabled}
      autoComplete="off"
      className={`w-full px-3 pt-6 pb-2 rounded-lg border transition-all duration-200 text-white bg-gray-800 text-sm
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
        ${suffix ? "pr-10" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed border-gray-700" : "border-gray-600"}
        ${error ? "border-red-500 focus:ring-red-500" : ""}`}
    />
    <label htmlFor={id} className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">
      {label}
    </label>
    {suffix && (
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{suffix}</span>
    )}
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    {hint && !error && <p className="text-gray-500 text-xs mt-1">{hint}</p>}
  </div>
);

const Card = ({ title, icon, children, action }) => (
  <div className="bg-gray-800 rounded-xl border border-gray-700/50 overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
      <h2 className="font-semibold text-white flex items-center gap-2 text-sm">
        <i className={`bi ${icon} text-blue-400`} />
        {title}
      </h2>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

/* Reusable spinner for save buttons */
const BtnSpinner = () => (
  <svg className="animate-spin h-3.5 w-3.5 mr-1.5 inline" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const STATUS_COLORS = {
  to_pay:        "bg-yellow-600",
  to_ship:       "bg-blue-600",
  to_receive:    "bg-purple-600",
  completed:     "bg-green-600",
  cancelled:     "bg-red-600",
  return_refund: "bg-orange-600",
};

// =========================
// Main Component
// =========================

function Profile() {
  const { addToast }    = useToast();
  const { currentUser, setCurrentUser } = useAuth();
  const navigate        = useNavigate();
  const userId          = currentUser?.id;

  /* ─── Data ─── */
  const [user,           setUser]           = useState(null);
  const [orders,         setOrders]         = useState([]);
  const [products,       setProducts]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [profileDeleted, setProfileDeleted] = useState(false);

  /* ─── Edit sections ─── */
  const [editSection, setEditSection] = useState(null);
  const toggleSection = (key) => setEditSection((prev) => (prev === key ? null : key));

  /* ─── Per-section saving flags ─── */
  const [saving, setSaving] = useState({
    info: false, username: false, password: false,
    email: false, avatar: false, delete: false,
  });
  const startSaving = (key) => setSaving((p) => ({ ...p, [key]: true  }));
  const stopSaving  = (key) => setSaving((p) => ({ ...p, [key]: false }));

  /* ─── Form states ─── */
  const [infoForm, setInfoForm] = useState({
    firstName: "", middleName: "", lastName: "",
    phoneNumber: "", address: "",
  });

  const [usernameForm,   setUsernameForm]   = useState({ username: "" });
  const [usernameStatus, setUsernameStatus] = useState(null);
  const usernameDebounce = useRef(null);

  const [passwordForm,   setPasswordForm]   = useState({ current: "", newPass: "", confirm: "" });
  const [showPasswords,  setShowPasswords]  = useState({ current: false, newPass: false, confirm: false });
  const [passwordErrors, setPasswordErrors] = useState({});

  /* ─── Email change ─── */
  const [emailForm,         setEmailForm]         = useState({ newEmail: "", confirmPassword: "" });
  const [emailErrors,       setEmailErrors]       = useState({});
  const [emailSent,         setEmailSent]         = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [verificationSent,  setVerificationSent]  = useState(false);

  /* ─── Image ─── */
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  /* ─── Fetch ─── */
  useEffect(() => {
    if (profileDeleted || !userId) return;
    const load = async () => {
      try {
        const [u, userOrders, allProducts] = await Promise.all([
          getUserById(userId),
          getOrdersByUser(userId),
          getAllProducts(),
        ]);
        setUser(u);
        setOrders(userOrders);
        setProducts(allProducts);
        setInfoForm({
          firstName:   u.firstName   || "",
          middleName:  u.middleName  || "",
          lastName:    u.lastName    || "",
          phoneNumber: u.phoneNumber || "",
          address:     u.address     || "",
        });
        setUsernameForm({ username: u.username });
      } catch {
        if (!profileDeleted) addToast("Failed to load profile.", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, profileDeleted]);

  /* ─── Username availability ─── */
  const handleUsernameChange = (val) => {
    setUsernameForm({ username: val });
    if (!val.trim() || val.trim() === user?.username) {
      setUsernameStatus(val.trim() === user?.username ? "same" : null);
      return;
    }
    setUsernameStatus("checking");
    clearTimeout(usernameDebounce.current);
    usernameDebounce.current = setTimeout(async () => {
      try {
        const taken = await isUsernameTaken(val.trim());
        setUsernameStatus(taken ? "taken" : "available");
      } catch {
        setUsernameStatus(null);
      }
    }, 500);
  };

  /* ─── Saves ─── */
  const saveInfo = async (e) => {
    e.preventDefault();
    startSaving("info");
    try {
      const updated = await updateUser(userId, infoForm);
      setUser(updated);
      addToast("Profile info updated.", "success");
      setEditSection(null);
    } catch {
      addToast("Failed to update info.", "error");
    } finally {
      stopSaving("info");
    }
  };

  const saveUsername = async (e) => {
    e.preventDefault();
    if (usernameStatus === "taken") return;
    if (usernameStatus === "same") { setEditSection(null); return; }
    startSaving("username");
    try {
      const updated = await updateUser(userId, { username: usernameForm.username.trim() });
      setUser(updated);
      setCurrentUser({ ...currentUser, ...updated });
      addToast("Username updated.", "success");
      setEditSection(null);
    } catch {
      addToast("Failed to update username.", "error");
    } finally {
      stopSaving("username");
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!passwordForm.current)                                   errs.current = "Required.";
    if (!passwordForm.newPass || passwordForm.newPass.length < 6) errs.newPass = "Min 6 characters.";
    if (passwordForm.newPass !== passwordForm.confirm)           errs.confirm = "Passwords do not match.";
    setPasswordErrors(errs);
    if (Object.keys(errs).length) return;

    startSaving("password");
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, passwordForm.current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwordForm.newPass);
      setPasswordForm({ current: "", newPass: "", confirm: "" });
      setPasswordErrors({});
      addToast("Password changed successfully.", "success");
      setEditSection(null);
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setPasswordErrors({ current: "Current password is incorrect." });
      } else {
        addToast("Failed to change password.", "error");
      }
    } finally {
      stopSaving("password");
    }
  };

  /* ─── Save email — sends verification to new address ─── */
  const saveEmail = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!emailForm.newEmail || !emailForm.newEmail.includes("@")) errs.newEmail = "Enter a valid email.";
    if (emailForm.newEmail === auth.currentUser?.email)           errs.newEmail = "This is already your email.";
    if (!emailForm.confirmPassword)                               errs.confirmPassword = "Required.";
    setEmailErrors(errs);
    if (Object.keys(errs).length) return;

    startSaving("email");
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, emailForm.confirmPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await verifyBeforeUpdateEmail(auth.currentUser, emailForm.newEmail.trim());
      setEmailSent(true);
      setEmailForm({ newEmail: "", confirmPassword: "" });
      addToast("Verification email sent. Check your new inbox to confirm the change.", "success");
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setEmailErrors({ confirmPassword: "Incorrect password." });
      } else if (err.code === "auth/email-already-in-use") {
        setEmailErrors({ newEmail: "This email is already in use." });
      } else {
        addToast("Failed to send verification email.", "error");
      }
    } finally {
      stopSaving("email");
    }
  };

  /* ─── Resend verification email ─── */
  const resendVerification = async () => {
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationSent(true);
      addToast("Verification email sent.", "success");
    } catch {
      addToast("Failed to send verification email.", "error");
    }
  };

  const saveAvatar = async (e) => {
    e.preventDefault();
    if (!imageFile) return;
    startSaving("avatar");
    try {
      const updated = await updateUser(userId, {}, imageFile);
      setUser(updated);
      setImageFile(null);
      setImagePreview(null);
      addToast("Profile picture updated.", "success");
      setEditSection(null);
    } catch {
      addToast("Failed to update picture.", "error");
    } finally {
      stopSaving("avatar");
    }
  };

  /* ─── Helpers ─── */
  const totalSpent      = orders.filter((o) => o.status === "completed").reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const activeOrders    = orders.filter((o) => !["completed", "cancelled"].includes(o.status)).length;
  const cartItems       = user?.cart?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const emailVerified   = auth.currentUser?.emailVerified ?? false;

  const formatDate  = (d) => d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A";
  const getFullName = (u) => {
    if (!u) return "";
    const parts = [u.firstName, u.middleName, u.lastName].filter(Boolean);
    return parts.join(" ") || u.username;
  };
  const toggleEye = (key) => setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <svg className="animate-spin h-8 w-8 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Loading profile…
    </div>
  );

  if (profileDeleted) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <svg className="animate-spin h-8 w-8 mb-3 text-green-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-green-400 font-medium">Account deleted successfully</p>
      <p className="text-gray-500 text-sm mt-1">Redirecting to home...</p>
    </div>
  );

  if (!user) return <p className="p-6 text-red-400">User not found.</p>;

  return (
    <>
      <div className="max-w-3xl mx-auto p-4 space-y-5">

        {/* ─── Hero / Avatar ─── */}
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative flex-shrink-0">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.username}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-700" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-700 border-4 border-gray-600 flex items-center justify-center">
                  <i className="bi bi-person text-4xl text-gray-400" />
                </div>
              )}
              <button onClick={() => toggleSection("avatar")}
                className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow transition-colors">
                <i className="bi bi-camera-fill text-white text-xs" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-xl font-bold text-white">{getFullName(user) || user.username}</h1>
              <p className="text-gray-400 text-sm mt-0.5">@{user.username}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded font-semibold text-white ${user.role === "admin" ? "bg-purple-600" : "bg-blue-600"}`}>
                  {user.role}
                </span>
                {user.email && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <i className="bi bi-envelope" />{user.email}
                    {emailVerified
                      ? <span className="text-green-400 flex items-center gap-0.5 ml-1"><i className="bi bi-patch-check-fill text-xs" />Verified</span>
                      : <span className="text-yellow-400 flex items-center gap-0.5 ml-1"><i className="bi bi-exclamation-circle text-xs" />Unverified</span>
                    }
                  </span>
                )}
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <i className="bi bi-calendar3" />Joined {formatDate(user.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Avatar upload panel */}
          {editSection === "avatar" && (
            <form onSubmit={saveAvatar} className="mt-5 pt-5 border-t border-gray-700">
              <div className="flex flex-col items-center gap-3">
                {imagePreview && (
                  <img src={imagePreview} alt="Preview"
                    className="w-24 h-24 rounded-full object-cover border-4 border-blue-500/50" />
                )}
                <input type="file" accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setImageFile(file);
                      const r = new FileReader();
                      r.onloadend = () => setImagePreview(r.result);
                      r.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-sm text-gray-400 bg-gray-700 border border-gray-600 rounded px-3 py-2
                    file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button"
                  onClick={() => { setEditSection(null); setImageFile(null); setImagePreview(null); }}
                  disabled={saving.avatar}
                  className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Cancel
                </button>
                <button type="submit" disabled={!imageFile || saving.avatar}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving.avatar ? <><BtnSpinner />Saving…</> : "Save Picture"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ─── Email verification banner ─── */}
        {!emailVerified && (
          <div className="bg-yellow-600/10 border border-yellow-600/40 rounded-xl px-5 py-4 flex items-start gap-3">
            <i className="bi bi-exclamation-triangle-fill text-yellow-400 text-lg flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-yellow-300 font-semibold text-sm">Email not verified</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Please verify your email address <span className="text-white">{user.email}</span> to secure your account.
              </p>
            </div>
            <button
              onClick={resendVerification}
              disabled={verificationSent}
              className="flex-shrink-0 px-3 py-1.5 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {verificationSent ? <><i className="bi bi-check mr-1" />Sent</> : "Send Verification"}
            </button>
          </div>
        )}

        {/* ─── Stats strip ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Orders", value: orders.length,                icon: "bi-receipt",           color: "text-blue-400"   },
            { label: "Completed",    value: completedOrders,              icon: "bi-check-circle-fill", color: "text-green-400"  },
            { label: "Active",       value: activeOrders,                 icon: "bi-hourglass-split",   color: "text-yellow-400" },
            { label: "Total Spent",  value: `$${totalSpent.toFixed(2)}`,  icon: "bi-currency-dollar",   color: "text-purple-400" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-gray-800 rounded-xl border border-gray-700/50 p-4 text-center">
              <i className={`bi ${icon} text-xl ${color} mb-1 block`} />
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ─── Username ─── */}
        <Card title="Username" icon="bi-at"
          action={
            <button onClick={() => toggleSection("username")}
              className={`text-xs px-3 py-1 rounded transition-colors ${editSection === "username"
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"}`}>
              {editSection === "username" ? "Cancel" : <><i className="bi bi-pencil mr-1" />Edit</>}
            </button>
          }
        >
          {editSection !== "username" ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600/20 rounded-full flex items-center justify-center">
                <i className="bi bi-at text-blue-400" />
              </div>
              <div>
                <p className="text-white font-semibold">{user.username}</p>
                <p className="text-gray-500 text-xs">Your unique handle across the platform</p>
              </div>
            </div>
          ) : (
            <form onSubmit={saveUsername} className="space-y-3">
              <div className="relative">
                <Field id="new_username" label="New Username"
                  value={usernameForm.username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  required
                  hint="Must be unique."
                  error={usernameStatus === "taken" ? "Username is already taken." : undefined}
                />
                <div className="absolute right-3 top-4">
                  {usernameStatus === "checking"  && <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                  {usernameStatus === "available" && <i className="bi bi-check-circle-fill text-green-400 text-sm" />}
                  {usernameStatus === "taken"     && <i className="bi bi-x-circle-fill text-red-400 text-sm" />}
                  {usernameStatus === "same"      && <i className="bi bi-dash-circle text-gray-500 text-sm" />}
                </div>
              </div>
              {usernameStatus === "available" && (
                <p className="text-green-400 text-xs flex items-center gap-1">
                  <i className="bi bi-check-circle-fill" /> Username is available!
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button type="button"
                  onClick={() => { setEditSection(null); setUsernameForm({ username: user.username }); setUsernameStatus(null); }}
                  disabled={saving.username}
                  className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Cancel
                </button>
                <button type="submit"
                  disabled={usernameStatus === "taken" || usernameStatus === "checking" || !usernameForm.username.trim() || saving.username}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving.username ? <><BtnSpinner />Updating…</> : "Update Username"}
                </button>
              </div>
            </form>
          )}
        </Card>

        {/* ─── Email ─── */}
        <Card title="Email Address" icon="bi-envelope-fill"
          action={
            <button onClick={() => { toggleSection("email"); setEmailSent(false); setEmailErrors({}); setEmailForm({ newEmail: "", confirmPassword: "" }); }}
              className={`text-xs px-3 py-1 rounded transition-colors ${editSection === "email"
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"}`}>
              {editSection === "email" ? "Cancel" : <><i className="bi bi-pencil mr-1" />Change</>}
            </button>
          }
        >
          {editSection !== "email" ? (
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${emailVerified ? "bg-green-600/20" : "bg-yellow-600/20"}`}>
                <i className={`bi ${emailVerified ? "bi-patch-check-fill text-green-400" : "bi-envelope-exclamation text-yellow-400"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user.email}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {emailVerified ? (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <i className="bi bi-check-circle-fill" />Verified
                    </span>
                  ) : (
                    <span className="text-xs text-yellow-400 flex items-center gap-1">
                      <i className="bi bi-exclamation-circle" />Not verified
                    </span>
                  )}
                </div>
              </div>
              {!emailVerified && (
                <button onClick={resendVerification} disabled={verificationSent}
                  className="text-xs px-3 py-1.5 bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 border border-yellow-600/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {verificationSent ? <><i className="bi bi-check mr-1" />Sent</> : "Resend Verification"}
                </button>
              )}
            </div>
          ) : emailSent ? (
            /* ─ Sent confirmation ─ */
            <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4 text-center space-y-2">
              <i className="bi bi-envelope-check-fill text-green-400 text-3xl block" />
              <p className="text-green-300 font-semibold text-sm">Verification email sent!</p>
              <p className="text-gray-400 text-xs">
                We've sent a confirmation link to <span className="text-white font-medium">{emailForm.newEmail || "your new email"}</span>.
                Click the link to complete the change. Your current email remains active until then.
              </p>
              <button onClick={() => { setEditSection(null); setEmailSent(false); }}
                className="mt-2 px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                Done
              </button>
            </div>
          ) : (
            /* ─ Change email form ─ */
            <form onSubmit={saveEmail} className="space-y-3">
              <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg px-4 py-3 text-xs text-gray-400 flex items-start gap-2">
                <i className="bi bi-info-circle text-blue-400 flex-shrink-0 mt-0.5" />
                A verification link will be sent to your new email. Your email won't change until you click it.
              </div>

              <Field id="new_email" label="New Email Address" type="email"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                error={emailErrors.newEmail}
                required
              />

              <div className="relative">
                <Field id="email_confirm_password" label="Current Password"
                  type={showEmailPassword ? "text" : "password"}
                  value={emailForm.confirmPassword}
                  onChange={(e) => setEmailForm({ ...emailForm, confirmPassword: e.target.value })}
                  error={emailErrors.confirmPassword}
                  hint="Required to confirm the change."
                  required
                />
                <button type="button" onClick={() => setShowEmailPassword((v) => !v)}
                  className="absolute right-3 top-4 text-gray-400 hover:text-gray-300 transition-colors">
                  <i className={`bi ${showEmailPassword ? "bi-eye" : "bi-eye-slash"} text-sm`} />
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button"
                  onClick={() => { setEditSection(null); setEmailErrors({}); setEmailForm({ newEmail: "", confirmPassword: "" }); }}
                  disabled={saving.email}
                  className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Cancel
                </button>
                <button type="submit" disabled={saving.email}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving.email ? <><BtnSpinner />Sending…</> : "Send Verification"}
                </button>
              </div>
            </form>
          )}
        </Card>

        {/* ─── Password ─── */}
        <Card title="Password" icon="bi-lock-fill"
          action={
            <button onClick={() => { toggleSection("password"); setPasswordErrors({}); setPasswordForm({ current: "", newPass: "", confirm: "" }); }}
              className={`text-xs px-3 py-1 rounded transition-colors ${editSection === "password"
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"}`}>
              {editSection === "password" ? "Cancel" : <><i className="bi bi-pencil mr-1" />Change</>}
            </button>
          }
        >
          {editSection !== "password" ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center">
                <i className="bi bi-lock-fill text-gray-400" />
              </div>
              <div>
                <p className="text-white text-sm">••••••••</p>
                <p className="text-gray-500 text-xs">Use a strong password to secure your account</p>
              </div>
            </div>
          ) : (
            <form onSubmit={savePassword} className="space-y-3">
              {[
                { id: "current_pass", label: "Current Password",     key: "current" },
                { id: "new_pass",     label: "New Password",         key: "newPass", hint: "Minimum 6 characters." },
                { id: "confirm_pass", label: "Confirm New Password", key: "confirm" },
              ].map(({ id, label, key, hint }) => (
                <div key={id} className="relative">
                  <Field id={id} label={label}
                    type={showPasswords[key] ? "text" : "password"}
                    value={passwordForm[key]}
                    onChange={(e) => setPasswordForm({ ...passwordForm, [key]: e.target.value })}
                    error={passwordErrors[key]}
                    hint={hint}
                  />
                  <button type="button" onClick={() => toggleEye(key)}
                    className="absolute right-3 top-4 text-gray-400 hover:text-gray-300 transition-colors">
                    <i className={`bi ${showPasswords[key] ? "bi-eye" : "bi-eye-slash"} text-sm`} />
                  </button>
                </div>
              ))}

              {passwordForm.newPass && (() => {
                const len      = passwordForm.newPass.length;
                const hasUpper = /[A-Z]/.test(passwordForm.newPass);
                const hasNum   = /[0-9]/.test(passwordForm.newPass);
                const hasSpec  = /[^A-Za-z0-9]/.test(passwordForm.newPass);
                const score    = [len >= 8, hasUpper, hasNum, hasSpec].filter(Boolean).length;
                const labels   = ["", "Weak", "Fair", "Good", "Strong"];
                const colors   = ["", "bg-red-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];
                const textCol  = ["", "text-red-400", "text-yellow-400", "text-blue-400", "text-green-400"];
                return (
                  <div>
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${i <= score ? colors[score] : "bg-gray-700"} transition-all duration-300`} />
                      ))}
                    </div>
                    <p className={`text-xs ${textCol[score]}`}>{labels[score]}</p>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button"
                  onClick={() => { setEditSection(null); setPasswordErrors({}); setPasswordForm({ current: "", newPass: "", confirm: "" }); }}
                  disabled={saving.password}
                  className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Cancel
                </button>
                <button type="submit" disabled={saving.password}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving.password ? <><BtnSpinner />Changing…</> : "Change Password"}
                </button>
              </div>
            </form>
          )}
        </Card>

        {/* ─── Personal Info ─── */}
        <Card title="Personal Information" icon="bi-person-lines-fill"
          action={
            <button onClick={() => toggleSection("info")}
              className={`text-xs px-3 py-1 rounded transition-colors ${editSection === "info"
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"}`}>
              {editSection === "info" ? "Cancel" : <><i className="bi bi-pencil mr-1" />Edit</>}
            </button>
          }
        >
          {editSection !== "info" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "First Name",  value: user.firstName   },
                { label: "Middle Name", value: user.middleName  },
                { label: "Last Name",   value: user.lastName    },
                { label: "Phone",       value: user.phoneNumber },
                { label: "Address",     value: user.address, span: true },
              ].map(({ label, value, span }) => (
                <div key={label} className={span ? "sm:col-span-2" : ""}>
                  <p className="text-gray-500 text-xs mb-0.5">{label}</p>
                  <p className="text-white text-sm">{value || <span className="text-gray-600 italic">Not set</span>}</p>
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={saveInfo} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field id="firstName"  label="First Name"  value={infoForm.firstName}
                  onChange={(e) => setInfoForm({ ...infoForm, firstName: e.target.value })} />
                <Field id="middleName" label="Middle Name" value={infoForm.middleName}
                  onChange={(e) => setInfoForm({ ...infoForm, middleName: e.target.value })} />
                <Field id="lastName"   label="Last Name"   value={infoForm.lastName}
                  onChange={(e) => setInfoForm({ ...infoForm, lastName: e.target.value })} />
                <Field id="phone" label="Phone" type="tel" value={infoForm.phoneNumber}
                  onChange={(e) => setInfoForm({ ...infoForm, phoneNumber: e.target.value })} />
              </div>
              <Field id="address" label="Address" value={infoForm.address}
                onChange={(e) => setInfoForm({ ...infoForm, address: e.target.value })} />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEditSection(null)}
                  disabled={saving.info}
                  className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Cancel
                </button>
                <button type="submit" disabled={saving.info}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving.info ? <><BtnSpinner />Saving…</> : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </Card>

        {/* ─── Cart summary ─── */}
        {user.cart?.length > 0 && (
          <Card title="Cart" icon="bi-cart3">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500 uppercase pb-1 border-b border-gray-700">
                <span>Product</span><span>Quantity</span>
              </div>
              {user.cart.map((item, i) => {
                const product = products.find((p) => p.id === item.productId);
                return (
                  <div key={i} className="flex justify-between items-center gap-3 py-1.5 text-sm border-b border-gray-700/40 last:border-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {product?.image ? (
                        <img src={product.image} alt={product.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                          <i className="bi bi-box text-gray-500 text-xs" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-gray-300 text-sm truncate">{product?.name ?? `Product #${item.productId}`}</p>
                        {product?.category && <p className="text-gray-500 text-xs">{product.category}</p>}
                      </div>
                    </div>
                    <span className="text-white font-semibold bg-gray-700 px-2 py-0.5 rounded text-xs flex-shrink-0">
                      ×{item.quantity}
                    </span>
                  </div>
                );
              })}
              <p className="text-right text-xs text-gray-500 pt-1">{cartItems} item{cartItems !== 1 ? "s" : ""} in cart</p>
            </div>
          </Card>
        )}

        {/* ─── Order history ─── */}
        <Card title="Order History" icon="bi-clock-history">
          {orders.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No orders placed yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase border-b border-gray-700">
                    <th className="text-left pb-2 pr-3 whitespace-nowrap">Order ID</th>
                    <th className="text-center sm:text-left pb-2 pr-3 whitespace-nowrap">Items</th>
                    <th className="text-center sm:text-left pb-2 pr-3 whitespace-nowrap">Total</th>
                    <th className="text-center sm:text-left pb-2 pr-3 whitespace-nowrap hidden sm:table-cell">Payment</th>
                    <th className="text-center sm:text-left pb-2 pr-3 whitespace-nowrap">Status</th>
                    <th className="text-center sm:text-left pb-2 whitespace-nowrap hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/40">
                  {[...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((o) => (
                    <tr key={o.id}
                      onClick={() => navigate(`/user/orders/detail/${o.id}`)}
                      className="hover:bg-gray-700/20 transition-colors cursor-pointer">
                      <td className="py-2.5 pr-3 text-gray-400 font-mono text-xs truncate max-w-[72px]" title={o.id}>
                        #{o.id}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-300 text-center sm:text-left">
                        {o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? "s" : ""}
                      </td>
                      <td className="py-2.5 pr-3 text-green-400 font-semibold text-center sm:text-left">
                        ${o.totalAmount?.toFixed(2) ?? "0.00"}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-400 text-xs text-center sm:text-left hidden sm:table-cell">
                        {o.paymentMethod}
                      </td>
                      <td className="py-2.5 pr-3 text-center sm:text-left">
                        {/* whitespace-nowrap keeps the label on one line */}
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full text-white font-medium whitespace-nowrap ${STATUS_COLORS[o.status] ?? "bg-gray-600"}`}>
                          {ORDER_STATUS_LABELS[o.status] ?? o.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-500 text-xs text-center sm:text-left hidden sm:table-cell">
                        {formatDate(o.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ─── Danger Zone ─── */}
        <Card title="Danger Zone" icon="bi-exclamation-triangle-fill">
          <div className="flex items-start gap-3 p-4 bg-red-600/10 border border-red-600/30 rounded-lg">
            <i className="bi bi-exclamation-triangle-fill text-red-400 text-xl flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-semibold text-sm mb-1">Delete Account</p>
              <p className="text-gray-400 text-xs mb-3">
                Once deleted, your account, orders, and cart will be permanently removed and cannot be recovered.
              </p>
              <button onClick={() => setEditSection("delete")}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                <i className="bi bi-trash mr-1.5" />Delete My Account
              </button>
            </div>
          </div>
        </Card>

      </div>

      {/* ─────────── DELETE ACCOUNT MODAL ─────────── */}
      {editSection === "delete" && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => !saving.delete && setEditSection(null)}>
          <div className="bg-gray-900 rounded-xl max-w-md w-full border border-red-600/50 animate-slideUp"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
              <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
                <i className="bi bi-exclamation-triangle-fill" />Delete Account?
              </h2>
              <button onClick={() => setEditSection(null)} disabled={saving.delete}
                className="text-gray-400 hover:text-white text-xl leading-none disabled:opacity-50">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2 bg-red-600/10 border border-red-600/30 rounded-lg p-4">
                <p className="text-red-400 font-semibold text-sm mb-2">This action will:</p>
                <ul className="space-y-1.5 text-gray-300 text-xs">
                  {["Permanently delete your account", "Remove all your personal information",
                    "Delete your order history", "Clear your cart", "Cannot be undone"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <i className="bi bi-x-circle text-red-400 flex-shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-gray-400 text-sm">Please enter your password to confirm:</p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const pwd = e.target.confirmPassword.value;
                  startSaving("delete");
                  try {
                    const credential = EmailAuthProvider.credential(auth.currentUser.email, pwd);
                    await reauthenticateWithCredential(auth.currentUser, credential);
                    setProfileDeleted(true);
                    await deleteUser(userId);
                    await logout();
                    addToast("Account deleted successfully.", "success");
                    setTimeout(() => navigate("/"), 1500);
                  } catch (err) {
                    setProfileDeleted(false);
                    stopSaving("delete");
                    if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
                      addToast("Incorrect password.", "error");
                    } else {
                      addToast("Failed to delete account.", "error");
                    }
                  }
                }}
                className="space-y-4"
              >
                <div className="relative">
                  <input type="password" name="confirmPassword" placeholder=" " required autoComplete="off"
                    disabled={saving.delete}
                    className="w-full px-3 pt-6 pb-2 rounded-lg border border-red-600/50 bg-gray-800 text-white text-sm
                      focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
                      disabled:opacity-50 disabled:cursor-not-allowed" />
                  <label className="absolute left-3 top-1 text-xs pointer-events-none text-red-400">
                    Confirm Password
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setEditSection(null)} disabled={saving.delete}
                    className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving.delete}
                    className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {saving.delete ? <><BtnSpinner />Deleting…</> : "Delete My Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Profile;