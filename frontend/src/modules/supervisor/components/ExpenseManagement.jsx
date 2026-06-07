import { useState, useEffect } from "react";
import { Camera, Plus, ReceiptIndianRupee, X, Filter, Eye } from "lucide-react";
import apiClient from "../../../shared/services/apiClient";
import toast from "react-hot-toast";
import Pagination from "../../../shared/components/Pagination";

const CREATE_EXPENSE_MUTATION = `
  mutation CreateExpense($input: CreateExpenseInput!) {
    createExpense(input: $input) {
      id
    }
  }
`;

function ExpenseManagement({ selectedSite, user }) {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTransactionType, setFilterTransactionType] = useState("All");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalExpensesAmount, setTotalExpensesAmount] = useState(0);
  const [viewingImage, setViewingImage] = useState(null);
  const pageSize = 10;

  const [formData, setFormData] = useState({
    amount: "",
    categoryId: "",
    title: "",
    date: new Date().toISOString().split("T")[0],
    paymentMode: "Cash",
    transactionId: "",
    receiptImage: null,
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type is image
    if (!file.type.startsWith("image/")) {
      setFormErrors(prev => ({
        ...prev,
        receiptImage: "File must be an image (PNG, JPG, JPEG, WEBP)."
      }));
      toast.error("Please upload an image file");
      return;
    }

    // Validate size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setFormErrors(prev => ({
        ...prev,
        receiptImage: "Image size exceeds the 2MB limit."
      }));
      toast.error("Image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        receiptImage: reader.result
      }));
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.receiptImage;
        return copy;
      });
      toast.success("Image uploaded successfully!");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const loadData = async () => {
    if (!selectedSite) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.post(
        "/graphql",
        {
          query: `
            query GetExpensesAndCategories($pageNumber: Int!, $pageSize: Int!, $siteId: Int) {
              expensesPage(pageNumber: $pageNumber, pageSize: $pageSize, siteId: $siteId) {
                items {
                  id
                  title
                  siteId
                  categoryId
                  category { name }
                  amount
                  paymentMode
                  transactionId
                  date
                  type
                  receiptImage
                }
                totalCount
              }
              expenses {
                amount
                siteId
              }
              categories { id name }
            }
          `,
          variables: {
            pageNumber,
            pageSize,
            siteId: parseInt(selectedSite.id),
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.data) {
        const pageItems = response.data.data.expensesPage?.items || [];
        setExpenses(pageItems);
        setTotalCount(response.data.data.expensesPage?.totalCount || 0);

        const allExpenses = response.data.data.expenses || [];
        const siteExpenses = allExpenses.filter(
          e => String(e.siteId) === String(selectedSite.id)
        );
        const total = siteExpenses.reduce((sum, e) => sum + e.amount, 0);
        setTotalExpensesAmount(total);

        const loadedCategories = response.data.data.categories || [];
        setCategories(loadedCategories);
        
        if (loadedCategories.length > 0 && !formData.categoryId) {
          setFormData(prev => ({ ...prev, categoryId: loadedCategories[0].id }));
        }
      }
    } catch (error) {
      toast.error(error?.message || "Failed to load expenses data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSite, pageNumber]);

  useEffect(() => {
    setPageNumber(1);
  }, [selectedSite]);

  const validateForm = () => {
    const errors = {};
    if (!formData.amount) {
      errors.amount = "Amount is required.";
    } else if (Number(formData.amount) <= 0) {
      errors.amount = "Amount must be greater than 0.";
    }
    if (!formData.categoryId) {
      errors.categoryId = "Category is required.";
    }
    if (!formData.title.trim()) {
      errors.title = "Title is required.";
    }
    if (!formData.date) {
      errors.date = "Date is required.";
    }
    if (formData.paymentMode !== "Cash" && !formData.transactionId.trim()) {
      errors.transactionId = `${
        formData.paymentMode === "Check" ? "Check ID" : "Transaction ID"
      } is required.`;
    }
    // Receipt image is optional
    return errors;
  };

  const getFieldClassName = (hasError) =>
    `w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 ${
      hasError
        ? "border-[#EC3F3F] focus:ring-[#EC3F3F]"
        : "border-gray-300 focus:ring-[#3D36BE]"
    }`;

  const renderFieldError = (message) =>
    message ? <p className="mt-1 text-xs text-[#EC3F3F]">{message}</p> : null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fix the errors below.");
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.post(
        "/graphql",
        {
          query: CREATE_EXPENSE_MUTATION,
          variables: {
            input: {
              title: formData.title,
              siteId: Number(selectedSite.id),
              categoryId: Number(formData.categoryId),
              amount: Number(formData.amount),
              paymentMode: formData.paymentMode,
              transactionId: formData.paymentMode === "Cash" ? null : formData.transactionId,
              date: new Date(formData.date).toISOString(),
              type: "Expense", // Default to expense for supervisor
              createdBy: user?.name || "supervisor",
              receiptImage: formData.receiptImage,
            },
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.errors) {
        toast.error(response.data.errors[0].message);
        return;
      }

      toast.success("Expense added successfully!");
      setIsAdding(false);
      setFormData({
        amount: "",
        categoryId: categories.length > 0 ? categories[0].id : "",
        title: "",
        date: new Date().toISOString().split("T")[0],
        paymentMode: "Cash",
        transactionId: "",
        receiptImage: null,
      });
      loadData();
    } catch (error) {
      toast.error(error?.message || "Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedSite) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-red-800">
            You are not assigned to any site. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Current Site
        </p>
        <h3 className="text-gray-900">{selectedSite.siteName}</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm col-span-2">
          <div className="mb-1 flex items-center gap-2 text-sm text-gray-600">
            <ReceiptIndianRupee className="h-4 w-4" />
            <p>Total Recorded Expenses for Site</p>
          </div>
          <h3 className="text-gray-900">₹{totalExpensesAmount.toLocaleString("en-IN")}</h3>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-4 text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#3D36BE" }}
      >
        <Plus className="h-5 w-5" />
        Add New Expense
      </button>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading expenses...</div>
          ) : expenses.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No expenses found for this site.</div>
          ) : (
            expenses.map((expense) => (
              <div
                key={expense.id}
                className="p-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="rounded px-2 py-1 text-xs"
                        style={{
                          backgroundColor:
                            expense.type === "Income"
                              ? "#DCFCE7"
                              : "#FEE2E2",
                          color:
                            expense.type === "Income"
                              ? "#15803D"
                              : "#DC2626",
                        }}
                      >
                        {expense.type}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {expense.category?.name || "Uncategorized"}
                      </span>
                    </div>
                    <p className="mb-1 text-gray-900 font-medium">{expense.title}</p>
                    <p className="text-sm text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                    {expense.paymentMode !== "Cash" && (
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span>{expense.paymentMode} • {expense.transactionId}</span>
                        {expense.receiptImage && (
                          <button
                            type="button"
                            onClick={() => setViewingImage(expense.receiptImage)}
                            className="inline-flex items-center gap-1 text-[#3D36BE] hover:underline"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View Receipt</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg text-gray-900 font-semibold">
                      ₹{expense.amount.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Pagination */}
        <div className="border-t border-gray-200 px-4 py-3">
          <Pagination
            pageNumber={pageNumber}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={(nextPage) => setPageNumber(nextPage)}
          />
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-gray-900">Add New Expense</h3>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Col 1: Title */}
                  <div>
                    <label className="mb-2 block text-gray-700">
                      Title <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(event) =>
                        setFormData({ ...formData, title: event.target.value })
                      }
                      className={getFieldClassName(Boolean(formErrors.title))}
                      placeholder="e.g. Cement Purchase"
                      required
                    />
                    {renderFieldError(formErrors.title)}
                  </div>

                  {/* Col 2: Amount */}
                  <div>
                    <label className="mb-2 block text-gray-700">
                      Amount (₹) <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.amount}
                      onChange={(event) =>
                        setFormData({ ...formData, amount: event.target.value })
                      }
                      className={getFieldClassName(Boolean(formErrors.amount))}
                      placeholder="Enter amount"
                      required
                    />
                    {renderFieldError(formErrors.amount)}
                  </div>

                  {/* Col 1: Category */}
                  <div>
                    <label className="mb-2 block text-gray-700">
                      Category <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <select
                      value={formData.categoryId}
                      onChange={(event) =>
                        setFormData({ ...formData, categoryId: event.target.value })
                      }
                      className={getFieldClassName(Boolean(formErrors.categoryId))}
                      required
                    >
                      <option value="" disabled>Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {renderFieldError(formErrors.categoryId)}
                  </div>

                  {/* Col 2: Date */}
                  <div>
                    <label className="mb-2 block text-gray-700">
                      Date <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(event) =>
                        setFormData({ ...formData, date: event.target.value })
                      }
                      className={getFieldClassName(Boolean(formErrors.date))}
                      required
                    />
                    {renderFieldError(formErrors.date)}
                  </div>

                  {/* Col 1: Payment Mode */}
                  <div>
                    <label className="mb-2 block text-gray-700">
                      Payment Mode <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <select
                      value={formData.paymentMode}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          paymentMode: event.target.value,
                          transactionId: event.target.value === "Cash" ? "" : formData.transactionId,
                        })
                      }
                      className={getFieldClassName(Boolean(formErrors.paymentMode))}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Check">Check</option>
                      <option value="Online">Online</option>
                    </select>
                    {renderFieldError(formErrors.paymentMode)}
                  </div>

                  {/* Col 2: Check Number / Transaction ID (only if not Cash) */}
                  {(formData.paymentMode === "Check" || formData.paymentMode === "Online") ? (
                    <div>
                      <label className="mb-2 block text-gray-700">
                        {formData.paymentMode === "Check" ? "Check Number" : "Transaction ID"}{" "}
                        <span className="text-[#EC3F3F]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.transactionId}
                        onChange={(event) =>
                          setFormData({ ...formData, transactionId: event.target.value })
                        }
                        className={getFieldClassName(Boolean(formErrors.transactionId))}
                        placeholder={
                          formData.paymentMode === "Check"
                            ? "e.g. CHK123456"
                            : "e.g. TXN987654321"
                        }
                        required
                      />
                      {renderFieldError(formErrors.transactionId)}
                    </div>
                  ) : (
                    <div /> /* empty spacer to keep grid alignment */
                  )}

                  {/* Upload Receipt — full width, always last */}
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-gray-700 font-medium">
                      Upload Bill/Receipt{" "}
                      <span className="text-sm font-normal text-gray-400">(Optional)</span>
                    </label>
                    <p className="mb-2 text-xs text-gray-500">
                      Supported formats: PNG, JPG, JPEG, WEBP (Max size: 2MB)
                    </p>
                    <div className="flex flex-col gap-3">
                      <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 transition-colors hover:border-[#3D36BE] hover:bg-gray-50">
                        <Camera className="h-5 w-5 text-gray-500" />
                        <span className="text-sm text-gray-600 font-medium">
                          {formData.receiptImage ? "Change Photo / Image" : "Take Photo / Upload Image"}
                        </span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      {renderFieldError(formErrors.receiptImage)}
                      {formData.receiptImage && (
                        <div className="relative mt-2 w-full max-w-xs overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                          <img
                            src={formData.receiptImage}
                            alt="Receipt preview"
                            className="h-auto w-full max-h-48 object-contain bg-gray-50"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, receiptImage: null }))}
                            className="absolute top-2 right-2 rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700 transition-colors shadow"
                            title="Remove image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-lg px-4 py-3 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#3D36BE" }}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Expense"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setFormErrors({});
                      setFormData(prev => ({ ...prev, receiptImage: null }));
                    }}
                    disabled={isSubmitting}
                    className="flex-1 rounded-lg bg-gray-200 px-4 py-3 text-gray-700 transition-colors hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}

export default ExpenseManagement;
