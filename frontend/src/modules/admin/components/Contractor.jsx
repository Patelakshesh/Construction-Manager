import { useState, useEffect, useRef, useCallback } from "react";
import {
  Building2,
  Edit,
  Plus,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import toast from "react-hot-toast";
import useDebounce from "../../../shared/hooks/useDebounce";
import apiClient from "../../../shared/services/apiClient";
import Pagination from "../../../shared/components/Pagination";
import ConfirmModal from "../../../shared/components/ConfirmModal";

const LOAD_CONTRACTORS_QUERY = `
  query GetContractorsPage($pageNumber: Int!, $pageSize: Int!, $search: String) {
    contractorsPage(
      pageNumber: $pageNumber
      pageSize: $pageSize
      search: $search
    ) {
      items {
        id
        contractorName
        email
        phone
        assignedSites
        enable
      }
      totalCount
      pageNumber
      pageSize
      totalPages
    }
    allContractors: contractors {
      enable
    }
  }
`;

const LOAD_SITES_QUERY = `
  query GetSites {
    sites {
      id
      siteName
    }
  }
`;

const CREATE_CONTRACTOR_MUTATION = `
  mutation CreateContractor($input: CreateContractorInput!) {
    createContractor(input: $input) {
      id
    }
  }
`;

const UPDATE_CONTRACTOR_MUTATION = `
  mutation UpdateContractor($input: UpdateContractorInput!) {
    updateContractor(input: $input) {
      id
    }
  }
`;

const DELETE_CONTRACTOR_MUTATION = `
  mutation DeleteContractor($id: Int!) {
    deleteContractor(id: $id)
  }
`;

function Contractor() {
  const getActorName = () => {
    const storedUser = localStorage.getItem("authUser");
    if (!storedUser) return "system";
    try {
      const parsedUser = JSON.parse(storedUser);
      return parsedUser?.name || "system";
    } catch {
      return "system";
    }
  };

  const [contractors, setContractors] = useState([]);
  const [sitesList, setSitesList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [overallActiveCount, setOverallActiveCount] = useState(0);
  const [overallInactiveCount, setOverallInactiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
  const siteDropdownRef = useRef(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [formData, setFormData] = useState({
    contractorName: "",
    email: "",
    phone: "",
    assignedSites: [],
    enable: true,
  });
  const [formErrors, setFormErrors] = useState({});

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

      // Load both contractors page and all sites
      const [contractorsRes, sitesRes] = await Promise.all([
        apiClient.post(
          "/graphql",
          {
            query: LOAD_CONTRACTORS_QUERY,
            variables: {
              pageNumber,
              pageSize,
              search: trimmedSearch || null,
            },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        apiClient.post(
          "/graphql",
          { query: LOAD_SITES_QUERY },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      ]);

      if (contractorsRes.data.errors) {
        setLoadError(contractorsRes.data.errors[0].message);
        toast.error(contractorsRes.data.errors[0].message);
        return;
      }

      if (sitesRes.data.errors) {
        toast.error("Failed to load sites for assignment: " + sitesRes.data.errors[0].message);
      } else {
        setSitesList(sitesRes.data.data.sites.map(s => s.siteName));
      }

      const page = contractorsRes.data.data.contractorsPage;
      setContractors(page.items);
      setTotalCount(page.totalCount);

      const all = contractorsRes.data.data.allContractors;
      const searchLower = debouncedSearch.toLowerCase().trim();
      const filteredAll = searchLower
        ? all.filter(c =>
          (c.contractorName?.toLowerCase().includes(searchLower)) ||
          (c.email?.toLowerCase().includes(searchLower))
        )
        : all;

      setOverallActiveCount(filteredAll.filter(c => c.enable).length);
      setOverallInactiveCount(filteredAll.filter(c => !c.enable).length);
    } catch (err) {
      setLoadError(err.message || "Failed to load contractors.");
      toast.error(err.message || "Failed to load contractors.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, pageNumber, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPageNumber(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!isSiteDropdownOpen) return;
    const handleClickOutside = (event) => {
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(event.target)) {
        setIsSiteDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSiteDropdownOpen]);

  const handleAddNew = () => {
    setEditingContractor(null);
    setFormData({
      contractorName: "",
      email: "",
      phone: "",
      assignedSites: [],
      enable: true,
    });
    setFormErrors({});
    setIsSiteDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleEdit = (contractor) => {
    setEditingContractor(contractor);
    const assignedSitesArray = contractor.assignedSites
      ? contractor.assignedSites.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    setFormData({
      contractorName: contractor.contractorName,
      email: contractor.email,
      phone: contractor.phone,
      assignedSites: assignedSitesArray,
      enable: contractor.enable,
    });
    setFormErrors({});
    setIsSiteDropdownOpen(false);
    setIsModalOpen(true);
  };

  const toggleStatus = async (contractor) => {
    if (isSaving) return;
    setIsSaving(true);
    const token = localStorage.getItem("authToken");
    try {
      const response = await apiClient.post(
        "/graphql",
        {
          query: UPDATE_CONTRACTOR_MUTATION,
          variables: {
            input: {
              id: contractor.id,
              contractorName: contractor.contractorName,
              email: contractor.email,
              phone: contractor.phone,
              assignedSites: contractor.assignedSites,
              enable: !contractor.enable,
              modifiedBy: getActorName()
            }
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.errors) {
        toast.error(response.data.errors[0].message);
        return;
      }

      toast.success(`Contractor marked as ${!contractor.enable ? 'Active' : 'Inactive'}`);
      loadData(false);
    } catch (err) {
      toast.error(err?.message || "Failed to update status.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setIsSaving(true);
    const token = localStorage.getItem("authToken");
    try {
      const response = await apiClient.post(
        "/graphql",
        {
          query: DELETE_CONTRACTOR_MUTATION,
          variables: { id: itemToDelete.id },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.errors) {
        toast.error(response.data.errors[0].message);
        return;
      }

      toast.success("Contractor deleted successfully.");
      loadData(false);
    } catch (err) {
      toast.error(err?.message || "Failed to delete contractor.");
    } finally {
      setIsSaving(false);
      setItemToDelete(null);
    }
  };

  const toggleAssignedSite = (site) => {
    setFormData((current) => ({
      ...current,
      assignedSites: current.assignedSites.includes(site)
        ? current.assignedSites.filter((item) => item !== site)
        : [...current.assignedSites, site],
    }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.contractorName.trim()) errors.contractorName = "Contractor name is required";

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone is required";
    } else if (!/^\d{10}$/.test(formData.phone.replace(/[^0-9]/g, ''))) {
      errors.phone = "Phone must be 10 digits";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    const token = localStorage.getItem("authToken");
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    const sitesString = formData.assignedSites.join(", ");

    try {
      if (editingContractor) {
        const response = await apiClient.post(
          "/graphql",
          {
            query: UPDATE_CONTRACTOR_MUTATION,
            variables: {
              input: {
                id: editingContractor.id,
                contractorName: formData.contractorName,
                email: formData.email,
                phone: cleanPhone,
                assignedSites: sitesString,
                enable: formData.enable,
                modifiedBy: getActorName(),
              },
            },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.errors) {
          toast.error(response.data.errors[0].message);
          return;
        }

        toast.success("Contractor updated successfully.");
      } else {
        const response = await apiClient.post(
          "/graphql",
          {
            query: CREATE_CONTRACTOR_MUTATION,
            variables: {
              input: {
                contractorName: formData.contractorName,
                email: formData.email,
                phone: cleanPhone,
                assignedSites: sitesString,
                enable: formData.enable,
                createdBy: getActorName(),
              },
            },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.errors) {
          toast.error(response.data.errors[0].message);
          return;
        }

        toast.success("Contractor created successfully.");
      }

      setIsModalOpen(false);
      loadData(false);
    } catch (err) {
      toast.error(err?.message || "Failed to save contractor.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderFieldError = (message) =>
    message ? <p className="mt-1 text-xs text-[#EC3F3F]">{message}</p> : null;

  const getFieldClassName = (hasError) =>
    `w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 ${hasError
      ? "border-[#EC3F3F] focus:ring-[#EC3F3F]"
      : "border-gray-300 focus:ring-[#3D36BE]"
    }`;

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#F6F5FF] font-sans">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl font-sans">
            Contractor Management
          </h1>
          <p className="text-[#4E5159] mt-1 text-base font-normal">
            Manage contractors and their site assignments
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="h-11 px-8 bg-[#3D35BE] text-white text-base font-bold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 font-sans"
        >
          <Plus className="h-5 w-5" />
          Add Contractor
        </button>
      </div>

      {/* Stats Cards Section */}
      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Total Active Card */}
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
            <span className="text-[32px] font-bold text-[#353535] leading-none">{overallActiveCount}</span>
            <span className="text-base text-[#4E5159] font-normal">Active Contractors</span>
          </div>
        </div>

        {/* Total Inactive Card */}
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
            <span className="text-[32px] font-bold text-[#353535] leading-none">{overallInactiveCount}</span>
            <span className="text-base text-[#4E5159] font-normal">Inactive Contractors</span>
          </div>
        </div>

        {/* Total Contractors Card */}
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
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[32px] font-bold text-[#353535] leading-none">{totalCount}</span>
            <span className="text-base text-[#4E5159] font-normal">Total Contractors</span>
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
          <div className="w-full bg-white p-6 border-b border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="w-full sm:max-w-md relative flex items-center">
              <input
                type="text"
                placeholder="Search by company, contact, or email..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white rounded-lg border border-[#C8D9EF] text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans"
              />
              <svg className="w-5 h-5 absolute left-4 text-[#717579]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {loadError && (
            <div className="mx-6 mt-4 rounded-lg bg-red-50 p-4 text-red-600 font-sans">
              {loadError}
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full min-w-[900px] border-collapse">
              <thead className="bg-[#F0EFFF] border-b border-[#9792E7]">
                <tr className="h-[68px]">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Contractor Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Phone</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Assigned Sites</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500 font-sans">
                      Loading contractors...
                    </td>
                  </tr>
                )}
                {!isLoading && contractors.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500 font-sans">
                      No contractors found.
                    </td>
                  </tr>
                )}
                {!isLoading && contractors.map((contractor) => (
                  <tr
                    key={contractor.id}
                    className="h-[78px] transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-6 py-4 text-base text-[#5B6065] font-normal capitalize font-sans">
                      {contractor.contractorName}
                    </td>
                    <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                      {contractor.email || "—"}
                    </td>
                    <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                      {contractor.phone}
                    </td>
                    <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans capitalize">
                      {contractor.assignedSites || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => toggleStatus(contractor)}
                        disabled={isSaving}
                        className="focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {contractor.enable ? (
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
                        onClick={() => handleEdit(contractor)}
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
                Loading...
              </div>
            )}
            {!isLoading && contractors.length === 0 && (
              <div className="p-6 text-center text-gray-500 font-sans">
                No contractors found.
              </div>
            )}
            {!isLoading && contractors.map((contractor) => (
              <div
                key={contractor.id}
                className="p-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 capitalize text-base font-sans">{contractor.contractorName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStatus(contractor)}
                    disabled={isSaving}
                    className="focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {contractor.enable ? (
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
                    <span className="font-medium text-[#3E424E] font-sans">Email:</span>
                    <span className="truncate ml-4 font-sans">{contractor.email || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-[#3E424E] font-sans">Phone:</span>
                    <span className="font-sans">{contractor.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-[#3E424E] font-sans">Sites:</span>
                    <span className="text-right ml-4 font-sans">{contractor.assignedSites || "—"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => handleEdit(contractor)}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-6 text-gray-900 font-bold text-xl font-sans">
                {editingContractor ? "Edit Contractor" : "Add New Contractor"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-gray-700 font-medium font-sans">
                    Contractor Name <span className="text-[#EC3F3F]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contractorName}
                    onChange={(event) => {
                      setFormData({ ...formData, contractorName: event.target.value });
                      if (formErrors.contractorName) setFormErrors({ ...formErrors, contractorName: null });
                    }}
                    className={`${getFieldClassName(formErrors.contractorName)} font-sans`}
                    placeholder="Enter contractor name"
                  />
                  {renderFieldError(formErrors.contractorName)}
                </div>

                <div>
                  <label className="mb-2 block text-gray-700 font-medium font-sans">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => {
                      setFormData({ ...formData, email: event.target.value });
                      if (formErrors.email) setFormErrors({ ...formErrors, email: null });
                    }}
                    className={`${getFieldClassName(formErrors.email)} font-sans`}
                    placeholder="Enter email"
                  />
                  {renderFieldError(formErrors.email)}
                </div>

                <div>
                  <label className="mb-2 block text-gray-700 font-medium font-sans">
                    Phone <span className="text-[#EC3F3F]">*</span>
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(event) => {
                      const val = event.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: val });
                      if (formErrors.phone) setFormErrors({ ...formErrors, phone: null });
                    }}
                    className={`${getFieldClassName(formErrors.phone)} font-sans`}
                    placeholder="Enter 10-digit phone number"
                  />
                  {renderFieldError(formErrors.phone)}
                </div>

                <div>
                  <label className="mb-2 block text-gray-700 font-medium font-sans">Assign Sites</label>
                  <div className="relative font-sans" ref={siteDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsSiteDropdownOpen((open) => !open)}
                      className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-4 py-2 text-left focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    >
                      <span className="truncate text-gray-700">
                        {formData.assignedSites.length > 0
                          ? formData.assignedSites.join(", ")
                          : "Select sites"}
                      </span>
                      <span className="text-gray-400 font-sans">
                        {isSiteDropdownOpen ? "▲" : "▼"}
                      </span>
                    </button>

                    {isSiteDropdownOpen && (
                      <div className="absolute z-10 mt-2 w-full rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                        <div className="max-h-48 space-y-2 overflow-y-auto font-sans">
                          {sitesList.map((site) => (
                            <label
                              key={site}
                              className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-gray-50 font-sans"
                            >
                              <input
                                type="checkbox"
                                checked={formData.assignedSites.includes(site)}
                                onChange={() => toggleAssignedSite(site)}
                                className="h-4 w-4 rounded border-gray-300 text-[#3D36BE] focus:ring-[#3D36BE]"
                              />
                              <span className="text-sm text-gray-700 font-sans">{site}</span>
                            </label>
                          ))}
                          {sitesList.length === 0 && (
                            <div className="p-2 text-sm text-gray-500 font-sans">No sites available</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2">
                  <span className="text-sm text-gray-500 font-sans font-medium">Status</span>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      id="activeContractorStatus"
                      checked={formData.enable}
                      onChange={(event) =>
                        setFormData({ ...formData, enable: event.target.checked })
                      }
                      className="h-5 w-5 rounded border-gray-300 accent-[#3D36BE]"
                    />
                    <span className="text-gray-700 font-sans">Active Contractor</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex gap-3 font-sans">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 rounded-lg px-4 py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-bold font-sans animate-all"
                  style={{ backgroundColor: "#3D36BE" }}
                >
                  {isSaving ? "Saving..." : editingContractor ? "Update Contractor" : "Create Contractor"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="flex-1 rounded-lg border border-[#3D35BE] bg-white text-[#3D35BE] transition-colors hover:bg-[#F0EFFF] disabled:opacity-50 disabled:cursor-not-allowed font-bold font-sans"
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
        title="Delete Contractor"
        message={`Are you sure you want to delete the contractor "${itemToDelete?.contractorName}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
        isLoading={isSaving}
      />
    </div>
  );
}

export default Contractor;
