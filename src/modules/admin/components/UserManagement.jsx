import { useCallback, useEffect, useMemo, useState } from "react";
import useDebounce from "../../../shared/hooks/useDebounce";
import { Edit, Eye, EyeOff, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "../../../shared/services/apiClient";
import Pagination from "../../../shared/components/Pagination";
import ConfirmModal from "../../../shared/components/ConfirmModal";

const emptyFormData = {
  name: "",
  email: "",
  phone: "",
  roleId: "",
  password: "",
  address: "",
  enable: true,
};

const normalizeRoleName = (roleName) => {
  if (!roleName) {
    return "unknown";
  }

  const normalized = roleName.trim().toLowerCase();
  if (normalized === "supervision") {
    return "supervisor";
  }

  return normalized;
};

const formatRoleName = (roleName) => {
  const normalized = normalizeRoleName(roleName);
  if (normalized === "unknown") {
    return "Unknown";
  }

  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
};

const getStatusLabel = (enabled) => (enabled ? "active" : "inactive");

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  let s = dateStr;
  if (typeof s !== "string") {
    try {
      s = new Date(s).toISOString();
    } catch {
      return "—";
    }
  }
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}-${month}-${year}`;
  }
  return "—";
};

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [formErrors, setFormErrors] = useState({});
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [overallAdminCount, setOverallAdminCount] = useState(0);
  const [overallSupervisorCount, setOverallSupervisorCount] = useState(0);
  const pageSize = 10;

  const roleLookup = useMemo(() => {
    return roles.reduce((accumulator, role) => {
      accumulator[role.id] = role;
      return accumulator;
    }, {});
  }, [roles]);

  const loadUsers = useCallback(async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) {
      setIsLoading(true);
    }
    setLoadError(null);

    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoadError("Missing authentication token. Please log in again.");
      setIsLoading(false);
      return;
    }

    try {
      const trimmedSearch = debouncedSearch.trim();
      const response = await apiClient.post(
        "/graphql",
        {
          query:
            "query GetUsersAndRoles($pageNumber: Int!, $pageSize: Int!, $search: String) { usersPage(pageNumber: $pageNumber, pageSize: $pageSize, search: $search) { items { id mobileNumber name roleId address email password enable createdOn createdBy modifiedOn modifiedBy } totalCount pageNumber pageSize totalPages } roles { id roleName enable } allUsers: users { id name mobileNumber email roleId enable } }",
          variables: {
            pageNumber,
            pageSize,
            search: trimmedSearch ? trimmedSearch : null,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response?.data?.errors?.length) {
        const apiMessage =
          response.data.errors[0]?.message || "Unable to load users.";
        setLoadError(apiMessage);
        return;
      }

      const apiRoles = response?.data?.data?.roles || [];
      const userPage = response?.data?.data?.usersPage;
      const apiUsers = userPage?.items || [];
      const nextRoleLookup = apiRoles.reduce((accumulator, role) => {
        accumulator[role.id] = role;
        return accumulator;
      }, {});

      const normalizedUsers = apiUsers.map((user) => {
        const resolvedRole = nextRoleLookup[user.roleId];
        return {
          id: String(user.id),
          name: user.name || "Unknown",
          email: user.email || "",
          phone: user.mobileNumber || "",
          roleId: Number(user.roleId),
          roleName: resolvedRole?.roleName || "",
          address: user.address || "",
          password: user.password || "",
          enable: Boolean(user.enable),
          createdOn: user.createdOn,
          createdBy: user.createdBy,
          modifiedOn: user.modifiedOn,
          modifiedBy: user.modifiedBy,
        };
      });

      setRoles(apiRoles);
      setUsers(normalizedUsers);
      setTotalCount(userPage?.totalCount || 0);

      if (response?.data?.data?.allUsers) {
        const allU = response.data.data.allUsers;
        
        let activeSupervisors = 0;
        let inactiveSupervisors = 0;
        
        allU.forEach(u => {
          const roleName = nextRoleLookup[u.roleId]?.roleName || "";
          const normName = normalizeRoleName(roleName);
          if (normName === "supervisor") {
            if (u.enable) {
              activeSupervisors++;
            } else {
              inactiveSupervisors++;
            }
          }
        });
        
        setOverallSupervisorCount(activeSupervisors);
        setOverallAdminCount(inactiveSupervisors);
      }
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to load users.";
      setLoadError(apiMessage);
    } finally {
      setIsLoading(false);
    }
  }, [pageNumber, pageSize, debouncedSearch]);

  // Reset to page 1 whenever the debounced search term changes
  useEffect(() => {
    setPageNumber(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const getActorName = () => {
    const storedUser = localStorage.getItem("authUser");
    if (!storedUser) {
      return "system";
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      return parsedUser?.name || "system";
    } catch {
      return "system";
    }
  };

  const getCurrentUserMobile = () => {
    const storedUser = localStorage.getItem("authUser");
    if (!storedUser) return null;
    try {
      const parsedUser = JSON.parse(storedUser);
      return parsedUser?.mobileNumber || parsedUser?.mobile || null;
    } catch {
      return null;
    }
  };

  const currentUserMobile = getCurrentUserMobile();

  const normalizeApiUser = (user) => {
    const resolvedRole = roleLookup[user.roleId];
    return {
      id: String(user.id),
      name: user.name || "Unknown",
      email: user.email || "",
      phone: user.mobileNumber || "",
      roleId: Number(user.roleId),
      roleName: resolvedRole?.roleName || "",
      address: user.address || "",
      password: user.password || "",
      enable: Boolean(user.enable),
      createdOn: user.createdOn,
      createdBy: user.createdBy,
      modifiedOn: user.modifiedOn,
      modifiedBy: user.modifiedBy,
    };
  };

  const handleAddNew = () => {
    setEditingUser(null);
    setFormErrors({});
    setShowPassword(false);
    setFormData({
      ...emptyFormData,
      roleId: "",
      enable: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormErrors({});
    setShowPassword(false);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      roleId: String(user.roleId),
      password: user.password,
      address: user.address,
      enable: user.enable,
    });
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const trimmedName = formData.name.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPassword = formData.password.trim();
    const trimmedAddress = formData.address.trim();
    const errors = {};

    if (!trimmedName) {
      errors.name = "Full name is required.";
    }

    if (!trimmedPhone) {
      errors.phone = "Phone number is required.";
    } else if (!/^\d{10}$/.test(trimmedPhone)) {
      errors.phone = "Enter a valid 10-digit phone number.";
    }

    if (!formData.roleId) {
      errors.roleId = "Role is required.";
    }

    if (!trimmedAddress) {
      errors.address = "Address is required.";
    }

    if (!trimmedPassword) {
      errors.password = "Password is required.";
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = "Enter a valid email address.";
    }

    return {
      errors,
      values: {
        name: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail,
        password: trimmedPassword,
        address: trimmedAddress,
      },
    };
  };

  const submitMutation = async (query, input) => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Missing authentication token. Please log in again.");
    }

    const response = await apiClient.post(
      "/graphql",
      {
        query,
        variables: { input },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response?.data?.errors?.length) {
      const apiMessage =
        response.data.errors[0]?.message || "Unable to save user.";
      throw new Error(apiMessage);
    }

    return response?.data?.data?.createUser || response?.data?.data?.updateUser || response?.data?.data?.deleteUser;
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setIsSaving(true);
    try {
      await submitMutation(
        "mutation DeleteUser($input: DeleteUserInput!) { deleteUser(input: $input) { id } }",
        { id: Number(itemToDelete.id) }
      );
      toast.success("User deleted successfully.");
      await loadUsers(false);
    } catch (error) {
      toast.error(error?.message || "Unable to delete user.");
    } finally {
      setIsSaving(false);
      setItemToDelete(null);
    }
  };

  const handleSave = async () => {
    const { errors, values } = validateForm();

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fix the errors below.");
      return;
    }

    setFormErrors({});
    setIsSaving(true);

    try {
      const roleId = Number(formData.roleId);
      const actorName = getActorName();

      if (editingUser) {
        const updateInput = {
          id: Number(editingUser.id),
          mobileNumber: values.phone,
          name: values.name,
          roleId,
          address: values.address,
          email: values.email || null,
          enable: formData.enable,
          modifiedBy: actorName,
        };

        if (values.password) {
          updateInput.password = values.password;
        }

        const updatedUser = await submitMutation(
          "mutation UpdateUser($input: UpdateUserInput!) { updateUser(input: $input) { id mobileNumber name roleId address email enable createdOn createdBy modifiedOn modifiedBy } }",
          updateInput,
        );

        if (!updatedUser) {
          throw new Error("Update failed. Please try again.");
        }

        const normalizedUser = normalizeApiUser(updatedUser);
        setUsers((previous) =>
          previous.map((user) =>
            user.id === normalizedUser.id ? normalizedUser : user,
          ),
        );
        toast.success("User updated successfully.");
      } else {
        const createdUser = await submitMutation(
          "mutation CreateUser($input: CreateUserInput!) { createUser(input: $input) { id mobileNumber name roleId address email enable createdOn createdBy modifiedOn modifiedBy } }",
          {
            mobileNumber: values.phone,
            name: values.name,
            password: values.password,
            roleId,
            address: values.address,
            email: values.email || null,
            enable: formData.enable,
            createdBy: actorName,
          },
        );

        if (!createdUser) {
          throw new Error("Create failed. Please try again.");
        }

        const normalizedUser = normalizeApiUser(createdUser);
        setUsers((previous) => [...previous, normalizedUser]);
        toast.success("User created successfully.");
      }

      await loadUsers(false);

      setIsModalOpen(false);
      setEditingUser(null);
      setFormData(emptyFormData);
    } catch (error) {
      toast.error(error?.message || "Unable to save user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const actorName = getActorName();
      const nextEnabled = !user.enable;
      const updatedUser = await submitMutation(
        "mutation UpdateUser($input: UpdateUserInput!) { updateUser(input: $input) { id mobileNumber name roleId address email enable createdOn createdBy modifiedOn modifiedBy } }",
        {
          id: Number(user.id),
          mobileNumber: user.phone,
          name: user.name,
          roleId: user.roleId,
          address: user.address,
          email: user.email || null,
          enable: nextEnabled,
          modifiedBy: actorName,
        },
      );

      if (!updatedUser) {
        throw new Error("Status update failed. Please try again.");
      }

      const normalizedUser = normalizeApiUser(updatedUser);
      setUsers((previous) =>
        previous.map((item) =>
          item.id === normalizedUser.id ? normalizedUser : item,
        ),
      );
      toast.success(
        nextEnabled ? "User activated successfully." : "User deactivated.",
      );
      await loadUsers(false);
    } catch (error) {
      setLoadError(error?.message || "Unable to update user status.");
      toast.error(error?.message || "Unable to update user status.");
    } finally {
      setIsSaving(false);
    }
  };


  const renderFieldError = (message) =>
    message ? <p className="mt-1 text-xs text-[#EC3F3F]">{message}</p> : null;

  const getFieldClassName = (hasError) =>
    `w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 ${
      hasError
        ? "border-[#EC3F3F] focus:ring-[#EC3F3F]"
        : "border-gray-300 focus:ring-[#3D36BE]"
    }`;

  const displayStart = totalCount ? (pageNumber - 1) * pageSize + 1 : 0;
  const displayEnd = Math.min(pageNumber * pageSize, totalCount);

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#F6F5FF]">


      {/* Stats Cards Section */}
      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Active Supervisors Card */}
        <div className="flex flex-1 gap-6 p-6 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
          <div 
            className="p-2 rounded-lg shadow-[2px_4px_10px_rgba(0,38,73.56,0.25)] border border-[#EBE9FD] flex items-center justify-center" 
            style={{ 
              width: 56, 
              height: 56, 
              background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.20) 0%, rgba(255, 255, 255, 0.20) 100%), conic-gradient(from 134deg at 50.00% 50.00%, #3D35BE 0deg, #3C378B 360deg)' 
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[32px] font-bold text-[#353535] leading-none">{overallSupervisorCount}</span>
            <span className="text-base text-[#4E5159] font-normal">Active Supervisors</span>
          </div>
        </div>

        {/* Inactive Supervisors Card */}
        <div className="flex flex-1 gap-6 p-6 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
          <div 
            className="p-2 rounded-lg shadow-[2px_4px_10px_rgba(0,38,73.56,0.25)] border border-[#EBE9FD] flex items-center justify-center" 
            style={{ 
              width: 56, 
              height: 56, 
              background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.20) 0%, rgba(255, 255, 255, 0.20) 100%), conic-gradient(from 134deg at 50.00% 50.00%, #3D35BE 0deg, #3C378B 360deg)' 
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <UserX className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[32px] font-bold text-[#353535] leading-none">{overallAdminCount}</span>
            <span className="text-base text-[#4E5159] font-normal">Inactive Supervisors</span>
          </div>
        </div>

        {/* Total Users Card */}
        <div className="flex flex-1 gap-6 p-6 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
          <div 
            className="p-2 rounded-lg shadow-[2px_4px_10px_rgba(0,38,73.56,0.25)] border border-[#EBE9FD] flex items-center justify-center" 
            style={{ 
              width: 56, 
              height: 56, 
              background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.20) 0%, rgba(255, 255, 255, 0.20) 100%), conic-gradient(from 134deg at 50.00% 50.00%, #3D35BE 0deg, #3C378B 360deg)' 
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[32px] font-bold text-[#353535] leading-none">{totalCount}</span>
            <span className="text-base text-[#4E5159] font-normal">Total Users</span>
          </div>
        </div>
      </div>

      {/* Main Container Card (Table & Actions) */}
      <div 
        className="w-full bg-white flex flex-col gap-7 min-w-0" 
        style={{ 
          paddingLeft: 24, 
          paddingRight: 24, 
          paddingTop: 30, 
          paddingBottom: 30, 
          borderTopRightRadius: 20, 
          borderBottomRightRadius: 20, 
          borderBottomLeftRadius: 20 
        }}
      >
        {/* Inner layout wrapper styled with purple outline */}
        <div 
          className="w-full flex flex-col overflow-hidden rounded-lg min-w-0" 
          style={{ outline: '1px rgba(61, 53, 190, 0.26) solid' }}
        >
          {/* Header Row: Search */}
          <div className="w-full bg-white p-6 border-b border-gray-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="w-full sm:max-w-md relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, mobile, or email..."
                className="w-full h-12 pl-12 pr-4 bg-white rounded-lg border border-[#C8D9EF] text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans"
              />
              <svg className="w-5 h-5 absolute left-4 text-[#717579]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <button
              type="button"
              onClick={handleAddNew}
              disabled={roles.length === 0}
              className="h-11 px-8 bg-[#3D35BE] text-white text-base font-bold rounded-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 font-sans w-full lg:w-auto shrink-0 whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              Add User
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full min-w-[760px] border-collapse">
              <thead className="bg-[#F0EFFF] border-b border-[#9792E7]">
                <tr className="h-[68px]">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Employee Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Phone</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Onboarding Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 font-sans">
                      Loading users...
                    </td>
                  </tr>
                )}
                {!isLoading && loadError && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-red-600 font-sans">
                      {loadError}
                    </td>
                  </tr>
                )}
                {!isLoading && !loadError && users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 font-sans">
                      No users found.
                    </td>
                  </tr>
                )}
                {!isLoading && !loadError && users.map((user) => (
                  <tr
                    key={user.id}
                    className="h-[78px] transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-6 py-4 text-base text-[#5B6065] font-normal capitalize font-sans">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 text-base text-[#3E424E] font-semibold capitalize font-sans">
                      {formatRoleName(user.roleName)}
                    </td>
                    <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                      {user.phone}
                    </td>
                    <td className="px-6 py-4 text-base text-[#5B6065] font-normal lowercase font-sans">
                      {user.email || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        disabled={user.phone === currentUserMobile}
                        title={user.phone === currentUserMobile ? "Cannot de-activate yourself" : ""}
                        className="focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {user.enable ? (
                          <span className="inline-flex items-center justify-center rounded-lg bg-[#EFFFFE] border border-[#A0EBE5] text-sm font-medium text-[#01B6A8] px-3 py-1 font-sans">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center rounded-lg bg-[#FFF1F0] border border-[#F5CDD5] text-base font-semibold text-[#F15F7F] px-3 py-1 font-sans">
                            Inactive
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                      {formatDate(user.createdOn)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleEdit(user)}
                        className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#2945AC]"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="block md:hidden bg-white divide-y divide-gray-100">
            {isLoading && (
              <div className="p-6 text-center text-gray-500 font-sans">
                Loading users...
              </div>
            )}
            {!isLoading && loadError && (
              <div className="p-6 text-center text-red-600 font-sans">
                {loadError}
              </div>
            )}
            {!isLoading && !loadError && users.length === 0 && (
              <div className="p-6 text-center text-gray-500 font-sans">
                No users found.
              </div>
            )}
            {!isLoading && !loadError && users.map((user) => (
              <div
                key={user.id}
                className="p-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 capitalize text-base font-sans">{user.name}</p>
                    <p className="text-xs text-gray-500 capitalize font-sans">{formatRoleName(user.roleName)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(user)}
                    disabled={user.phone === currentUserMobile}
                    className="focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {user.enable ? (
                      <span className="inline-flex items-center justify-center rounded-lg bg-[#EFFFFE] border border-[#A0EBE5] text-xs font-semibold text-[#01B6A8] px-2.5 py-1 font-sans">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-lg bg-[#FFF1F0] border border-[#F5CDD5] text-xs font-semibold text-[#F15F7F] px-2.5 py-1 font-sans">
                        Inactive
                      </span>
                    )}
                  </button>
                </div>
                
                <div className="mb-4 space-y-2 text-sm text-[#5B6065]">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#3E424E] font-sans">Phone:</span>
                    <span className="font-sans">{user.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-[#3E424E] font-sans">Email:</span>
                    <span className="truncate ml-4 font-sans">{user.email || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-[#3E424E] font-sans">Onboarding:</span>
                    <span className="font-sans">{formatDate(user.createdOn)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => handleEdit(user)}
                    className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#2945AC]"
                    title="Edit"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-white">
            <Pagination
              pageNumber={pageNumber}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={(nextPage) => setPageNumber(nextPage)}
            />
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-6 text-gray-900 font-bold text-xl font-sans">
                {editingUser ? "Edit User" : "Add New User"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Row 1: Full Name | Phone */}
                <div>
                  <label className="mb-2 block text-gray-700 font-medium font-sans">
                    Full Name<span className="text-[#EC3F3F]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) =>
                      setFormData({ ...formData, name: event.target.value })
                    }
                    className={`${getFieldClassName(Boolean(formErrors.name))} font-sans`}
                    placeholder="Enter full name"
                    aria-invalid={Boolean(formErrors.name)}
                  />
                  {renderFieldError(formErrors.name)}
                </div>

                <div>
                  <label className="mb-2 block text-gray-700 font-medium font-sans">
                    Phone<span className="text-[#EC3F3F]">*</span>
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    value={formData.phone}
                    onChange={(event) => {
                      const val = event.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: val });
                    }}
                    className={`${getFieldClassName(Boolean(formErrors.phone))} font-sans`}
                    placeholder="Enter 10 digit number"
                    aria-invalid={Boolean(formErrors.phone)}
                  />
                  {renderFieldError(formErrors.phone)}
                </div>

                {/* Row 2: Email | Role */}
                <div>
                  <label className="mb-2 block text-gray-700 font-medium font-sans">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData({ ...formData, email: event.target.value })
                    }
                    className={`${getFieldClassName(Boolean(formErrors.email))} font-sans`}
                    placeholder="Enter email address"
                    aria-invalid={Boolean(formErrors.email)}
                  />
                  {renderFieldError(formErrors.email)}
                </div>

                <div>
                  <label className="mb-2 block text-gray-700 font-medium font-sans">
                    Role<span className="text-[#EC3F3F]">*</span>
                  </label>
                  <select
                    value={formData.roleId}
                    onChange={(event) =>
                      setFormData({ ...formData, roleId: event.target.value })
                    }
                    className={`${getFieldClassName(Boolean(formErrors.roleId))} font-sans`}
                    aria-invalid={Boolean(formErrors.roleId)}
                  >
                    <option value="" disabled>
                      Select role
                    </option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {formatRoleName(role.roleName)}
                      </option>
                    ))}
                  </select>
                  {renderFieldError(formErrors.roleId)}
                </div>

                {/* Row 3: Password | Active User */}
                <div>
                  <label className="mb-2 block text-gray-700 font-medium font-sans">
                    Password<span className="text-[#EC3F3F]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(event) =>
                        setFormData({ ...formData, password: event.target.value })
                      }
                      className={`${getFieldClassName(Boolean(formErrors.password))} pr-10 font-sans`}
                      placeholder="Enter password"
                      aria-invalid={Boolean(formErrors.password)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {renderFieldError(formErrors.password)}
                </div>

                <div className="flex flex-col justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <span className="text-sm text-gray-500 font-sans font-medium">Status</span>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      id="activeStatus"
                      checked={formData.enable}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          enable: event.target.checked,
                        })
                      }
                      className="h-5 w-5 rounded border-gray-300 accent-[#3D36BE]"
                    />
                    <span className="text-gray-700 font-sans">Active User</span>
                  </label>
                </div>

                {/* Row 4: Address (full width, last) */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-gray-700 font-medium font-sans">
                    Address<span className="text-[#EC3F3F]">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(event) =>
                      setFormData({ ...formData, address: event.target.value })
                    }
                    className={`${getFieldClassName(Boolean(formErrors.address))} font-sans`}
                    placeholder="Enter address"
                    aria-invalid={Boolean(formErrors.address)}
                  />
                  {renderFieldError(formErrors.address)}
                </div>
              </div>

              {/* Action buttons inside the modal */}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 rounded-lg px-4 py-2.5 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 font-bold font-sans"
                  style={{ backgroundColor: "#3D35BE" }}
                >
                  {isSaving ? "Saving..." : editingUser ? "Update User" : "Create User"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setShowPassword(false);
                  }}
                  disabled={isSaving}
                  className="flex-1 rounded-lg border border-[#3D35BE] bg-white text-[#3D35BE] transition-colors hover:bg-[#F0EFFF] disabled:cursor-not-allowed disabled:opacity-70 font-bold font-sans"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm deletion modal */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Delete User"
        message={`Are you sure you want to delete the user "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
        isLoading={isSaving}
      />
    </div>
  );
}

export default UserManagement;




