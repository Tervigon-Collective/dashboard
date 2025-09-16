// "use client";
// import { useState, useEffect } from "react";
// import { Icon } from "@iconify/react/dist/iconify.js";
// import Link from "next/link";
// import { useUser } from "@/helper/UserContext";
// import { useRole } from "@/hook/useRole";
// import {
//   getAllUsers,
//   setUserRole,
//   getValidRoles,
//   getRoleDisplayName,
//   isValidRole,
// } from "@/utils/firebaseRoleManager";
// import config from "@/config";

// const AssignRoleLayer = () => {
//   const { user, token } = useUser();
//   const { hasRole } = useRole();
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedRole, setSelectedRole] = useState("all");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [statusFilter, setStatusFilter] = useState("all");
//   const [updating, setUpdating] = useState(false);
//   const [message, setMessage] = useState({ type: "", text: "" });
//   const [itemsPerPage, setItemsPerPage] = useState(10);
//   const [currentPage, setCurrentPage] = useState(1);
//   const validRoles = getValidRoles();

//   useEffect(() => {
//     loadUsers();
//   }, [selectedRole]);

//     useEffect(() => {
//       setCurrentPage(1);
//     }, [searchTerm, selectedRole, statusFilter, itemsPerPage]);

//   const loadUsers = async () => {
//     setLoading(true);
//     try {
//       // Fetch users from backend API
//       const response = await fetch(`${config.api.baseURL}/api/users`, {
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       });

//       if (response.ok) {
//         const data = await response.json();
//         setUsers(data.users || []);
//       } else {
//         console.error("Failed to load users");
//         setMessage({ type: "error", text: "Failed to load users" });
//       }
//     } catch (error) {
//       console.error("Error loading users:", error);
//       setMessage({ type: "error", text: "Failed to load users" });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleRoleAssignment = async (userId, newRole) => {
//     if (!hasRole("super_admin") && !hasRole("admin")) {
//       setMessage({
//         type: "error",
//         text: "You do not have permission to assign roles",
//       });
//       return;
//     }

//     if (!isValidRole(newRole)) {
//       setMessage({ type: "error", text: "Invalid role selected" });
//       return;
//     }

//     setUpdating(true);
//     try {
//       const response = await fetch(
//         `${config.api.baseURL}/api/users/${userId}/role`,
//         {
//           method: "PUT",
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({ role: newRole }),
//         }
//       );

//       if (response.ok) {
//         setMessage({
//           type: "success",
//           text: `Role updated to ${getRoleDisplayName(newRole)}`,
//         });
//         loadUsers(); // Reload users
//       } else {
//         const errorData = await response.json();
//         setMessage({
//           type: "error",
//           text: errorData.message || "Failed to update role",
//         });
//       }
//     } catch (error) {
//       console.error("Error updating role:", error);
//       setMessage({ type: "error", text: "Failed to update role" });
//     } finally {
//       setUpdating(false);
//     }
//   };

//   const filteredUsers = users.filter((user) => {
//     const matchesSearch =
//       user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       user.email?.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesRole = selectedRole === "all" || user.role === selectedRole;
//     const matchesStatus =
//       statusFilter === "all" || user.status === statusFilter;

//     return matchesSearch && matchesRole && matchesStatus;
//   });

//   const indexOfLast = currentPage * itemsPerPage;
//   const indexOfFirst = indexOfLast - itemsPerPage;
//   const currentUsers = filteredUsers.slice(indexOfFirst, indexOfLast);

//   const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

//   const canManageRoles = hasRole("super_admin") || hasRole("admin");

//   if (!user) {
//     return (
//       <div className="alert alert-warning">
//         <Icon icon="mdi:alert-circle" className="me-2" />
//         Please sign in to manage user roles.
//       </div>
//     );
//   }

