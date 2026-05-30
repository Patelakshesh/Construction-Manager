import { useState } from "react";
import {
  CreditCard,
  Edit,
  Plus,
  ReceiptIndianRupee,
  Trash2,
  X,
} from "lucide-react";

const initialTransactions = [
  {
    id: "INC-001",
    title: "Client Payment Advance",
    type: "Income",
    site: "Downtown Plaza",
    category: "Hardware",
    amount: "Rs. 2,00,000",
    date: "2026-04-28",
    paymentMode: "Online",
  },
  {
    id: "EXP-001",
    title: "Cement Purchase",
    type: "Expense",
    site: "Downtown Plaza",
    category: "Materials",
    amount: "Rs. 48,500",
    date: "2026-04-27",
    paymentMode: "Check",
  },
  {
    id: "EXP-002",
    title: "Electrical Contractor Payment",
    type: "Expense",
    site: "Riverside Complex",
    category: "Contractor",
    amount: "Rs. 75,000",
    date: "2026-04-26",
    paymentMode: "Online",
  },
  {
    id: "EXP-003",
    title: "Safety Equipment",
    type: "Expense",
    site: "Industrial Park",
    category: "Supplies",
    amount: "Rs. 18,250",
    date: "2026-04-25",
    paymentMode: "Cash",
  },
  {
    id: "EXP-004",
    title: "Worker Transport",
    type: "Expense",
    site: "Suburban Mall",
    category: "Logistics",
    amount: "Rs. 12,800",
    date: "2026-04-24",
    paymentMode: "Cash",
  },
  {
    id: "EXP-005",
    title: "Steel Delivery",
    type: "Expense",
    site: "Tech Campus",
    category: "Materials",
    amount: "Rs. 96,400",
    date: "2026-04-23",
    paymentMode: "Online",
  },
];

const siteOptions = [
  "Downtown Plaza",
  "Riverside Complex",
  "Industrial Park",
  "Suburban Mall",
  "Tech Campus",
];

function Expenses() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [filterSite, setFilterSite] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("Expense"); // "Income" or "Expense"
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    site: "",
    category: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paymentMode: "Cash",
    transactionId: "",
  });

  const sites = ["all", ...new Set(siteOptions)];

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSite = filterSite === "all" || transaction.site === filterSite;
    const matchesSearch =
      transaction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (transaction.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSite && matchesSearch;
  });

  const handleAddNew = (type) => {
    setModalType(type);
    setEditingItem(null);
    setFormData({
      title: "",
      site: "",
      category: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      paymentMode: "Cash",
      transactionId: "",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (transaction) => {
    setModalType(transaction.type);
    setEditingItem(transaction);
    setFormData({
      title: transaction.title,
      site: transaction.site,
      category: transaction.category,
      amount: transaction.amount.replace("Rs. ", "").replace(/,/g, ""),
      date: transaction.date,
      paymentMode: transaction.paymentMode || "Cash",
      transactionId: transaction.transactionId || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const handleSave = (e) => {
    e.preventDefault();
    const newAmount = `Rs. ${Number(formData.amount).toLocaleString("en-IN")}`;
    const savedFormData = {
      ...formData,
      category: modalType === "Income" ? "" : formData.category,
    };

    if (editingItem) {
      setTransactions(
        transactions.map((t) =>
          t.id === editingItem.id
            ? { ...t, ...savedFormData, type: modalType, amount: newAmount }
            : t,
        ),
      );
    } else {
      const newId = `${modalType === "Income" ? "INC" : "EXP"}-00${transactions.length + 1}`;
      setTransactions([
        { id: newId, type: modalType, ...savedFormData, amount: newAmount },
        ...transactions,
      ]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-900 md:text-3xl">
            Income and Expense
          </h1>
          <p className="text-gray-600">
            View all recorded project income and expenses across sites
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleAddNew("Income")}
            className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-5 w-5" />
            Add Income
          </button>
          <button
            type="button"
            onClick={() => handleAddNew("Expense")}
            className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#3D36BE" }}
          >
            <Plus className="h-5 w-5" />
            Add Expense
          </button>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by ID, title, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
        />
        <select
          value={filterSite}
          onChange={(e) => setFilterSite(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE] sm:w-48"
        >
          {sites.map((site) => (
            <option key={site} value={site}>
              {site === "all" ? "All Sites" : site}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Income</p>
              <h3 className="text-gray-900">
                {transactions.filter((t) => t.type === "Income").length}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#3D36BE20" }}
            >
              <ReceiptIndianRupee
                className="h-6 w-6"
                style={{ color: "#3D36BE" }}
              />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <h3 className="text-gray-900">
                {transactions.filter((t) => t.type === "Expense").length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-gray-700">ID</th>
                <th className="px-6 py-4 text-left text-gray-700">Title</th>
                <th className="px-6 py-4 text-left text-gray-700">Site</th>
                <th className="px-6 py-4 text-left text-gray-700">Category</th>
                <th className="px-6 py-4 text-left text-gray-700">Amount</th>
                <th className="px-6 py-4 text-left text-gray-700">
                  Payment Mode
                </th>
                <th className="px-6 py-4 text-left text-gray-700">Date</th>
                <th className="px-6 py-4 text-left text-gray-700">Type</th>
                <th className="px-6 py-4 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-gray-900">{transaction.id}</td>
                  <td className="px-6 py-4 text-gray-900">
                    {transaction.title}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {transaction.site}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {transaction.category || "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {transaction.amount}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {transaction.paymentMode}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {transaction.date}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        transaction.type === "Income"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(transaction)}
                        className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                      >
                        <Edit className="h-5 w-5 text-gray-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(transaction.id)}
                        className="rounded-lg p-2 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="h-5 w-5 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900">
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
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    placeholder={
                      modalType === "Expense"
                        ? "e.g. Cement Purchase"
                        : "e.g. Client Payment Advance"
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Site
                  </label>
                  <select
                    value={formData.site}
                    onChange={(e) =>
                      setFormData({ ...formData, site: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                  >
                    <option value="" disabled>
                      Select site
                    </option>
                    {siteOptions.map((site) => (
                      <option key={site} value={site}>
                        {site}
                      </option>
                    ))}
                  </select>
                </div>

                {modalType === "Expense" ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Category
                      </label>
                      <select
                        required
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                      >
                        <option value="" disabled>
                          Select category
                        </option>
                        <option value="Materials">Materials</option>
                        <option value="Contractor">Contractor</option>
                        <option value="Supplies">Supplies</option>
                        <option value="Hardware">Hardware</option>
                        <option value="Logistics">Logistics</option>
                        <option value="Labor">Labor</option>
                        <option value="Equipment">Equipment</option>
                        <option value="Miscellaneous">Miscellaneous</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Amount
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                        placeholder="Amount in Rs."
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Amount
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                      placeholder="Amount in Rs."
                    />
                  </div>
                )}

                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Payment Mode
                    </label>
                    <select
                      value={formData.paymentMode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paymentMode: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Online">Online</option>
                      <option value="Check">Check</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    />
                  </div>
                </>

                {(formData.paymentMode === "Check" ||
                  formData.paymentMode === "Online") && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Transaction ID / Check Number
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
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                      placeholder={
                        formData.paymentMode === "Check"
                          ? "e.g. CHK98765"
                          : "e.g. TXN123456"
                      }
                    />
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#3D36BE" }}
                >
                  {editingItem ? "Update" : "Add"} {modalType}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;




