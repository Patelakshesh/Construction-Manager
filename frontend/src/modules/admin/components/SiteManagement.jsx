import { useCallback, useEffect, useRef, useState } from "react";
import useDebounce from "../../../shared/hooks/useDebounce";
import {
  Edit,
  MapPin,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "../../../shared/services/apiClient";
import Pagination from "../../../shared/components/Pagination";
import ConfirmModal from "../../../shared/components/ConfirmModal";

// ─── GraphQL queries ────────────────────────────────────────────────────────

const LOAD_QUERY =
  "query GetSitesAndUsers($pageNumber: Int!, $pageSize: Int!, $search: String) { sitesPage(pageNumber: $pageNumber, pageSize: $pageSize, search: $search) { items { id siteName address contactPerson enable createdOn createdBy modifiedOn modifiedBy } totalCount pageNumber pageSize totalPages } users { id name enable roleId } roles { id roleName } allSites: sites { siteName address contactPerson enable } }";

const CREATE_SITE_MUTATION =
  "mutation CreateSite($input: CreateSiteInput!) { createSite(input: $input) { id siteName address contactPerson enable createdOn createdBy modifiedOn modifiedBy } }";

const UPDATE_SITE_MUTATION =
  "mutation UpdateSite($input: UpdateSiteInput!) { updateSite(input: $input) { id siteName address contactPerson enable createdOn createdBy modifiedOn modifiedBy } }";

const DELETE_SITE_MUTATION =
  "mutation DeleteSite($id: Int!) { deleteSite(id: $id) }";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const emptyFormData = {
  name: "",
  location: "",
  supervisor: [],
  status: "active",
};

function normalizeSite(raw) {
  const supervisors = raw.contactPerson
    ? raw.contactPerson.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  return {
    id: String(raw.id),
    name: raw.siteName || "",
    location: raw.address || "",
    supervisor: supervisors,
    status: raw.enable ? "active" : "inactive",
    createdBy: raw.createdBy,
    modifiedBy: raw.modifiedBy,
  };
}

function getActorName() {
  const storedUser = localStorage.getItem("authUser");
  if (!storedUser) return "system";
  try {
    return JSON.parse(storedUser)?.name || "system";
  } catch {
    return "system";
  }
}

function buildInput(formData, extra = {}) {
  return {
    siteName: formData.name.trim(),
    address: formData.location.trim(),
    city: null,
    state: null,
    contactPerson: formData.supervisor.length > 0 ? formData.supervisor.join(", ") : null,
    contactNumber: null,
    startDate: null,
    endDate: null,
    enable: formData.status === "active",
    ...extra,
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateForm(formData) {
  const errors = {};
  if (!formData.name.trim()) {
    errors.name = "Site name is required.";
  }
  if (!formData.location.trim()) {
    errors.location = "Location is required.";
  }
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

function SiteManagement() {
  const [sites, setSites] = useState([]);
  const [supervisorOptions, setSupervisorOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [formErrors, setFormErrors] = useState({});
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSupervisorDropdownOpen, setIsSupervisorDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [overallActiveSiteCount, setOverallActiveSiteCount] = useState(0);
  const [overallInactiveSiteCount, setOverallInactiveSiteCount] = useState(0);
  const pageSize = 10;
  const dropdownRef = useRef(null);

  // Close supervisor dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSupervisorDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadData = useCallback(async (showLoadingIndicator = true) => {
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
          query: LOAD_QUERY,
          variables: {
            pageNumber,
            pageSize,
            search: trimmedSearch || null,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response?.data?.errors?.length) {
        const apiMessage =
          response.data.errors[0]?.message || "Unable to load sites.";
        setLoadError(apiMessage);
        return;
      }

      const sitePage = response?.data?.data?.sitesPage;
      const apiSites = sitePage?.items || [];
      const apiUsers = response?.data?.data?.users || [];
      const apiRoles = response?.data?.data?.roles || [];

      // Find supervisor role ID
      const supervisorRole = apiRoles.find((r) => r.roleName && r.roleName.toLowerCase().includes('supervis'));
      const supervisorRoleId = supervisorRole ? supervisorRole.id : null;

      setSites(apiSites.map(normalizeSite));
      setTotalCount(sitePage?.totalCount || 0);

      if (response?.data?.data?.allSites) {
        let allS = response.data.data.allSites;
        const searchLower = trimmedSearch.toLowerCase();
        if (searchLower) {
          allS = allS.filter(s => 
            (s.siteName?.toLowerCase().includes(searchLower)) ||
            (s.address?.toLowerCase().includes(searchLower)) ||
            (s.contactPerson?.toLowerCase().includes(searchLower))
          );
        }
        setOverallActiveSiteCount(allS.filter(s => s.enable).length);
        setOverallInactiveSiteCount(allS.filter(s => !s.enable).length);
      }

      // Only use enabled users that have the supervisor role
      setSupervisorOptions(
        apiUsers
          .filter((u) => u.enable && u.roleId === supervisorRoleId)
          .map((u) => u.name)
      );
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to load sites.";
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
    loadData();
  }, [loadData]);

  // ── Mutation helper ─────────────────────────────────────────────────────────

  const submitMutation = async (query, variables) => {
    const token = localStorage.getItem("authToken");
    if (!token) throw new Error("Missing authentication token. Please log in again.");

    const response = await apiClient.post(
      "/graphql",
      { query, variables },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (response?.data?.errors?.length) {
      throw new Error(
        response.data.errors[0]?.message || "Unable to save site.",
      );
    }

    return response?.data?.data;
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAddNew = () => {
    setEditingSite(null);
    setFormErrors({});
    setIsSupervisorDropdownOpen(false);
    setFormData(emptyFormData);
    setIsModalOpen(true);
  };

  const handleEdit = (site) => {
    setEditingSite(site);
    setFormErrors({});
    setIsSupervisorDropdownOpen(false);
    setFormData({
      name: site.name,
      location: site.location,
      supervisor: site.supervisor || [],
      status: site.status,
    });
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await submitMutation(DELETE_SITE_MUTATION, {
        id: Number(itemToDelete.id),
      });

      toast.success("Site deleted successfully.");
      loadData(false);
    } catch (error) {
      toast.error(error?.message || "Unable to delete site.");
    } finally {
      setItemToDelete(null);
    }
  };

  const handleSave = async () => {
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fix the errors below.");
      return;
    }

    setFormErrors({});
    setIsSaving(true);

    try {
      const actorName = getActorName();

      if (editingSite) {
        await submitMutation(UPDATE_SITE_MUTATION, {
          input: {
            id: Number(editingSite.id),
            ...buildInput(formData, { modifiedBy: actorName }),
          },
        });
        toast.success("Site updated successfully.");
      } else {
        await submitMutation(CREATE_SITE_MUTATION, {
          input: buildInput(formData, { createdBy: actorName }),
        });
        toast.success("Site created successfully.");
      }

      loadData(false);
      setIsModalOpen(false);
      setEditingSite(null);
      setFormData(emptyFormData);
    } catch (error) {
      toast.error(error?.message || "Unable to save site.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (site) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const actorName = getActorName();
      const nextEnabled = site.status !== "active";
      await submitMutation(UPDATE_SITE_MUTATION, {
        input: {
          id: Number(site.id),
          siteName: site.name,
          address: site.location,
          city: null,
          state: null,
          contactPerson: site.supervisor.length > 0 ? site.supervisor.join(", ") : null,
          contactNumber: null,
          startDate: null,
          endDate: null,
          enable: nextEnabled,
          modifiedBy: actorName,
        },
      });
      toast.success(
        nextEnabled ? "Site activated successfully." : "Site deactivated.",
      );
      loadData(false);
    } catch (error) {
      toast.error(error?.message || "Unable to update site status.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Derived values ───────────────────────────────────────────────────────────

  const displayStart = totalCount ? (pageNumber - 1) * pageSize + 1 : 0;
  const displayEnd = Math.min(pageNumber * pageSize, totalCount);

  // ── Render helpers ───────────────────────────────────────────────────────────

  const renderFieldError = (message) =>
    message ? <p className="mt-1 text-xs text-[#EC3F3F]">{message}</p> : null;

  const getFieldClassName = (hasError) =>
    `w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 ${
      hasError
        ? "border-[#EC3F3F] focus:ring-[#EC3F3F]"
        : "border-gray-300 focus:ring-[#3D36BE]"
    }`;

  // ── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-900 md:text-3xl">
            Site Management
          </h1>
          <p className="text-gray-600">
            Manage construction sites, budgets, and supervisors
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#3D36BE" }}
        >
          <Plus className="h-5 w-5" />
          Add Site
        </button>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Active</p>
              <h3 className="text-gray-900">{overallActiveSiteCount}</h3>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50">
              <UserX className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Inactive</p>
              <h3 className="text-gray-900">{overallInactiveSiteCount}</h3>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#3D36BE20" }}
            >
              <MapPin className="h-6 w-6" style={{ color: "#3D36BE" }} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Sites</p>
              <h3 className="text-gray-900">{totalCount}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search by site, location or supervisor..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPageNumber(1);
          }}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="hidden md:block">
            <table className="w-full min-w-[780px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-gray-700">Site</th>
                  <th className="px-6 py-4 text-left text-gray-700">Location</th>
                  <th className="px-6 py-4 text-left text-gray-700">Supervisor</th>
                  <th className="px-6 py-4 text-left text-gray-700">Status</th>
                  <th className="px-6 py-4 text-left text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                    Loading sites...
                  </td>
                </tr>
              )}
              {!isLoading && loadError && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-red-600">
                    {loadError}
                  </td>
                </tr>
              )}
              {!isLoading && !loadError && sites.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                    No sites found.
                  </td>
                </tr>
              )}
              {!isLoading &&
                !loadError &&
                sites.map((site) => (
                  <tr
                    key={site.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                        <p className="text-gray-900 capitalize">{site.name}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{site.location}</td>
                    <td className="px-6 py-4 text-gray-900">
                      {site.supervisor.length > 0
                        ? site.supervisor.join(", ")
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(site)}
                        disabled={isSaving}
                        className={`relative inline-flex h-7 w-[84px] shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                          site.status === "active" ? "bg-[#34A853]" : "bg-[#EA4335]"
                        }`}
                      >
                        <span className={`absolute text-[10px] font-bold text-white ${site.status === "active" ? 'left-2' : 'right-2'}`}>
                          {site.status === "active" ? "ACTIVE" : "INACTIVE"}
                        </span>
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            site.status === "active" ? "translate-x-[60px]" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(site)}
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
                Loading sites...
              </div>
            )}
            {!isLoading && loadError && (
              <div className="p-6 text-center text-red-600">
                {loadError}
              </div>
            )}
            {!isLoading && !loadError && sites.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No sites found.
              </div>
            )}
            {!isLoading &&
              !loadError &&
              sites.map((site) => (
                <div
                  key={site.id}
                  className="border-b border-gray-200 p-4 last:border-0 hover:bg-gray-50"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{site.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(site)}
                      disabled={isSaving}
                      className={`relative inline-flex h-7 w-[84px] shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                        site.status === "active" ? "bg-[#34A853]" : "bg-[#EA4335]"
                      }`}
                    >
                      <span className={`absolute text-[10px] font-bold text-white ${site.status === "active" ? 'left-2' : 'right-2'}`}>
                        {site.status === "active" ? "ACTIVE" : "INACTIVE"}
                      </span>
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          site.status === "active" ? "translate-x-[60px]" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  
                  <div className="mb-4 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span className="font-medium">Location:</span>
                      <span className="text-right ml-4">{site.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Supervisors:</span>
                      <span className="text-right ml-4">
                        {site.supervisor.length > 0
                          ? site.supervisor.join(", ")
                          : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(site)}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-6 text-gray-900">
              {editingSite ? "Edit Site" : "Add New Site"}
            </h3>

            <div className="space-y-4">
              {/* Site Name */}
              <div>
                <label className="mb-2 block text-gray-700">
                  Site Name<span className="text-[#EC3F3F]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={getFieldClassName(Boolean(formErrors.name))}
                  placeholder="Enter site name"
                  aria-invalid={Boolean(formErrors.name)}
                />
                {renderFieldError(formErrors.name)}
              </div>

              {/* Location */}
              <div>
                <label className="mb-2 block text-gray-700">
                  Location<span className="text-[#EC3F3F]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className={getFieldClassName(Boolean(formErrors.location))}
                  placeholder="Enter location"
                  aria-invalid={Boolean(formErrors.location)}
                />
                {renderFieldError(formErrors.location)}
              </div>

              {/* Assign Supervisor (multi-select dropdown from API users) */}
              <div className="relative" ref={dropdownRef}>
                <label className="mb-2 block text-gray-700">
                  Assign Supervisor
                </label>
                <div
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                  onClick={() =>
                    setIsSupervisorDropdownOpen(!isSupervisorDropdownOpen)
                  }
                >
                  <span className="truncate text-gray-700">
                    {formData.supervisor.length > 0
                      ? formData.supervisor.join(", ")
                      : "Select supervisors"}
                  </span>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-500" />
                </div>

                {isSupervisorDropdownOpen && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {supervisorOptions.length === 0 && (
                      <p className="px-4 py-2 text-sm text-gray-500">
                        No users available
                      </p>
                    )}
                    {supervisorOptions.map((name) => (
                      <label
                        key={name}
                        className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={formData.supervisor.includes(name)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormData({
                              ...formData,
                              supervisor: checked
                                ? [...formData.supervisor, name]
                                : formData.supervisor.filter((s) => s !== name),
                            });
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-[#3D36BE] focus:ring-[#3D36BE]"
                        />
                        <span className="text-gray-700">{name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="activeSiteStatus"
                  checked={formData.status === "active"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.checked ? "active" : "inactive",
                    })
                  }
                  className="h-5 w-5 rounded border-gray-300"
                />
                <label htmlFor="activeSiteStatus" className="text-gray-700">
                  Active Site
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                style={{ backgroundColor: "#3D36BE" }}
              >
                {isSaving ? "Saving..." : editingSite ? "Update" : "Create"} Site
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingSite(null);
                  setFormData(emptyFormData);
                  setFormErrors({});
                  setIsSupervisorDropdownOpen(false);
                }}
                disabled={isSaving}
                className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Site"
        message={`Are you sure you want to delete the site "${itemToDelete?.siteName}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}

export default SiteManagement;