//   if (!canManageRoles) {
//     return (
//       <div className="alert alert-danger">
//         <Icon icon="mdi:shield-alert" className="me-2" />
//         You do not have permission to manage user roles.
//       </div>
//     );
//   }

//   return (
//     <div className="card h-100 p-0 radius-12">
//       <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
//         <div className="d-flex align-items-center flex-wrap gap-3">
//           <span className="text-md fw-medium text-secondary-light mb-0">
//             Show
//           </span>
//           <select
//             className="form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px"
//             defaultValue="10"
//           >
//             <option value="5">5</option>
//             <option value="10">10</option>
//             <option value="25">25</option>
//             <option value="50">50</option>
//           </select>
//           <form className="navbar-search">
//             <input
//               type="text"
//               className="bg-base h-40-px w-auto"
//               name="search"
//               placeholder="Search users..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//             />
//             <Icon icon="ion:search-outline" className="icon" />
//           </form>
//           <select
//             className="form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px"
//             value={selectedRole}
//             onChange={(e) => setSelectedRole(e.target.value)}
//           >
//             <option value="all">All Roles</option>
//             {validRoles.map((role) => (
//               <option key={role} value={role}>
//                 {getRoleDisplayName(role)}
//               </option>
//             ))}
//           </select>
//           <select
//             className="form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px"
//             value={statusFilter}
//             onChange={(e) => setStatusFilter(e.target.value)}
//           >
//             <option value="all">All Status</option>
//             <option value="active">Active</option>
//             <option value="inactive">Inactive</option>
//           </select>
//         </div>
//         <button
//           type="button"
//           className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
//           onClick={loadUsers}
//           disabled={loading}
//         >
//           <Icon icon="mdi:refresh" className="icon text-xl line-height-1" />
//           {loading ? "Loading..." : "Refresh"}
//         </button>
//       </div>

//       {/* Message Display */}
//       {message.text && (
//         <div
//           className={`alert alert-${
//             message.type === "success" ? "success" : "danger"
//           } m-3`}
//         >
//           <Icon
//             icon={
//               message.type === "success"
//                 ? "mdi:check-circle"
//                 : "mdi:alert-circle"
//             }
//             className="me-2"
//           />
//           {message.text}
//         </div>
//       )}

