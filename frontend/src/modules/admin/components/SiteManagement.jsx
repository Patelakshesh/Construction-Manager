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
  "query GetSitesAndUsers($pageNumber: Int!, $pageSize: Int!, $search: String) { sitesPage(pageNumber: $pageNumber, pageSize: $pageSize, search: $search) { items { id siteName address contactPerson enable createdOn createdBy modifiedOn modifiedBy } totalCount pageNumber pageSize totalPages } users { id name enable roleId } roles { id roleName } allSites: sites { id siteName address contactPerson enable } }";

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
  const [allSitesList, setAllSitesList] = useState([]);
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
        setAllSitesList(allS);
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

      // Build supervisor options: all enabled users with supervisor role
      const roleSupervisors = apiUsers
        .filter((u) => u.enable && u.roleId === supervisorRoleId)
        .map((u) => u.name);
      setSupervisorOptions(roleSupervisors);
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

    setIsSaving(true);
    try {
      await submitMutation(DELETE_SITE_MUTATION, {
        id: Number(itemToDelete.id),
      });

      toast.success("Site deleted successfully.");
      loadData(false);
    } catch (error) {
      toast.error(error?.message || "Unable to delete site.");
    } finally {
      setIsSaving(false);
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

  // Computed at render time (not in loadData) to avoid stale closure.
  // Build set of supervisors already assigned to OTHER active sites.
  const assignedElsewhere = new Set();
  allSitesList.forEach(site => {
    if (!site.enable) return;
    // Skip the site currently being edited — its supervisors should show as checked
    if (editingSite && String(site.id) === String(editingSite.id)) return;
    if (site.contactPerson) {
      site.contactPerson.split(",").forEach(n => {
        const trimmed = n.trim().toLowerCase();
        if (trimmed) assignedElsewhere.add(trimmed);
      });
    }
  });

  // Start with role-based supervisors + currently assigned to THIS site
  // (so they show as checked even if account role/status changed).
  // Then filter out anyone assigned to a DIFFERENT active site.
  // CRITICAL FIX: Always show the checkbox for anyone currently in formData.supervisor
  // so the user has the ability to unselect them, even if they are also assigned elsewhere!
  const dropdownSupervisorOptions = Array.from(
    new Set([...supervisorOptions, ...(formData.supervisor || [])])
  ).filter(name => {
    if (formData.supervisor.includes(name)) return true;
    return !assignedElsewhere.has(name.toLowerCase());
  });


  // ── Render helpers ───────────────────────────────────────────────────────────

  const renderFieldError = (message) =>
    message ? <p className="mt-1 text-xs text-[#EC3F3F]">{message}</p> : null;

  const getFieldClassName = (hasError) =>
    `w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 ${hasError
      ? "border-[#EC3F3F] focus:ring-[#EC3F3F]"
      : "border-gray-300 focus:ring-[#3D36BE]"
    }`;

  // ── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#F6F5FF] font-sans">

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Total Active Sites Card */}
        <div className="flex flex-1 gap-6 p-6 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
          <div 
            className="p-2 rounded-lg shadow-[2px_4px_10px_rgba(0,38,73.56,0.25)] border border-[#EBE9FD] flex items-center justify-center shrink-0" 
            style={{ 
              width: 56, 
              height: 56, 
              background: 'conic-gradient(from 134deg at 50.00% 50.00%, #3D35BE 0deg, #3C378B 360deg)' 
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[32px] font-bold text-[#353535] leading-none">{overallActiveSiteCount}</span>
            <span className="text-base text-[#4E5159] font-normal">Active Sites</span>
          </div>
        </div>

        {/* Total Inactive Sites Card */}
        <div className="flex flex-1 gap-6 p-6 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
          <div 
            className="p-2 rounded-lg shadow-[2px_4px_10px_rgba(0,38,73.56,0.25)] border border-[#EBE9FD] flex items-center justify-center shrink-0" 
            style={{ 
              width: 56, 
              height: 56, 
              background: 'conic-gradient(from 134deg at 50.00% 50.00%, #3C368D 0deg, #857FF4 100%)' 
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <UserX className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[32px] font-bold text-[#353535] leading-none">{overallInactiveSiteCount}</span>
            <span className="text-base text-[#4E5159] font-normal">Inactive Sites</span>
          </div>
        </div>

        {/* Total Sites Card */}
        <div className="flex flex-1 gap-6 p-6 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
          <div 
            className="p-2 rounded-lg shadow-[2px_4px_10px_rgba(0,38,73.56,0.25)] border border-[#EBE9FD] flex items-center justify-center shrink-0" 
            style={{ 
              width: 56, 
              height: 56, 
              background: 'conic-gradient(from 134deg at 50.00% 50.00%, #3D35BE 0deg, #3C378B 360deg)' 
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[32px] font-bold text-[#353535] leading-none">{totalCount}</span>
            <span className="text-base text-[#4E5159] font-normal">Total Sites</span>
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
        <div 
          className="w-full flex flex-col overflow-hidden rounded-lg min-w-0" 
          style={{ outline: '1px rgba(61, 53, 190, 0.26) solid' }}
        >
          {/* Header Row: Search Input */}
          <div className="w-full bg-white p-6 border-b border-gray-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="w-full sm:max-w-md relative flex items-center">
              <input
                type="text"
                placeholder="Search by site, location or supervisor..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPageNumber(1);
                }}
                className="w-full h-12 pl-12 pr-4 bg-white rounded-lg border border-[#C8D9EF] text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans"
              />
              <svg className="w-5 h-5 absolute left-4 text-[#717579]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <button
              type="button"
              onClick={handleAddNew}
              className="h-11 px-8 bg-[#3D35BE] text-white text-base font-bold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 font-sans w-full lg:w-auto shrink-0 whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              Add Site
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full min-w-[760px] border-collapse">
              <thead className="bg-[#F0EFFF] border-b border-[#9792E7]">
                <tr className="h-[68px]">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Site</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Location</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Assigned Supervisor</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-sans">
                      Loading sites...
                    </td>
                  </tr>
                )}
                {!isLoading && loadError && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-red-600 font-sans">
                      {loadError}
                    </td>
                  </tr>
                )}
                {!isLoading && !loadError && sites.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-sans">
                      No sites found.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  !loadError &&
                  sites.map((site) => (
                    <tr
                      key={site.id}
                      className="h-[78px] transition-colors hover:bg-gray-50/50"
                    >
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal capitalize font-sans">
                        {site.name}
                      </td>
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                        {site.location}
                      </td>
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                        {site.supervisor.length > 0 ? site.supervisor.join(", ") : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(site)}
                          disabled={isSaving}
                          className="focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {site.status === "active" ? (
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
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleEdit(site)}
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
                Loading sites...
              </div>
            )}
            {!isLoading && loadError && (
              <div className="p-6 text-center text-red-600 font-sans">
                {loadError}
              </div>
            )}
            {!isLoading && !loadError && sites.length === 0 && (
              <div className="p-6 text-center text-gray-500 font-sans">
                No sites found.
              </div>
            )}
            {!isLoading &&
              !loadError &&
              sites.map((site) => (
                <div
                  key={site.id}
                  className="p-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 capitalize text-base font-sans">{site.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(site)}
                      disabled={isSaving}
                      className="focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {site.status === "active" ? (
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
                      <span className="font-medium text-[#3E424E] font-sans">Location:</span>
                      <span className="font-sans">{site.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-[#3E424E] font-sans">Supervisors:</span>
                      <span className="font-sans">
                        {site.supervisor.length > 0 ? site.supervisor.join(", ") : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(site)}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-6 text-gray-900 font-bold text-xl font-sans">
                {editingSite ? "Edit Site" : "Add New Site"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Site Name */}
                <div>
                  <label className="mb-2 block text-gray-700 font-medium font-sans">
                    Site Name<span className="text-[#EC3F3F]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`${getFieldClassName(Boolean(formErrors.name))} font-sans`}
                    placeholder="Enter site name"
                    aria-invalid={Boolean(formErrors.name)}
                  />
                  {renderFieldError(formErrors.name)}
                </div>

                {/* Location */}
                <div>
                  <label className="mb-2 block text-gray-700 font-medium font-sans">
                    Location<span className="text-[#EC3F3F]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className={`${getFieldClassName(Boolean(formErrors.location))} font-sans`}
                    placeholder="Enter location"
                    aria-invalid={Boolean(formErrors.location)}
                  />
                  {renderFieldError(formErrors.location)}
                </div>

                {/* Assign Supervisors */}
                <div>
                  <label className="mb-2 block text-gray-700 font-medium font-sans">
                    Assign Supervisors
                  </label>
                  <div className="relative font-sans" ref={dropdownRef}>
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
                      <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                        {dropdownSupervisorOptions.length === 0 && (
                          <p className="px-4 py-2 text-sm text-gray-500 font-sans">
                            No supervisors available
                          </p>
                        )}
                        {dropdownSupervisorOptions.map((name) => (
                          <label
                            key={name}
                            className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-50 font-sans"
                          >
                            <input
                              type="checkbox"
                              checked={formData.supervisor.includes(name)}
                              onChange={() => {
                                const isSelected = formData.supervisor.includes(name);
                                setFormData({
                                  ...formData,
                                  supervisor: isSelected
                                    ? formData.supervisor.filter((s) => s !== name)
                                    : [...formData.supervisor, name],
                                });
                              }}
                              className="h-4 w-4 rounded border-gray-300 accent-[#3D36BE]"
                            />
                            <span className="text-gray-700 font-sans">{name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Toggle Box */}
                <div className="flex flex-col justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <span className="text-sm text-gray-500 font-sans font-medium">Status</span>
                  <label className="flex cursor-pointer items-center gap-3">
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
                      className="h-5 w-5 rounded border-gray-300 accent-[#3D36BE]"
                    />
                    <span className="text-gray-700 font-sans">Active Site</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 rounded-lg px-4 py-2.5 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 font-bold font-sans"
                  style={{ backgroundColor: "#3D35BE" }}
                >
                  {isSaving ? "Saving..." : editingSite ? "Update Site" : "Create Site"}
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
                  className="flex-1 rounded-lg border border-[#3D35BE] bg-white text-[#3D35BE] transition-colors hover:bg-[#F0EFFF] disabled:cursor-not-allowed font-bold font-sans"
                >
                  Cancel
                </button>
              </div>
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
        isLoading={isSaving}
      />
    </div>
  );
}

export default SiteManagement;




