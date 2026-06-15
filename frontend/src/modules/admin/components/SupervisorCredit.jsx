import { useState, useEffect, useCallback } from "react";
import { CreditCard, Edit, Plus, ReceiptIndianRupee, Trash2, X, Eye, Camera } from "lucide-react";
import toast from "react-hot-toast";
import useDebounce from "../../../shared/hooks/useDebounce";
import apiClient from "../../../shared/services/apiClient";
import Pagination from "../../../shared/components/Pagination";
import ConfirmModal from "../../../shared/components/ConfirmModal";

const LOAD_CREDITS_QUERY = `
  query GetSupervisorCreditsPage($pageNumber: Int!, $pageSize: Int!, $search: String, $supervisorName: String, $paymentMode: String) {
    supervisorCreditsPage(
      pageNumber: $pageNumber
      pageSize: $pageSize
      search: $search
      supervisorName: $supervisorName
      paymentMode: $paymentMode
    ) {
      items {
        id
        supervisorName
        amount
        paymentMode
        transactionId
        comment
        date
        receiptImage
      }
      totalCount
      pageNumber
      pageSize
      totalPages
    }
    allCredits: supervisorCredits {
      amount
      supervisorName
      paymentMode
      comment
      transactionId
      receiptImage
    }
  }
`;

const LOAD_SUPERVISORS_QUERY = `
  query GetUsers {
    users {
      name
      roleId
      enable
    }
  }
`;

const LOAD_ROLES_QUERY = `
  query GetRoles {
    roles {
      id
      roleName
    }
  }
`;

const CREATE_CREDIT_MUTATION = `
  mutation CreateSupervisorCredit($input: CreateSupervisorCreditInput!) {
    createSupervisorCredit(input: $input) {
      id
    }
  }
`;

const UPDATE_CREDIT_MUTATION = `
  mutation UpdateSupervisorCredit($input: UpdateSupervisorCreditInput!) {
    updateSupervisorCredit(input: $input) {
      id
    }
  }
`;

const DELETE_CREDIT_MUTATION = `
  mutation DeleteSupervisorCredit($id: Int!) {
    deleteSupervisorCredit(id: $id)
  }
`;

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