//       <div className="card-body p-24">
//         {loading ? (
//           <div className="text-center py-4">
//             <div className="spinner-border" role="status">
//               <span className="visually-hidden">Loading...</span>
//             </div>
//           </div>
//         ) : (
//           <div className="table-responsive scroll-sm">
//             <table className="table bordered-table sm-table mb-0">
//               <thead>
//                 <tr>
//                   <th scope="col">
//                     <div className="d-flex align-items-center gap-10">
//                       <div className="form-check style-check d-flex align-items-center">
//                         <input
//                           className="form-check-input radius-4 border input-form-dark"
//                           type="checkbox"
//                           name="checkbox"
//                           id="selectAll"
//                         />
//                       </div>
//                       S.L
//                     </div>
//                   </th>
//                   <th scope="col">Username</th>
//                   <th scope="col" className="text-center">
//                     Role Permission
//                   </th>
//                   <th scope="col" className="text-center">
//                     Status
//                   </th>
//                   <th scope="col" className="text-center">
//                     Action
//                   </th>
//                 </tr>
//               </thead>
//                           <tbody>
//                 {currentUsers.map((userData, index) => ( // Changed: Use currentUsers
//                   <tr key={userData.uid}>
//                 <td>
//                   <div className='d-flex align-items-center gap-10'>
//                     <div className='form-check style-check d-flex align-items-center'>
//                       <input
//                         className='form-check-input radius-4 border border-neutral-400'
//                         type='checkbox'
//                         name='checkbox'
//                       />
//                     </div>
//                         {String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, '0')} {/* Updated S.L based on page */}
//                   </div>
//                 </td>
//                 <td>
//                   <div className='d-flex align-items-center'>
//                     <img
//                           src={userData.photoURL || '/assets/images/make/dashborad-03.jpg'}
//                       alt=''
//                       className='w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden'
//                     />
//                     <div className='flex-grow-1'>
//                       <span className='text-md mb-0 fw-normal text-secondary-light'>
//                             {userData.displayName || userData.email}
//                       </span>
//                           <br />
//                           <small className='text-muted'>{userData.email}</small>
//                     </div>
//                   </div>
//                 </td>
//                 <td className='text-center'>
//                       <span className={`badge ${
//                         userData.role === 'super_admin' ? 'bg-danger' :
//                         userData.role === 'admin' ? 'bg-warning' :
//                         userData.role === 'manager' ? 'bg-info' :
//                         'bg-secondary'
//                       }`}>
//                         {getRoleDisplayName(userData.role || 'user')}
//                       </span>
//                 </td>
//                 <td className='text-center'>
//                       <span className={`badge ${
//                         userData.status === 'active' ? 'bg-success' : 'bg-danger'
//                       }`}>
//                         {userData.status || 'active'}
//                       </span>
//                 </td>
//                 <td className='text-center'>
//                   <div className='dropdown'>
//                     <button
//                       className='btn btn-outline-primary-600 not-active px-18 py-11 dropdown-toggle toggle-icon'
//                       type='button'
//                       data-bs-toggle='dropdown'
//                       aria-expanded='false'
//                           disabled={updating}
//                         >
//                           {updating ? 'Updating...' : 'Assign Role'}
//                     </button>
//                         <ul className='dropdown-menu'>
//                           {validRoles.map(role => (
//                             <li key={role}>
//                     <button
//                           className='dropdown-item px-16 py-8 rounded text-secondary-light bg-hover-neutral-200 text-hover-neutral-900'
//                                 onClick={() => handleRoleAssignment(userData.uid, role)}
//                                 disabled={userData.role === role}
//                               >
//                                 {getRoleDisplayName(role)}
//                                 {userData.role === role && (
//                                   <Icon icon="mdi:check" className="ms-2 text-success" />
//                                 )}
//                     </button>
//                       </li>
//                           ))}
//                     </ul>
//                   </div>
//                 </td>
//               </tr>
//                 ))}
//             </tbody>
//             </table>
//           </div>
//         )}

//         {!loading && filteredUsers.length === 0 && (
//           <div className="text-center py-4">
//             <Icon
//               icon="mdi:account-off"
//               className="text-muted"
//               style={{ fontSize: "3rem" }}
//             />
//             <p className="text-muted mt-2">
//               No users found matching your criteria.
//             </p>
//           </div>
//         )}

//          <div className='d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24'>
//           <span>Showing {filteredUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {users.length} entries</span> {/* Updated Showing text */}
//           <ul className='pagination d-flex flex-wrap align-items-center gap-2 justify-content-center'>
//             <li className='page-item'>
//               <button
//                 className='page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md'
//                 onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
//                 disabled={currentPage === 1}
//               >
//                 <Icon icon='ep:d-arrow-left' className='' />
//               </button>
//             </li>
//             {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
//               <li className='page-item' key={num}>
//                 <button
//                   className={`page-link fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md ${currentPage === num ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-secondary-light'}`}
//                   onClick={() => setCurrentPage(num)}
//                 >
//                   {num}
//                 </button>
//               </li>
//             ))}
//             <li className='page-item'>
//               <button
//                 className='page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md'
//                 onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
//                 disabled={currentPage === totalPages}
//               >
//                 <Icon icon='ep:d-arrow-right' className='' />
//               </button>
//             </li>
//           </ul>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AssignRoleLayer;

"use client";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { useUser } from "@/helper/UserContext";
import { useRole } from "@/hook/useRole";
import {
  getAllUsers,
  setUserRole,
  getValidRoles,
  getRoleDisplayName,
  isValidRole,
} from "@/utils/firebaseRoleManager";
import config from "@/config";

