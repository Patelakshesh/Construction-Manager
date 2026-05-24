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
        let allU = response.data.data.allUsers;
        const searchLower = trimmedSearch.toLowerCase();
        if (searchLower) {
          allU = allU.filter(u => 
            (u.name?.toLowerCase().includes(searchLower)) ||
            (u.email?.toLowerCase().includes(searchLower)) ||
            (u.mobileNumber?.toLowerCase().includes(searchLower))
          );
        }
        
        let overallAdmins = 0;
        let overallSupervisors = 0;
        
        allU.forEach(u => {
          if (!u.enable) return;
          const roleName = nextRoleLookup[u.roleId]?.roleName || "";
          const normName = normalizeRoleName(roleName);
          if (normName === "admin") overallAdmins++;
          if (normName === "supervisor") overallSupervisors++;
        });
        
        setOverallAdminCount(overallAdmins);
        setOverallSupervisorCount(overallSupervisors);
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
    const defaultRoleId = roles[0]?.id ? String(roles[0].id) : "";

    setEditingUser(null);
    setFormErrors({});
    setShowPassword(false);
    setFormData({
      ...emptyFormData,
      roleId: defaultRoleId,
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
        : "border-gray-300 focus:ring-[#FDB71A]"
    }`;

  const displayStart = totalCount ? (pageNumber - 1) * pageSize + 1 : 0;
  const displayEnd = Math.min(pageNumber * pageSize, totalCount);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-900 md:text-3xl">
            User Management
          </h1>
          <p className="text-gray-600">Manage supervisors</p>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          disabled={roles.length === 0}
          className="flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: "#FDB71A" }}
        >
          <Plus className="h-5 w-5" />
          Add User
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Supervisor</p>
              <h3 className="text-gray-900">{overallSupervisorCount}</h3>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50">
              <UserX className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Admin</p>
              <h3 className="text-gray-900">{overallAdminCount}</h3>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#FDB71A20" }}
            >
              <UserCheck className="h-6 w-6" style={{ color: "#FDB71A" }} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <h3 className="text-gray-900">{totalCount}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name, mobile, or email"
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A] sm:max-w-sm"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="hidden md:block">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-gray-700">Name</th>
                  <th className="px-6 py-4 text-left text-gray-700">Phone</th>
                  <th className="px-6 py-4 text-left text-gray-700">Role</th>
                  <th className="px-6 py-4 text-left text-gray-700">Status</th>
                  <th className="px-6 py-4 text-left text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-6 text-center text-gray-500"
                    >
                      Loading users...
                    </td>
                  </tr>
                )}
                {!isLoading && loadError && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-6 text-center text-red-600"
                    >
                      {loadError}
                    </td>
                  </tr>
                )}
                {!isLoading && !loadError && users.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-6 text-center text-gray-500"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  !loadError &&
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-gray-900 capitalize">{user.name}</p>
                          <p className="text-xs text-gray-500">
                            {user.email || "No email"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{user.phone}</td>
                      <td className="px-6 py-4 text-gray-900 capitalize">
                        {formatRoleName(user.roleName)}
                      </td>
                      <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            disabled={user.phone === currentUserMobile}
                            title={user.phone === currentUserMobile ? "Cannot change your own status" : ""}
                            className={`relative inline-flex h-7 w-[84px] shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
                              user.enable ? "bg-[#34A853]" : "bg-[#EA4335]"
                            }`}
                          >
                            <span className={`absolute text-[10px] font-bold text-white ${user.enable ? 'left-2' : 'right-2'}`}>
                              {user.enable ? "ACTIVE" : "INACTIVE"}
                            </span>
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                user.enable ? "translate-x-[60px]" : "translate-x-1"
                              }`}
                            />
                          </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(user)}
                            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                          >
                            <Edit className="h-5 w-5 text-gray-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden">
            {isLoading && (
              <div className="p-6 text-center text-gray-500">
                Loading users...
              </div>
            )}
            {!isLoading && loadError && (
              <div className="p-6 text-center text-red-600">
                {loadError}
              </div>
            )}
            {!isLoading && !loadError && users.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No users found.
              </div>
            )}
            {!isLoading &&
              !loadError &&
              users.map((user) => (
                <div
                  key={user.id}
                  className="border-b border-gray-200 p-4 last:border-0 hover:bg-gray-50"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{user.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{formatRoleName(user.roleName)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(user)}
                      disabled={user.phone === currentUserMobile}
                      title={user.phone === currentUserMobile ? "Cannot change your own status" : ""}
                      className={`relative inline-flex h-7 w-[84px] shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
                        user.enable ? "bg-[#34A853]" : "bg-[#EA4335]"
                      }`}
                    >
                      <span className={`absolute text-[10px] font-bold text-white ${user.enable ? 'left-2' : 'right-2'}`}>
                        {user.enable ? "ACTIVE" : "INACTIVE"}
                      </span>
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          user.enable ? "translate-x-[60px]" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  
                  <div className="mb-4 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span className="font-medium">Phone:</span>
                      <span>{user.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Email:</span>
                      <span className="truncate ml-4">{user.email || "N/A"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(user)}
                      className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                    >
                      <Edit className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
          {/* Pagination */}
          <div className="border-t border-gray-200 px-6 py-4">
            <Pagination
              pageNumber={pageNumber}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={(nextPage) => setPageNumber(nextPage)}
            />
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-6 text-gray-900">
              {editingUser ? "Edit User" : "Add New User"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-gray-700">
                  Full Name<span className="text-[#EC3F3F]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  className={getFieldClassName(Boolean(formErrors.name))}
                  placeholder="Enter full name"
                  aria-invalid={Boolean(formErrors.name)}
                />
                {renderFieldError(formErrors.name)}
              </div>

              <div>
                <label className="mb-2 block text-gray-700">
                  Phone<span className="text-[#EC3F3F]">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) =>
                    setFormData({ ...formData, phone: event.target.value })
                  }
                  className={getFieldClassName(Boolean(formErrors.phone))}
                  placeholder="Enter phone number"
                  aria-invalid={Boolean(formErrors.phone)}
                />
                {renderFieldError(formErrors.phone)}
              </div>

              <div>
                <label className="mb-2 block text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData({ ...formData, email: event.target.value })
                  }
                  className={getFieldClassName(Boolean(formErrors.email))}
                  placeholder="Enter email address"
                  aria-invalid={Boolean(formErrors.email)}
                />
                {renderFieldError(formErrors.email)}
              </div>

              <div>
                <label className="mb-2 block text-gray-700">
                  Address<span className="text-[#EC3F3F]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(event) =>
                    setFormData({ ...formData, address: event.target.value })
                  }
                  className={getFieldClassName(Boolean(formErrors.address))}
                  placeholder="Enter address"
                  aria-invalid={Boolean(formErrors.address)}
                />
                {renderFieldError(formErrors.address)}
              </div>

              <div>
                <label className="mb-2 block text-gray-700">
                  Role<span className="text-[#EC3F3F]">*</span>
                </label>
                <select
                  value={formData.roleId}
                  onChange={(event) =>
                    setFormData({ ...formData, roleId: event.target.value })
                  }
                  className={getFieldClassName(Boolean(formErrors.roleId))}
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

              <div>
                <label className="mb-2 block text-gray-700">
                  Password<span className="text-[#EC3F3F]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(event) =>
                      setFormData({ ...formData, password: event.target.value })
                    }
                    className={`${getFieldClassName(Boolean(formErrors.password))} pr-10`}
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

              <div className="flex items-center gap-3">
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
                  className="h-5 w-5 rounded border-gray-300"
                />
                <label htmlFor="activeStatus" className="text-gray-700">
                  Active User
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                style={{ backgroundColor: "#FDB71A" }}
              >
                {editingUser ? "Update" : "Create"} User
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setShowPassword(false);
                }}
                className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Delete User"
        message={`Are you sure you want to delete the user "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}

export default UserManagement;
