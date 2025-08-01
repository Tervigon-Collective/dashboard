"use client";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useState, useEffect, useRef } from "react";
import { useUser } from "@/helper/UserContext";
import { db } from "@/helper/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updatePassword } from "firebase/auth";

const ViewProfileLayer = () => {
  const { user } = useUser();
  const [imagePreview, setImagePreview] = useState(
    "assets/images/make/dashborad-05.jpg"
  );
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false); // for fetching profile
  const [saving, setSaving] = useState(false); // for saving profile
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    language: "",
    description: "",
  });
  const [success, setSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);
  const lastSaved = useRef(form);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fetchProfile = async () => {
      const ref = doc(db, "profiles", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setProfile(snap.data());
        setForm({
          name: snap.data().name || "",
          email: snap.data().email || "",
          phone: snap.data().phone || "",
          department: snap.data().department || "",
          designation: snap.data().designation || "",
          language: snap.data().language || "",
          description: snap.data().description || "",
        });
        lastSaved.current = {
          name: snap.data().name || "",
          email: snap.data().email || "",
          phone: snap.data().phone || "",
          department: snap.data().department || "",
          designation: snap.data().designation || "",
          language: snap.data().language || "",
          description: snap.data().description || "",
        };
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        department: profile.department || "",
        designation: profile.designation || "",
        language: profile.language || "",
        description: profile.description || "",
      });
      lastSaved.current = {
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        department: profile.department || "",
        designation: profile.designation || "",
        language: profile.language || "",
        description: profile.description || "",
      };
    }
  }, [profile]);

  useEffect(() => {
    // Check if form is different from last saved
    setDirty(
      JSON.stringify(form) !== JSON.stringify(lastSaved.current)
    );
  }, [form]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.id]: e.target.value });
    setSuccess(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const ref = doc(db, "profiles", user.uid);
    await setDoc(ref, {
      ...form,
      email: user.email, // always use auth email
    });
    setProfile({ ...form, email: user.email });
    lastSaved.current = { ...form, email: user.email };
    setSaving(false);
    setSuccess(true);
    setDirty(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (!newPassword || !confirmPassword) {
      setPasswordError("Please fill out both fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      await updatePassword(user, newPassword);
      setPasswordSuccess("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  // Toggle function for password field
  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  // Toggle function for confirm password field
  const toggleConfirmPasswordVisibility = () => {
    setConfirmPasswordVisible(!confirmPasswordVisible);
  };

  const readURL = (input) => {
    if (input.target.files && input.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        setUploadedImage(e.target.result);
      };
      reader.readAsDataURL(input.target.files[0]);
    }
  };
  return (
    <div className='row gy-4'>
      <div className='col-lg-4'>
        <div className='user-grid-card position-relative border radius-16 overflow-hidden bg-base h-100'>
          <img
                            src='assets/images/make/dashborad-02.jpg'
            alt=''
            className='w-100 object-fit-cover'
          />
          <div className='pb-24 ms-16 mb-24 me-16  mt--100'>
            <div className='text-center border border-top-0 border-start-0 border-end-0'>
              {user && (user.photoURL || uploadedImage) && (
                <img
                  src={uploadedImage ? uploadedImage : user.photoURL}
                  alt=""
                  className="border br-white border-width-2-px w-200-px h-200-px rounded-circle object-fit-cover"
                />
              )}
              {!user?.photoURL && !uploadedImage && (
                <img
                  src="assets/images/make/dashborad-03.jpg"
                  alt=""
                  className="border br-white border-width-2-px w-200-px h-200-px rounded-circle object-fit-cover"
                />
              )}
              <h6 className='mb-0 mt-16'>{user ? (user.displayName || user.email) : "-"}</h6>
              <span className='text-secondary-light mb-16'>
                {user ? user.email : "-"}
              </span>
            </div>
            <div className='mt-24'>
              <h6 className='text-xl mb-16'>Personal Info</h6>
              <ul>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>Full Name</span>
                  <span className='w-70 text-secondary-light fw-medium'>: {profile ? profile.name : user ? (user.displayName || user.email) : "-"}</span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>Email</span>
                  <span className='w-70 text-secondary-light fw-medium'>: {profile ? profile.email : user ? user.email : "-"}</span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>Phone Number</span>
                  <span className='w-70 text-secondary-light fw-medium'>: {profile ? profile.phone : "-"}</span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>Department</span>
                  <span className='w-70 text-secondary-light fw-medium'>: {profile ? profile.department : "-"}</span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>Designation</span>
                  <span className='w-70 text-secondary-light fw-medium'>: {profile ? profile.designation : "-"}</span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>Languages</span>
                  <span className='w-70 text-secondary-light fw-medium'>: {profile ? profile.language : "-"}</span>
                </li>
                <li className='d-flex align-items-center gap-1'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>Bio</span>
                  <span className='w-70 text-secondary-light fw-medium'>: {profile ? profile.description : "-"}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className='col-lg-8'>
        <div className='card h-100'>
          <div className='card-body p-24'>
            <ul
              className='nav border-gradient-tab nav-pills mb-20 d-inline-flex'
              id='pills-tab'
              role='tablist'
            >
              <li className='nav-item' role='presentation'>
                <button
                  className='nav-link d-flex align-items-center px-24 active'
                  id='pills-edit-profile-tab'
                  data-bs-toggle='pill'
                  data-bs-target='#pills-edit-profile'
                  type='button'
                  role='tab'
                  aria-controls='pills-edit-profile'
                  aria-selected='true'
                >
                  Edit Profile
                </button>
              </li>
              <li className='nav-item' role='presentation'>
                <button
                  className='nav-link d-flex align-items-center px-24'
                  id='pills-change-passwork-tab'
                  data-bs-toggle='pill'
                  data-bs-target='#pills-change-passwork'
                  type='button'
                  role='tab'
                  aria-controls='pills-change-passwork'
                  aria-selected='false'
                  tabIndex={-1}
                >
                  Change Password
                </button>
              </li>
              <li className='nav-item' role='presentation'>
                <button
                  className='nav-link d-flex align-items-center px-24'
                  id='pills-notification-tab'
                  data-bs-toggle='pill'
                  data-bs-target='#pills-notification'
                  type='button'
                  role='tab'
                  aria-controls='pills-notification'
                  aria-selected='false'
                  tabIndex={-1}
                >
                  Notification Settings
                </button>
              </li>
            </ul>
            <div className='tab-content' id='pills-tabContent'>
              <div
                className='tab-pane fade show active'
                id='pills-edit-profile'
                role='tabpanel'
                aria-labelledby='pills-edit-profile-tab'
                tabIndex={0}
              >
                <h6 className='text-md text-primary-light mb-16'>
                  Profile Image
                </h6>
                {/* Upload Image Start */}
                <div className='mb-24 mt-16'>
                  <div className='avatar-upload'>
                    <div className='avatar-edit position-absolute bottom-0 end-0 me-24 mt-16 z-1 cursor-pointer'>
                      <input
                        type='file'
                        id='imageUpload'
                        accept='.png, .jpg, .jpeg'
                        hidden
                        onChange={readURL}
                      />
                      <label
                        htmlFor='imageUpload'
                        className='w-32-px h-32-px d-flex justify-content-center align-items-center bg-primary-50 text-primary-600 border border-primary-600 bg-hover-primary-100 text-lg rounded-circle'
                      >
                        <Icon
                          icon='solar:camera-outline'
                          className='icon'
                        ></Icon>
                      </label>
                    </div>
                    <div className='avatar-preview'>
                      <div
                        id='imagePreview'
                        style={{
                          backgroundImage: `url(${imagePreview})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
                    </div>
                  </div>
                </div>
                {/* Upload Image End */}
                <form action="#" onSubmit={e => { e.preventDefault(); handleSave(); }}>
                  <div className='row'>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label htmlFor='name' className='form-label fw-semibold text-primary-light text-sm mb-8'>
                          Full Name<span className='text-danger-600'>*</span>
                        </label>
                        <input type='text' className='form-control radius-8' id='name' placeholder='Enter Full Name' value={form.name} onChange={handleChange} />
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label htmlFor='email' className='form-label fw-semibold text-primary-light text-sm mb-8'>
                          Email <span className='text-danger-600'>*</span>
                        </label>
                        <input type='email' className='form-control radius-8' id='email' placeholder='Enter email address' value={user?.email || form.email} disabled />
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label htmlFor='phone' className='form-label fw-semibold text-primary-light text-sm mb-8'>
                          Phone
                        </label>
                        <input type='text' className='form-control radius-8' id='phone' placeholder='Enter phone number' value={form.phone} onChange={handleChange} />
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label htmlFor='department' className='form-label fw-semibold text-primary-light text-sm mb-8'>
                          Department<span className='text-danger-600'>*</span>{' '}
                        </label>
                        <input type='text' className='form-control radius-8' id='department' placeholder='Enter department' value={form.department} onChange={handleChange} />
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label htmlFor='designation' className='form-label fw-semibold text-primary-light text-sm mb-8'>
                          Designation<span className='text-danger-600'>*</span>{' '}
                        </label>
                        <input type='text' className='form-control radius-8' id='designation' placeholder='Enter designation' value={form.designation} onChange={handleChange} />
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label htmlFor='language' className='form-label fw-semibold text-primary-light text-sm mb-8'>
                          Language<span className='text-danger-600'>*</span>{' '}
                        </label>
                        <input type='text' className='form-control radius-8' id='language' placeholder='Enter language' value={form.language} onChange={handleChange} />
                      </div>
                    </div>
                    <div className='col-sm-12'>
                      <div className='mb-20'>
                        <label htmlFor='description' className='form-label fw-semibold text-primary-light text-sm mb-8'>
                          Description
                        </label>
                        <textarea name='#0' className='form-control radius-8' id='description' placeholder='Write description...' value={form.description} onChange={handleChange} />
                      </div>
                    </div>
                  </div>
                  <div className='d-flex align-items-center justify-content-center gap-3'>
                    <button type='button' className='border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-56 py-11 radius-8'>
                      Cancel
                    </button>
                    <button type='submit' className='btn btn-primary border border-primary-600 text-md px-56 py-12 radius-8' disabled={saving || !dirty}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  {success && (
                    <div className="alert alert-success mt-3">Profile saved successfully!</div>
                  )}
                </form>

              </div>
              <div
                className='tab-pane fade'
                id='pills-change-passwork'
                role='tabpanel'
                aria-labelledby='pills-change-passwork-tab'
                tabIndex='0'
              >
                <form onSubmit={handleChangePassword}>
                  <div className='mb-20'>
                    <label htmlFor='your-password' className='form-label fw-semibold text-primary-light text-sm mb-8'>
                      New Password <span className='text-danger-600'>*</span>
                    </label>
                    <div className='position-relative'>
                      <input
                        type={passwordVisible ? "text" : "password"}
                        className='form-control radius-8'
                        id='your-password'
                        placeholder='Enter New Password*'
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                      />
                      <span
                        className={`toggle-password ${passwordVisible ? "ri-eye-off-line" : "ri-eye-line"} cursor-pointer position-absolute end-0 top-50 translate-middle-y me-16 text-secondary-light`}
                        onClick={togglePasswordVisibility}
                      ></span>
                    </div>
                  </div>
                  <div className='mb-20'>
                    <label htmlFor='confirm-password' className='form-label fw-semibold text-primary-light text-sm mb-8'>
                      Confirm Password <span className='text-danger-600'>*</span>
                    </label>
                    <div className='position-relative'>
                      <input
                        type={confirmPasswordVisible ? "text" : "password"}
                        className='form-control radius-8'
                        id='confirm-password'
                        placeholder='Confirm Password*'
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                      />
                      <span
                        className={`toggle-password ${confirmPasswordVisible ? "ri-eye-off-line" : "ri-eye-line"} cursor-pointer position-absolute end-0 top-50 translate-middle-y me-16 text-secondary-light`}
                        onClick={toggleConfirmPasswordVisibility}
                      ></span>
                    </div>
                  </div>
                  {passwordError && <div className='alert alert-danger'>{passwordError}</div>}
                  {passwordSuccess && <div className='alert alert-success'>{passwordSuccess}</div>}
                  <button
                    type='submit'
                    className='btn btn-primary border border-primary-600 text-md px-56 py-12 radius-8'
                    disabled={passwordSaving || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  >
                    {passwordSaving ? 'Saving...' : 'Save'}
                  </button>
                </form>
              </div>
              <div
                className='tab-pane fade'
                id='pills-notification'
                role='tabpanel'
                aria-labelledby='pills-notification-tab'
                tabIndex={0}
              >
                <div className='form-switch switch-primary py-12 px-16 border radius-8 position-relative mb-16'>
                  <label
                    htmlFor='companzNew'
                    className='position-absolute w-100 h-100 start-0 top-0'
                  />
                  <div className='d-flex align-items-center gap-3 justify-content-between'>
                    <span className='form-check-label line-height-1 fw-medium text-secondary-light'>
                      Company News
                    </span>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      role='switch'
                      id='companzNew'
                    />
                  </div>
                </div>
                <div className='form-switch switch-primary py-12 px-16 border radius-8 position-relative mb-16'>
                  <label
                    htmlFor='pushNotifcation'
                    className='position-absolute w-100 h-100 start-0 top-0'
                  />
                  <div className='d-flex align-items-center gap-3 justify-content-between'>
                    <span className='form-check-label line-height-1 fw-medium text-secondary-light'>
                      Push Notification
                    </span>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      role='switch'
                      id='pushNotifcation'
                      defaultChecked=''
                    />
                  </div>
                </div>
                <div className='form-switch switch-primary py-12 px-16 border radius-8 position-relative mb-16'>
                  <label
                    htmlFor='weeklyLetters'
                    className='position-absolute w-100 h-100 start-0 top-0'
                  />
                  <div className='d-flex align-items-center gap-3 justify-content-between'>
                    <span className='form-check-label line-height-1 fw-medium text-secondary-light'>
                      Weekly News Letters
                    </span>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      role='switch'
                      id='weeklyLetters'
                      defaultChecked=''
                    />
                  </div>
                </div>
                <div className='form-switch switch-primary py-12 px-16 border radius-8 position-relative mb-16'>
                  <label
                    htmlFor='meetUp'
                    className='position-absolute w-100 h-100 start-0 top-0'
                  />
                  <div className='d-flex align-items-center gap-3 justify-content-between'>
                    <span className='form-check-label line-height-1 fw-medium text-secondary-light'>
                      Meetups Near you
                    </span>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      role='switch'
                      id='meetUp'
                    />
                  </div>
                </div>
                <div className='form-switch switch-primary py-12 px-16 border radius-8 position-relative mb-16'>
                  <label
                    htmlFor='orderNotification'
                    className='position-absolute w-100 h-100 start-0 top-0'
                  />
                  <div className='d-flex align-items-center gap-3 justify-content-between'>
                    <span className='form-check-label line-height-1 fw-medium text-secondary-light'>
                      Orders Notifications
                    </span>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      role='switch'
                      id='orderNotification'
                      defaultChecked=''
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProfileLayer;