const AssignRoleLayer = () => {
  const { user, token } = useUser();
  const { hasRole } = useRole();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const validRoles = getValidRoles();

  useEffect(() => {
    loadUsers();
  }, [token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRole, statusFilter, itemsPerPage]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.api.baseURL}/api/users`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Fetched users:", data.users); // Debug: Log raw API response
        setUsers(data.users || []);
      } else {
        console.error("Failed to load users");
        setMessage({ type: "error", text: "Failed to load users" });
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setMessage({ type: "error", text: "Failed to load users" });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleAssignment = async (userId, newRole) => {
    if (!hasRole("super_admin") && !hasRole("admin")) {
      setMessage({
        type: "error",
        text: "You do not have permission to assign roles",
      });
      return;
    }

    if (!isValidRole(newRole)) {
      setMessage({ type: "error", text: "Invalid role selected" });
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(
        `${config.api.baseURL}/api/users/${userId}/role`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (response.ok) {
        setMessage({
          type: "success",
          text: `Role updated to ${getRoleDisplayName(newRole)}`,
        });
        loadUsers();
      } else {
        const errorData = await response.json();
        setMessage({
          type: "error",
          text: errorData.message || "Failed to update role",
        });
      }
    } catch (error) {
      console.error("Error updating role:", error);
      setMessage({ type: "error", text: "Failed to update role" });
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.name || user.username || user.email || "")
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (user.email || "")?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole =
      selectedRole === "all" || (user.role || "none") === selectedRole;
    const matchesStatus =
      statusFilter === "all" || (user.status || "active") === statusFilter;

    const passesFilter = matchesSearch && matchesRole && matchesStatus;
    if (!passesFilter) {
      console.log("Filtered out user:", user); // Debug: Log users that don't pass filter
    }
    return passesFilter;
  });

  console.log("Filtered users:", filteredUsers.length, filteredUsers); // Debug: Log filtered users

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const canManageRoles = hasRole("super_admin") || hasRole("admin");

  if (!user) {
    return (
      <div className="alert alert-warning">
        <Icon icon="mdi:alert-circle" className="me-2" />
        Please sign in to manage user roles.
      </div>
    );
  }

  if (!canManageRoles) {
    return (
      <div className="alert alert-danger">
        <Icon icon="mdi:shield-alert" className="me-2" />
        You do not have permission to manage user roles.
      </div>
    );
  }

  return (
    <div className="card h-100 p-0 radius-12">
      <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
        <div className="d-flex align-items-center flex-wrap gap-3">
          <span className="text-md fw-medium text-secondary-light mb-0">
            Show
          </span>
          <select
            className="form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px"
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
          <form className="navbar-search">
            <input
              type="text"
              className="bg-base h-40-px w-auto"
              name="search"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Icon icon="ion:search-outline" className="icon" />
          </form>
          <select
            className="form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="none">None</option>{" "}
            {/* Added to include role: "none" */}
            {validRoles.map((role) => (
              <option key={role} value={role}>
                {getRoleDisplayName(role)}
              </option>
            ))}
          </select>
          <select
            className="form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button
          type="button"
          className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
          onClick={loadUsers}
          disabled={loading}
        >
          <Icon icon="mdi:refresh" className="icon text-xl line-height-1" />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {message.text && (
        <div
          className={`alert alert-${
            message.type === "success" ? "success" : "danger"
          } m-3`}
        >
          <Icon
            icon={
              message.type === "success"
                ? "mdi:check-circle"
                : "mdi:alert-circle"
            }
            className="me-2"
          />
          {message.text}
        </div>
      )}

      <div className="card-body p-24">
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="table-responsive scroll-sm">
            <table className="table bordered-table sm-table mb-0">
              <thead>
                <tr>
                  <th scope="col">
                    <div className="d-flex align-items-center gap-10">
                      <div className="form-check style-check d-flex align-items-center">
                        <input
                          className="form-check-input radius-4 border input-form-dark"
                          type="checkbox"
                          name="checkbox"
                          id="selectAll"
                        />
                      </div>
                      S.L
                    </div>
                  </th>
                  <th scope="col">Username</th>
                  <th scope="col" className="text-center">
                    Role Permission
                  </th>
                  <th scope="col" className="text-center">
                    Status
                  </th>
                  <th scope="col" className="text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((userData, index) => (
                  <tr key={userData.uid}>
                    <td>
                      <div className="d-flex align-items-center gap-10">
                        <div className="form-check style-check d-flex align-items-center">
                          <input
                            className="form-check-input radius-4 border border-neutral-400"
                            type="checkbox"
                            name="checkbox"
                          />
                        </div>
                        {String(
                          (currentPage - 1) * itemsPerPage + index + 1
                        ).padStart(2, "0")}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <img
                          src={
                            userData.photoURL ||
                            "/assets/images/make/dashborad-03.jpg"
                          }
                          alt=""
                          className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                        />
                        <div className="flex-grow-1">
                          <span className="text-md mb-0 fw-normal text-secondary-light">
                            {userData.displayName ||
                              userData.username ||
                              userData.email}
                          </span>
                          <br />
                          <small className="text-muted">{userData.email}</small>
                        </div>
                      </div>
                    </td>
                    <td className="text-center">
                      <span
                        className={`badge ${
                          userData.role === "super_admin"
                            ? "bg-danger"
                            : userData.role === "admin"
                            ? "bg-warning"
                            : userData.role === "manager"
                            ? "bg-info"
                            : userData.role === "none"
                            ? "bg-dark"
                            : "bg-secondary"
                        }`}
                      >
                        {getRoleDisplayName(userData.role || "none")}
                      </span>
                    </td>
                    <td className="text-center">
                      <span
                        className={`badge ${
                          (userData.status || "active") === "active"
                            ? "bg-success"
                            : "bg-danger"
                        }`}
                      >
                        {userData.status || "active"}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="dropdown">
                        <button
                          className="btn btn-outline-primary-600 not-active px-18 py-11 dropdown-toggle toggle-icon"
                          type="button"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                          disabled={updating}
                        >
                          {updating ? "Updating..." : "Assign Role"}
                        </button>
                        <ul className="dropdown-menu">
                          {validRoles.map((role) => (
                            <li key={role}>
                              <button
                                className="dropdown-item px-16 py-8 rounded text-secondary-light bg-hover-neutral-200 text-hover-neutral-900"
                                onClick={() =>
                                  handleRoleAssignment(userData.uid, role)
                                }
                                disabled={userData.role === role}
                              >
                                {getRoleDisplayName(role)}
                                {userData.role === role && (
                                  <Icon
                                    icon="mdi:check"
                                    className="ms-2 text-success"
                                  />
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && currentUsers.length === 0 && (
          <div className="text-center py-4">
            <Icon
              icon="mdi:account-off"
              className="text-muted"
              style={{ fontSize: "3rem" }}
            />
            <p className="text-muted mt-2">
              No users found matching your criteria.
            </p>
          </div>
        )}

        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
          <span>
            Showing{" "}
            {currentUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}{" "}
            to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of{" "}
            {filteredUsers.length} entries
          </span>
          <ul className="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
            <li className="page-item">
              <button
                className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <Icon icon="ep:d-arrow-left" />
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <li className="page-item" key={num}>
                <button
                  className={`page-link fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md ${
                    currentPage === num
                      ? "bg-primary-600 text-white"
                      : "bg-neutral-200 text-secondary-light"
                  }`}
                  onClick={() => setCurrentPage(num)}
                >
                  {num}
                </button>
              </li>
            ))}
            <li className="page-item">
              <button
                className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                <Icon icon="ep:d-arrow-right" />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AssignRoleLayer;