function SupervisorCredit() {
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

  const [credits, setCredits] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [selectedSupervisor, setSelectedSupervisor] = useState("all");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("all");
  const [overallTotalAmount, setOverallTotalAmount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [viewingImage, setViewingImage] = useState(null);

  const [allCredits, setAllCredits] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);

  const getFilteredMetrics = () => {
    const searchLower = searchQuery.toLowerCase().trim();
    
    let filteredCredits = allCredits;
    if (searchLower) {
      filteredCredits = filteredCredits.filter(c => 
        (c.supervisorName?.toLowerCase().includes(searchLower)) ||
        (c.comment?.toLowerCase().includes(searchLower))
      );
    }
    if (selectedSupervisor !== "all") {
      filteredCredits = filteredCredits.filter(c => c.supervisorName === selectedSupervisor);
    }
    if (selectedPaymentMode !== "all") {
      filteredCredits = filteredCredits.filter(c => c.paymentMode === selectedPaymentMode);
    }
    const totalCredit = filteredCredits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return {
      totalCredit
    };
  };

  const { totalCredit } = getFilteredMetrics();

  const getRemainingAmount = () => {
    let creditsToSum = allCredits;
    let expensesToSum = allExpenses.filter(e => e.type?.toLowerCase() === "expense");

    if (selectedSupervisor !== "all") {
      creditsToSum = allCredits.filter(c => c.supervisorName === selectedSupervisor);
      expensesToSum = expensesToSum.filter(e => e.createdBy?.toLowerCase() === selectedSupervisor.toLowerCase());
    } else {
      const supervisorLowerNames = supervisors.map(s => s.toLowerCase());
      expensesToSum = expensesToSum.filter(e => e.createdBy && supervisorLowerNames.includes(e.createdBy.toLowerCase()));
    }

    const totalCred = creditsToSum.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalExp = expensesToSum.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
    return totalCred - totalExp;
  };

  const getSupervisorRemainingAmount = (supervisorName) => {
    if (!supervisorName) return 0;
    const creditsToSum = allCredits.filter(c => c.supervisorName?.toLowerCase() === supervisorName.toLowerCase());
    const expensesToSum = allExpenses.filter(e => e.type?.toLowerCase() === "expense" && e.createdBy?.toLowerCase() === supervisorName.toLowerCase());

    const totalCred = creditsToSum.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalExp = expensesToSum.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
    return totalCred - totalExp;
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const renderFieldError = (message) =>
    message ? <p className="mt-1 text-xs text-[#EC3F3F] font-sans">{message}</p> : null;

  const getFieldClassName = (hasError) =>
    `w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 ${
      hasError
        ? "border-[#EC3F3F] focus:ring-[#EC3F3F]"
        : "border-gray-300 focus:ring-[#3D36BE]"
    }`;

  const validateForm = () => {
    const errors = {};
    if (!formData.supervisor) {
      errors.supervisor = "Supervisor is required.";
    }
    if (!formData.amount) {
      errors.amount = "Amount is required.";
    } else if (Number(formData.amount) <= 0) {
      errors.amount = "Amount must be greater than 0.";
    }
    if (formData.paymentMode !== "Cash" && !formData.transactionId.trim()) {
      errors.transactionId = `${
        formData.paymentMode === "Check" ? "Check ID" : "Transaction ID"
      } is required.`;
    }
    if (!formData.date) {
      errors.date = "Date is required.";
    }
    return errors;
  };

  const [formData, setFormData] = useState({
    supervisor: "",
    amount: "",
    paymentMode: "Cash",
    transactionId: "",
    comment: "",
    date: new Date().toISOString().split("T")[0],
    receiptImage: "",
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, JPEG, WEBP)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        receiptImage: reader.result
      }));
      toast.success("Image uploaded successfully!");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

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
          query: LOAD_CREDITS_QUERY,
          variables: {
            pageNumber,
            pageSize,
            search: trimmedSearch || null,
            supervisorName: selectedSupervisor === "all" ? null : selectedSupervisor,
            paymentMode: selectedPaymentMode === "all" ? null : selectedPaymentMode,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.errors) {
        setLoadError(response.data.errors[0].message);
        toast.error(response.data.errors[0].message);
        return;
      }

      const page = response.data.data.supervisorCreditsPage;
      setCredits(page.items);
      setTotalCount(page.totalCount);

      // Compute total sum and supervisors list
      const [allRes, usersRes, rolesRes, expensesRes] = await Promise.all([
        apiClient.post("/graphql", { query: `query { supervisorCredits { amount supervisorName paymentMode comment transactionId } }` }, { headers: { Authorization: `Bearer ${token}` } }),
        apiClient.post("/graphql", { query: LOAD_SUPERVISORS_QUERY }, { headers: { Authorization: `Bearer ${token}` } }),
        apiClient.post("/graphql", { query: LOAD_ROLES_QUERY }, { headers: { Authorization: `Bearer ${token}` } }),
        apiClient.post(
          "/graphql",
          {
            query: `
              query GetSupervisorExpenses {
                expensesPage(pageNumber: 1, pageSize: 10000) {
                  items {
                    amount
                    type
                    createdBy
                  }
                }
              }
            `
          },
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ]);

      if (expensesRes.data?.data?.expensesPage?.items) {
        setAllExpenses(expensesRes.data.data.expensesPage.items);
      }

      if (allRes.data?.data?.supervisorCredits) {
        const all = allRes.data.data.supervisorCredits;
        setAllCredits(all);
        const searchLower = trimmedSearch.toLowerCase();
        
        let filteredAll = all;
        if (searchLower) {
          filteredAll = filteredAll.filter(c => 
            (c.supervisorName?.toLowerCase().includes(searchLower)) ||
            (c.comment?.toLowerCase().includes(searchLower))
          );
        }
        if (selectedSupervisor !== "all") {
          filteredAll = filteredAll.filter(c => c.supervisorName === selectedSupervisor);
        }
        if (selectedPaymentMode !== "all") {
          filteredAll = filteredAll.filter(c => c.paymentMode === selectedPaymentMode);
        }

        setOverallTotalAmount(filteredAll.reduce((sum, item) => sum + (Number(item.amount) || 0), 0));
      }

      if (usersRes.data?.data?.users && rolesRes.data?.data?.roles) {
        const users = usersRes.data.data.users;
        const roles = rolesRes.data.data.roles;
        const supervisorRole = roles.find((r) => r.roleName?.toLowerCase().includes("supervis"));
        if (supervisorRole) {
          const supervisorNames = users
            .filter((u) => u.enable && u.roleId === supervisorRole.id)
            .map((u) => u.name);
          setSupervisors(supervisorNames);
        }
      }

    } catch (err) {
      setLoadError(err.message || "Failed to load credits.");
      toast.error(err.message || "Failed to load credits.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, pageNumber, pageSize, selectedSupervisor, selectedPaymentMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPageNumber(1);
  }, [debouncedSearch, selectedSupervisor, selectedPaymentMode]);

  const handleAddNew = () => {
    setEditingCredit(null);
    setFormData({
      supervisor: "",
      amount: "",
      paymentMode: "Cash",
      transactionId: "",
      comment: "",
      date: new Date().toISOString().split("T")[0],
      receiptImage: "",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (credit) => {
    setEditingCredit(credit);
    setFormData({
      supervisor: credit.supervisorName,
      amount: credit.amount.toString(),
      paymentMode: credit.paymentMode,
      transactionId: credit.transactionId || "",
      comment: credit.comment || "",
      date: credit.date ? credit.date.split("T")[0] : new Date().toISOString().split("T")[0],
      receiptImage: credit.receiptImage || "",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setIsSaving(true);
    const token = localStorage.getItem("authToken");
    try {
      const response = await apiClient.post(
        "/graphql",
        {
          query: DELETE_CREDIT_MUTATION,
          variables: { id: itemToDelete.id },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.errors) {
        toast.error(response.data.errors[0].message);
        return;
      }

      toast.success("Credit deleted successfully.");
      loadData(false);
    } catch (err) {
      toast.error(err?.message || "Failed to delete credit.");
    } finally {
      setIsSaving(false);
      setItemToDelete(null);
    }
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    const token = localStorage.getItem("authToken");
    try {
      if (editingCredit) {
        const response = await apiClient.post(
          "/graphql",
          {
            query: UPDATE_CREDIT_MUTATION,
            variables: {
              input: {
                id: editingCredit.id,
                supervisorName: formData.supervisor,
                amount: Number(formData.amount),
                paymentMode: formData.paymentMode,
                transactionId: formData.paymentMode === "Cash" ? null : formData.transactionId,
                comment: formData.comment,
                date: new Date(formData.date).toISOString(),
                receiptImage: formData.receiptImage || null,
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

        toast.success("Credit updated successfully.");
      } else {
        const response = await apiClient.post(
          "/graphql",
          {
            query: CREATE_CREDIT_MUTATION,
            variables: {
              input: {
                supervisorName: formData.supervisor,
                amount: Number(formData.amount),
                paymentMode: formData.paymentMode,
                transactionId: formData.paymentMode === "Cash" ? null : formData.transactionId,
                comment: formData.comment,
                date: new Date(formData.date).toISOString(),
                receiptImage: formData.receiptImage || null,
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

        toast.success("Credit added successfully.");
      }
      
      setIsModalOpen(false);
      loadData(false);
    } catch (err) {
      toast.error(err?.message || "Failed to save credit.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#F6F5FF] font-sans">

      {/* Stats Cards Section */}
      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Total Records Card */}
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
              <CreditCard className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[32px] font-bold text-[#353535] leading-none">{totalCount}</span>
            <span className="text-base text-[#4E5159] font-normal">Total Records</span>
          </div>
        </div>

        {/* Total Credit Card */}
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
              <ReceiptIndianRupee className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[32px] font-bold text-[#353535] leading-none">₹{totalCredit.toLocaleString("en-IN")}</span>
            <span className="text-base text-[#4E5159] font-normal">
              {selectedSupervisor === "all" ? "Total Credit (Overall)" : `Total Credit (${selectedSupervisor})`}
            </span>
          </div>
        </div>

        {/* Remaining Amount Card */}
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
              <ReceiptIndianRupee className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[32px] font-bold text-[#353535] leading-none">
              {(() => {
                const rem = getRemainingAmount();
                return rem < 0 
                  ? `-₹${Math.abs(rem).toLocaleString("en-IN")}` 
                  : `₹${rem.toLocaleString("en-IN")}`;
              })()}
            </span>
            <span className="text-base text-[#4E5159] font-normal">
              {selectedSupervisor === "all" ? "Remaining Amount (Overall)" : `Remaining Amount (${selectedSupervisor})`}
            </span>
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
          {/* Header Row: Search & Filters */}
          <div className="w-full bg-white p-6 border-b border-gray-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="w-full md:max-w-md relative flex items-center">
              <input
                type="text"
                placeholder="Search by supervisor name or comment..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white rounded-lg border border-[#C8D9EF] text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans"
              />
              <svg className="w-5 h-5 absolute left-4 text-[#717579]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
              <select
                value={selectedSupervisor}
                onChange={(event) => setSelectedSupervisor(event.target.value)}
                className="rounded-lg border border-[#C8D9EF] bg-white px-4 py-2.5 text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans font-medium w-full lg:w-auto"
              >
                <option value="all">All Supervisors</option>
                {supervisors.map((supervisor) => (
                  <option key={supervisor} value={supervisor}>
                    {supervisor}
                  </option>
                ))}
              </select>
              <select
                value={selectedPaymentMode}
                onChange={(event) => setSelectedPaymentMode(event.target.value)}
                className="rounded-lg border border-[#C8D9EF] bg-white px-4 py-2.5 text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans font-medium w-full lg:w-auto"
              >
                <option value="all">All Payment Modes</option>
                <option value="Cash">Cash</option>
                <option value="Check">Check</option>
                <option value="Online">Online</option>
              </select>
              <button
                type="button"
                onClick={handleAddNew}
                className="h-11 px-8 bg-[#3D35BE] text-white text-base font-bold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 font-sans w-full lg:w-auto shrink-0 whitespace-nowrap"
              >
                <Plus className="h-5 w-5" />
                Add Credit
              </button>
            </div>
          </div>

          {loadError && (
            <div className="mx-6 mt-4 rounded-lg bg-red-50 p-4 text-red-600 font-sans">
              {loadError}
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full min-w-[840px] border-collapse">
              <thead className="bg-[#F0EFFF] border-b border-[#9792E7]">
                <tr className="h-[68px]">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Supervisor</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Payment Mode</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Comment</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500 font-sans">
                      Loading supervisor credits...
                    </td>
                  </tr>
                )}
                {!isLoading && credits.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500 font-sans">
                      No records found.
                    </td>
                  </tr>
                )}
                {!isLoading && credits.map((credit) => (
                  <tr
                    key={credit.id}
                    className="h-[78px] transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                      {formatDate(credit.date)}
                    </td>
                    <td className="px-6 py-4 text-base text-[#5B6065] font-normal capitalize font-sans">
                      {credit.supervisorName}
                    </td>
                    <td className="px-6 py-4 text-base text-[#3E424E] font-semibold font-sans">
                      ₹{Number(credit.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                      {credit.paymentMode}
                    </td>
                    <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                      {credit.comment || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {credit.receiptImage && (
                          <button
                            type="button"
                            onClick={() => setViewingImage(credit.receiptImage)}
                            className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#3D35BE]"
                            title="View Receipt"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEdit(credit)}
                          className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#2945AC]"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(credit)}
                          className="rounded-lg p-2 transition-colors hover:bg-red-50 text-[#F15F7F]"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="block md:hidden bg-white divide-y divide-gray-100 font-sans">
            {isLoading && (
              <div className="p-6 text-center text-gray-500 font-sans">
                Loading...
              </div>
            )}
            {!isLoading && credits.length === 0 && (
              <div className="p-6 text-center text-gray-500 font-sans">
                No records found.
              </div>
            )}
            {!isLoading && credits.map((credit) => (
              <div
                key={credit.id}
                className="p-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 capitalize text-base font-sans">{credit.supervisorName}</p>
                    <p className="text-xs text-gray-500 font-sans">
                      SC-{credit.id.toString().padStart(3, '0')} • {formatDate(credit.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 font-sans">₹{Number(credit.amount).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-gray-500 font-sans">{credit.paymentMode}</p>
                  </div>
                </div>
                
                <div className="mb-4 space-y-2 text-sm text-[#5B6065]">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#3E424E] font-sans">Comment:</span>
                    <span className="truncate ml-4 font-sans">{credit.comment || "—"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                  {credit.receiptImage && (
                    <button
                      type="button"
                      onClick={() => setViewingImage(credit.receiptImage)}
                      className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#3D35BE]"
                      title="View Receipt"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleEdit(credit)}
                    className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#2945AC]"
                    title="Edit"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemToDelete(credit)}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 font-sans"
                  >
                    <Trash2 className="h-4 w-4 font-sans" />
                    Delete
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
                {editingCredit ? "Edit Supervisor Credit" : "Add Supervisor Credit"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supervisor selection */}
                <div>
                  <label className="mb-2 block text-gray-700 font-medium font-sans">
                    Supervisor <span className="text-[#EC3F3F]">*</span>
                  </label>
                  <select
                    value={formData.supervisor}
                    onChange={(event) =>
                      setFormData({ ...formData, supervisor: event.target.value })
                    }
                    className={`${getFieldClassName(Boolean(formErrors.supervisor))} font-sans`}
                    required
                  >
                    <option value="">Select supervisor</option>
                    {supervisors.map((supervisor) => (
                      <option key={supervisor} value={supervisor}>
                        {supervisor}
                      </option>
                    ))}
                  </select>
                  {renderFieldError(formErrors.supervisor)}
                </div>

                {/* Amount */}
                <div>
                  <label className="mb-2 block text-gray-700 font-medium font-sans">
                    Amount {formData.supervisor && (() => {
                      const rem = getSupervisorRemainingAmount(formData.supervisor);
                      const isNeg = rem < 0;
                      const formatted = isNeg ? `-₹${Math.abs(rem).toLocaleString("en-IN")}` : `₹${rem.toLocaleString("en-IN")}`;
                      return (
                        <span className="font-normal text-sm text-[#717579]">
                          {" "}(Remaining Amount: <span className={isNeg ? "text-[#EC3F3F]" : "text-[#3D35BE]"}>{formatted}</span>)
                        </span>
                      );
                    })()} <span className="text-[#EC3F3F]">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.amount}
                    onChange={(event) =>
                      setFormData({ ...formData, amount: event.target.value })
                    }
                    className={`${getFieldClassName(Boolean(formErrors.amount))} font-sans`}
                    placeholder="Amount in Rs."
                  />
                  {renderFieldError(formErrors.amount)}
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="mb-2 block text-gray-700 font-medium font-sans">
                    Payment Mode <span className="text-[#EC3F3F]">*</span>
                  </label>
                  <select
                    value={formData.paymentMode}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        paymentMode: event.target.value,
                        transactionId:
                          event.target.value === "Cash"
                            ? ""
                            : formData.transactionId,
                      })
                    }
                    className={`${getFieldClassName(Boolean(formErrors.paymentMode))} font-sans`}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                    <option value="Online">Online</option>
                  </select>
                  {renderFieldError(formErrors.paymentMode)}
                </div>

                {/* Transaction/Check ID or Date */}
                {(formData.paymentMode === "Check" ||
                  formData.paymentMode === "Online") ? (
                  <div>
                    <label className="mb-2 block text-gray-700 font-medium font-sans">
                      {formData.paymentMode === "Check"
                        ? "Check ID"
                        : "Transaction ID"} <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.transactionId}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          transactionId: event.target.value,
                        })
                      }
                      className={`${getFieldClassName(Boolean(formErrors.transactionId))} font-sans`}
                      placeholder={
                        formData.paymentMode === "Check"
                          ? "e.g. CHK98765"
                          : "e.g. TXN123456"
                      }
                    />
                    {renderFieldError(formErrors.transactionId)}
                  </div>
                ) : (
                  <div>
                    <label className="mb-2 block text-gray-700 font-medium font-sans">
                      Date <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(event) =>
                        setFormData({ ...formData, date: event.target.value })
                      }
                      className={`${getFieldClassName(Boolean(formErrors.date))} font-sans`}
                    />
                    {renderFieldError(formErrors.date)}
                  </div>
                )}

                {/* Date for Check/Online */}
                {(formData.paymentMode === "Check" ||
                  formData.paymentMode === "Online") && (
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-gray-700 font-medium font-sans">
                      Date <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(event) =>
                        setFormData({ ...formData, date: event.target.value })
                      }
                      className={`${getFieldClassName(Boolean(formErrors.date))} font-sans`}
                    />
                    {renderFieldError(formErrors.date)}
                  </div>
                )}

                {/* Comment */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-gray-700 font-medium font-sans">
                    Comment
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(event) =>
                      setFormData({ ...formData, comment: event.target.value })
                    }
                    rows={2}
                    className={`${getFieldClassName(false)} font-sans`}
                    placeholder="Enter comment or description"
                  />
                </div>

                {/* Upload Receipt */}
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700 font-sans">
                    Upload Bill/Receipt <span className="text-gray-400 font-normal font-sans">(Optional)</span>
                  </label>
                  <p className="mb-2 text-xs text-gray-500 font-sans">
                    Supported formats: PNG, JPG, JPEG, WEBP (Max size: 2MB)
                  </p>
                  <div className="flex flex-col gap-3 font-sans">
                    <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 transition-colors hover:border-[#3D36BE] hover:bg-gray-50 font-sans">
                      <Camera className="h-5 w-5 text-gray-500" />
                      <span className="text-sm text-gray-600 font-medium font-sans">
                        {formData.receiptImage ? "Change Photo / Image" : "Upload Image"}
                      </span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    
                    {formData.receiptImage && (
                      <div className="relative mt-1 w-full max-w-xs overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                        <img
                          src={formData.receiptImage}
                          alt="Receipt preview"
                          className="h-auto w-full max-h-48 object-contain bg-gray-50"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, receiptImage: "" }))}
                          className="absolute top-2 right-2 rounded-full bg-red-600 p-1 text-white hover:bg-red-700 transition-colors shadow"
                          title="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3 font-sans">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 rounded-lg px-4 py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-bold font-sans"
                  style={{ backgroundColor: "#3D36BE" }}
                >
                  {isSaving ? "Saving..." : editingCredit ? "Update Credit" : "Add Credit"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormErrors({});
                  }}
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
        title="Delete Credit"
        message={`Are you sure you want to delete this credit record? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
        isLoading={isSaving}
      />

      {/* Image Lightbox Modal */}
      {viewingImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="relative max-h-full max-w-4xl overflow-hidden rounded-lg bg-white p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 rounded-full bg-black/60 p-2 text-white hover:bg-black transition-colors"
              title="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="max-h-[85vh] overflow-auto">
              <img
                src={viewingImage}
                alt="Receipt Full Preview"
                className="h-auto max-h-[80vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupervisorCredit;
