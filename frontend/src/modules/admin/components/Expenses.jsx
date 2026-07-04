import { useState, useEffect } from "react";
import {
  CreditCard,
  Edit,
  Plus,
  ReceiptIndianRupee,
  Trash2,
  X,
  Eye,
  Camera,
  Filter,
} from "lucide-react";
import apiClient from "../../../shared/services/apiClient";
import toast from "react-hot-toast";
import useDebounce from "../../../shared/hooks/useDebounce";
import Pagination from "../../../shared/components/Pagination";
import ConfirmModal from "../../../shared/components/ConfirmModal";

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

function Expenses() {
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

  const [transactions, setTransactions] = useState([]);
  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [filterSite, setFilterSite] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [pageNumber, setPageNumber] = useState(1);
  const [viewingImage, setViewingImage] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [filterPopupState, setFilterPopupState] = useState(null);
  const pageSize = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("Expense"); // "Income" or "Expense"
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    siteId: "",
    categoryId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paymentMode: "Cash",
    transactionId: "",
    receiptImage: "",
    createdBy: "",
  });

  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type is image
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, JPEG, WEBP)");
      return;
    }

    // Validate size (2MB max)
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

  const [totalCount, setTotalCount] = useState(0); // Will be computed dynamically
  const [allTransactions, setAllTransactions] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadData();
  }, [pageNumber, debouncedSearch, columnFilters, startDate, endDate]);

  useEffect(() => {
    setPageNumber(1);
  }, [debouncedSearch, columnFilters, startDate, endDate]);



  const loadMetadata = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.post(
        "/graphql",
        {
          query: `
            query GetExpensesMetadata {
              sites { id siteName }
              categories { id name }
            }
          `
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response?.data?.data) {
        setSites(response.data.data.sites || []);
        setCategories(response.data.data.categories || []);
      }
    } catch (error) {
      console.error("Failed to load metadata", error);
      toast.error(error?.message || "Failed to load metadata");
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.post(
        "/graphql",
        {
          query: `
            query GetAllExpenses($startDate: DateTime, $endDate: DateTime) {
              expenses(startDate: $startDate, endDate: $endDate) {
                id
                title
                siteId
                site { siteName }
                categoryId
                category { name }
                amount
                paymentMode
                transactionId
                date
                type
                receiptImage
                createdBy
              }
            }
          `,
          variables: {
            startDate: startDate ? new Date(startDate).toISOString() : null,
            endDate: endDate ? (() => { const end = new Date(endDate); end.setHours(23, 59, 59, 999); return end.toISOString(); })() : null
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response?.data?.data) {
        setAllTransactions(response.data.data.expenses || []);
      }
    } catch (error) {
      console.error("Failed to load expenses data", error);
      toast.error(error?.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAll = allTransactions.filter((t) => {
    const matchesSite = filterSite === "all" || String(t.siteId) === String(filterSite);
    const catName = t.category?.name || "";
    const matchesSearch =
      !debouncedSearch ||
      t.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (t.transactionId && t.transactionId.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
      catName.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    if (!matchesSite || !matchesSearch) return false;

    // Apply column filters
    for (const [col, selectedValues] of Object.entries(columnFilters)) {
      if (selectedValues && selectedValues.length > 0) {
        let val = t[col];
        if (col === 'site') val = t.site?.siteName || "—";
        if (col === 'category') val = t.category?.name || "—";
        if (col === 'date') val = formatDate(t.date);
        
        if (!selectedValues.includes(String(val))) {
          return false;
        }
      }
    }
    return true;
  });

  const currentTotalCount = filteredAll.length;
  const startIndex = (pageNumber - 1) * pageSize;
  const currentTransactions = filteredAll.slice(startIndex, startIndex + pageSize);

  const toggleFilter = (col, value) => {
    setColumnFilters(prev => {
      const current = prev[col] || [];
      if (current.includes(value)) {
        return { ...prev, [col]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [col]: [...current, value] };
      }
    });
    setPageNumber(1); // Reset to first page when filter changes
  };

  const renderFilterHeader = (title, colKey, dataExtractor) => {
    const allValues = colKey === "date" ? [] : Array.from(new Set(allTransactions.map(dataExtractor))).filter(Boolean);
    const isActive = (columnFilters[colKey] && columnFilters[colKey].length > 0) || (colKey === "date" && (startDate || endDate));
    
    return (
      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans whitespace-nowrap">
        <div className="flex items-center gap-2">
          {title}
          <button 
            onClick={(e) => {
              if (activeFilterColumn === colKey) {
                setActiveFilterColumn(null);
                setFilterPopupState(null);
              } else {
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveFilterColumn(colKey);
                if (colKey === "date") {
                  setTempStartDate(startDate);
                  setTempEndDate(endDate);
                }
                setFilterPopupState({ colKey, title, rect, allValues });
              }
            }}
            className={`p-1 rounded transition-colors ${isActive ? 'bg-[#3D35BE] text-white' : 'text-[#717579] hover:bg-gray-200'}`}
          >
            <Filter className="h-3.5 w-3.5" />
          </button>
        </div>
      </th>
    );
  };

  const totalIncome = filteredAll.filter((t) => t.type === "Income").length;
  const totalExpense = filteredAll.filter((t) => t.type === "Expense").length;

  const handleAddNew = (type) => {
    setModalType(type);
    setEditingItem(null);
    setFormData({
      title: "",
      siteId: "",
      categoryId: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      paymentMode: "Cash",
      transactionId: "",
      receiptImage: "",
      createdBy: "",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (transaction) => {
    setModalType(transaction.type);
    setEditingItem(transaction);
    setFormData({
      title: transaction.title,
      siteId: transaction.siteId || "",
      categoryId: transaction.categoryId || "",
      amount: String(transaction.amount),
      date: transaction.date.split("T")[0],
      paymentMode: transaction.paymentMode || "Cash",
      transactionId: transaction.transactionId || "",
      receiptImage: transaction.receiptImage || "",
      createdBy: transaction.createdBy || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("authToken");
      await apiClient.post(
        "/graphql",
        {
          query: `mutation DeleteExpense($id: Int!) { deleteExpense(id: $id) }`,
          variables: { id: parseInt(itemToDelete) }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Record deleted");
      loadData();
    } catch (error) {
      toast.error(error?.message || "Failed to delete record");
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    setIsSaving(true);
    try {
      const token = localStorage.getItem("authToken");
      const isIncome = modalType === "Income";
      const variables = {
        input: editingItem 
          ? {
              id: parseInt(editingItem.id),
              title: formData.title,
              siteId: formData.siteId ? parseInt(formData.siteId) : null,
              categoryId: (!isIncome && formData.categoryId) ? parseInt(formData.categoryId) : null,
              amount: parseFloat(formData.amount),
              type: modalType,
              date: new Date(formData.date).toISOString(),
              paymentMode: formData.paymentMode,
              transactionId: formData.paymentMode === "Cash" ? null : formData.transactionId,
              receiptImage: formData.receiptImage || null,
              modifiedBy: getActorName(),
            }
          : {
              title: formData.title,
              siteId: formData.siteId ? parseInt(formData.siteId) : null,
              categoryId: (!isIncome && formData.categoryId) ? parseInt(formData.categoryId) : null,
              amount: parseFloat(formData.amount),
              type: modalType,
              date: new Date(formData.date).toISOString(),
              paymentMode: formData.paymentMode,
              transactionId: formData.paymentMode === "Cash" ? null : formData.transactionId,
              receiptImage: formData.receiptImage || null,
              createdBy: getActorName(),
            }
      };
      
      const query = editingItem
        ? `mutation UpdateExpense($input: UpdateExpenseInput!) { updateExpense(input: $input) { id } }`
        : `mutation CreateExpense($input: CreateExpenseInput!) { createExpense(input: $input) { id } }`;
        
      const response = await apiClient.post(
        "/graphql",
        { query, variables },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data?.errors) {
        toast.error(response.data.errors[0].message);
        return;
      }
      
      toast.success(`${modalType} ${editingItem ? "updated" : "added"} successfully`);
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error(error?.message || "Failed to save record");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#F6F5FF] font-sans">

      {/* Stats Cards Section */}
      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Total Income Card */}
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
            <span className="text-[32px] font-bold text-[#353535] leading-none">{totalIncome}</span>
            <span className="text-base text-[#4E5159] font-normal">Total Income Records</span>
          </div>
        </div>

        {/* Total Expenses Card */}
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
            <span className="text-[32px] font-bold text-[#353535] leading-none">{totalExpense}</span>
            <span className="text-base text-[#4E5159] font-normal">Total Expense Records</span>
          </div>
        </div>
      </div>

      {/* Main Container Card (Table & Actions) */}
      <div 
        className="w-full bg-white flex flex-col gap-7" 
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
          className="w-full flex flex-col overflow-hidden rounded-lg" 
          style={{ outline: '1px rgba(61, 53, 190, 0.26) solid' }}
        >
          {/* Header Row: Search & Site Filter */}
          <div className="w-full bg-white p-6 border-b border-gray-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="w-full sm:max-w-md relative flex items-center">
              <input
                type="text"
                placeholder="Search by description, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white rounded-lg border border-[#C8D9EF] text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans"
              />
              <svg className="w-5 h-5 absolute left-4 text-[#717579]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleAddNew("Income")}
                  className="h-11 px-8 bg-[#3D35BE] text-white text-base font-bold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 font-sans w-full sm:w-auto shrink-0 whitespace-nowrap"
                >
                  <Plus className="h-5 w-5" />
                  Add Income
                </button>
                <button
                  type="button"
                  onClick={() => handleAddNew("Expense")}
                  className="h-11 px-8 border border-[#3D35BE] text-[#3D35BE] bg-white text-base font-bold rounded-lg transition-colors hover:bg-[#F0EFFF] disabled:opacity-60 flex items-center justify-center gap-2 font-sans w-full sm:w-auto shrink-0 whitespace-nowrap"
                >
                  <Plus className="h-5 w-5 text-[#3D35BE]" />
                  Add Expense
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto w-full font-sans">
            <table className="w-full min-w-[860px] border-collapse">
              <thead className="bg-[#F0EFFF] border-b border-[#9792E7]">
                <tr className="h-[68px]">
                  {renderFilterHeader("Date", "date", t => formatDate(t.date))}
                  {renderFilterHeader("Site", "site", t => t.site?.siteName || "—")}
                  {renderFilterHeader("Category", "category", t => t.category?.name || "—")}
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans whitespace-nowrap">Amount</th>
                  {renderFilterHeader("Payment Mode", "paymentMode", t => t.paymentMode)}
                  {renderFilterHeader("Type", "type", t => t.type)}
                  {renderFilterHeader("Added By", "createdBy", t => t.createdBy || (t.type === "Income" ? "Admin" : "Supervisor"))}
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans whitespace-nowrap">Description</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-8 text-center text-gray-500 font-sans">
                      Loading income and expenses...
                    </td>
                  </tr>
                ) : currentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-8 text-center text-gray-500 font-sans">
                      No data available
                    </td>
                  </tr>
                ) : (
                  currentTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="h-[78px] transition-colors hover:bg-gray-50/50"
                    >
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans whitespace-nowrap">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                        {transaction.site?.siteName || "—"}
                      </td>
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                        {transaction.category?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-base text-[#3E424E] font-semibold font-sans">
                        ₹{Number(transaction.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                        {transaction.paymentMode}
                      </td>
                      <td className="px-6 py-4">
                        {transaction.type === "Income" ? (
                          <span className="inline-flex items-center justify-center rounded-lg bg-[#EFFFFE] border border-[#A0EBE5] text-sm font-medium text-[#01B6A8] px-3 py-1 font-sans">
                            Income
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center rounded-lg bg-[#FFF1F0] border border-[#F5CDD5] text-base font-semibold text-[#F15F7F] px-3 py-1 font-sans">
                            Expense
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                        {transaction.createdBy || (transaction.type === "Income" ? "Admin" : "Supervisor")}
                      </td>
                      <td className="px-6 py-4 text-base text-[#5B6065] font-normal capitalize font-sans">
                        <div 
                          className="max-w-[200px] lg:max-w-[250px] truncate"
                          title={transaction.title || ""}
                        >
                          {transaction.title || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {transaction.receiptImage && (
                            <button
                              type="button"
                              onClick={() => setViewingImage(transaction.receiptImage)}
                              className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#3D35BE]"
                              title="View Receipt"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEdit(transaction)}
                            className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#2945AC]"
                            title="Edit"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(transaction.id)}
                            className="rounded-lg p-2 transition-colors hover:bg-red-50 text-[#F15F7F]"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="block md:hidden bg-white divide-y divide-gray-100 font-sans">
            {isLoading ? (
              <div className="p-6 text-center text-gray-500 font-sans">
                Loading income and expenses...
              </div>
            ) : currentTransactions.length === 0 ? (
              <div className="p-6 text-center text-gray-500 font-sans">
                No data available
              </div>
            ) : (
              currentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="p-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="min-w-0 pr-4">
                      <p 
                        className="font-semibold text-gray-900 capitalize text-base font-sans truncate"
                        title={transaction.title || ""}
                      >
                        {transaction.title || "—"}
                      </p>
                      <p className="text-xs text-gray-500 font-sans">
                        {transaction.site?.siteName || "—"}
                      </p>
                    </div>
                    {transaction.type === "Income" ? (
                      <span className="inline-flex items-center justify-center rounded-lg bg-[#EFFFFE] border border-[#A0EBE5] text-xs font-semibold text-[#01B6A8] px-2.5 py-1 font-sans whitespace-nowrap shrink-0">
                        Income
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-lg bg-[#FFF1F0] border border-[#F5CDD5] text-xs font-semibold text-[#F15F7F] px-2.5 py-1 font-sans whitespace-nowrap shrink-0">
                        Expense
                      </span>
                    )}
                  </div>

                  <div className="mb-4 space-y-2 text-sm text-[#5B6065]">
                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-[#3E424E] font-sans shrink-0">Date:</span>
                      <span className="font-sans text-right break-words">{formatDate(transaction.date)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-[#3E424E] font-sans shrink-0">Category:</span>
                      <span className="font-sans text-right break-words">{transaction.category?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-[#3E424E] font-sans shrink-0">Amount:</span>
                      <span className="font-semibold text-gray-900 font-sans text-right break-words">
                        ₹{Number(transaction.amount).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-[#3E424E] font-sans shrink-0">Payment Mode:</span>
                      <span className="font-sans text-right break-words">{transaction.paymentMode}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-[#3E424E] font-sans shrink-0">Added By:</span>
                      <span className="font-sans text-right break-words">{transaction.createdBy || (transaction.type === "Income" ? "Admin" : "Supervisor")}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                    {transaction.receiptImage && (
                      <button
                        type="button"
                        onClick={() => setViewingImage(transaction.receiptImage)}
                        className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#3D35BE]"
                        title="View Receipt"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEdit(transaction)}
                      className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#2945AC]"
                      title="Edit"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(transaction.id)}
                      className="rounded-lg p-2 transition-colors hover:bg-red-50 text-[#F15F7F]"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-white">
            <Pagination
              pageNumber={pageNumber}
              pageSize={pageSize}
              totalCount={currentTotalCount}
              onPageChange={(nextPage) => setPageNumber(nextPage)}
            />
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 font-sans">
                  {editingItem ? `Edit ${modalType}` : `Add ${modalType}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 font-sans">
                      Site <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.siteId}
                      onChange={(e) =>
                        setFormData({ ...formData, siteId: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE] font-sans"
                    >
                      <option value="" disabled>
                        Select site
                      </option>
                      {sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.siteName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {modalType === "Expense" ? (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 font-sans">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={formData.categoryId}
                          onChange={(e) =>
                            setFormData({ ...formData, categoryId: e.target.value })
                          }
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE] font-sans"
                        >
                          <option value="" disabled>
                            Select category
                          </option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 font-sans">
                          Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={formData.amount}
                          onChange={(e) =>
                            setFormData({ ...formData, amount: e.target.value })
                          }
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE] font-sans"
                          placeholder="Amount in Rs."
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 font-sans">
                        Amount <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE] font-sans"
                        placeholder="Amount in Rs."
                      />
                    </div>
                  )}

                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 font-sans">
                        Payment Mode <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.paymentMode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentMode: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE] font-sans"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Online">Online</option>
                        <option value="Check">Check</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 font-sans">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) =>
                          setFormData({ ...formData, date: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE] font-sans"
                      />
                    </div>
                  </>


                  {(formData.paymentMode === "Check" ||
                    formData.paymentMode === "Online") ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 font-sans">
                        Transaction ID / Check Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.transactionId}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            transactionId: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE] font-sans"
                        placeholder={
                          formData.paymentMode === "Check"
                            ? "e.g. CHK98765"
                            : "e.g. TXN123456"
                        }
                      />
                    </div>
                  ) : (
                    <div />
                  )}

                  <div className="col-span-full">
                    <label className="mb-2 block text-sm font-medium text-gray-700 font-sans">
                      Description
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE] font-sans"
                      placeholder={
                        modalType === "Expense"
                          ? "e.g. Cement Purchase"
                          : "e.g. Client Payment Advance"
                      }
                    />
                  </div>

                  {/* Upload Receipt */}
                  <div className="col-span-full font-sans">
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

                <div className="mt-8 flex gap-3 font-sans">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 rounded-lg px-4 py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-bold font-sans"
                    style={{ backgroundColor: "#3D36BE" }}
                  >
                    {isSaving ? "Saving..." : `${editingItem ? "Update" : "Add"} ${modalType}`}
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
              </form>
            </div>
          </div>
        </div>
      )}

      {viewingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative max-w-3xl w-full overflow-hidden rounded-lg bg-white p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors z-10"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center justify-center p-4 bg-gray-50 min-h-[300px]">
              <img
                src={viewingImage}
                alt="Receipt Bill"
                className="max-h-[80vh] w-auto max-w-full object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
        isLoading={isDeleting}
      />

      {/* Global Filter Popup */}
      {filterPopupState && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => { setActiveFilterColumn(null); setFilterPopupState(null); }}
          />
          <div 
            className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl"
            style={{ 
              top: filterPopupState.rect.bottom + 4, 
              left: filterPopupState.rect.left,
              width: 192 
            }}
          >
            <div className="p-2 border-b border-gray-100 flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-500">Filter {filterPopupState.title}</span>
              <button 
                onClick={() => { 
                  if (filterPopupState.colKey === "date") {
                    setStartDate("");
                    setEndDate("");
                    setTempStartDate("");
                    setTempEndDate("");
                  } else {
                    setColumnFilters(p => ({...p, [filterPopupState.colKey]: []})); 
                  }
                  setPageNumber(1); 
                  setActiveFilterColumn(null); 
                  setFilterPopupState(null);
                }} 
                className="text-xs text-[#3D35BE] hover:underline"
              >
                Clear
              </button>
            </div>
            {filterPopupState.colKey === "date" ? (
              <div className="p-3 flex flex-col gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                  <input type="date" value={tempStartDate} onChange={e => setTempStartDate(e.target.value)} className="w-full border rounded p-1 text-sm text-[#353535]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                  <input type="date" value={tempEndDate} onChange={e => setTempEndDate(e.target.value)} className="w-full border rounded p-1 text-sm text-[#353535]" />
                </div>
                <button 
                  onClick={() => { 
                    setStartDate(tempStartDate);
                    setEndDate(tempEndDate);
                    setActiveFilterColumn(null); 
                    setFilterPopupState(null); 
                  }}
                  className="bg-[#3D35BE] text-white rounded py-1.5 text-sm font-semibold w-full mt-1 hover:bg-[#2d2794] transition-colors"
                >
                  Apply
                </button>
              </div>
            ) : (
              <div className="p-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {filterPopupState.allValues.map(val => (
                  <label key={val} className="flex items-center gap-2 text-sm text-[#353535] cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input 
                      type="checkbox" 
                      checked={(columnFilters[filterPopupState.colKey] || []).includes(String(val))}
                      onChange={() => toggleFilter(filterPopupState.colKey, String(val))}
                      className="rounded border-gray-300 text-[#3D35BE] focus:ring-[#3D35BE]"
                    />
                    <span className="truncate">{val}</span>
                  </label>
                ))}
                {filterPopupState.allValues.length === 0 && <span className="text-xs text-gray-400 p-1">No options</span>}
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}

export default Expenses;
