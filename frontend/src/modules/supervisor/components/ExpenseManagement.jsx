import { useState } from "react";
import { Camera, Plus, ReceiptIndianRupee, X } from "lucide-react";

const initialExpenses = [
  {
    id: "1",
    amount: 5200,
    transactionType: "Credit",
    description: "Concrete supplies",
    date: "2026-04-26",
    status: "approved",
  },
  {
    id: "2",
    amount: 3800,
    transactionType: "Credit",
    description: "Weekly wages - 15 workers",
    date: "2026-04-25",
    status: "approved",
  },
  {
    id: "3",
    amount: 1200,
    transactionType: "Debit",
    description: "Excavator rental (3 days)",
    date: "2026-04-24",
    status: "pending",
  },
  {
    id: "4",
    amount: 450,
    transactionType: "Debit",
    description: "Material delivery",
    date: "2026-04-23",
    status: "approved",
  },
  {
    id: "5",
    amount: 2100,
    transactionType: "Debit",
    description: "Steel reinforcement bars",
    date: "2026-04-22",
    status: "approved",
  },
  {
    id: "6",
    amount: 890,
    transactionType: "Credit",
    description: "Safety equipment",
    date: "2026-04-21",
    status: "approved",
  },
];

const transactionTypes = ["Credit", "Debit"];
const expenseCategories = [
  "Materials",
  "Labor",
  "Equipment",
  "Transport",
  "Safety",
  "Contractor",
  "Supplies",
  "Miscellaneous",
];

function ExpenseManagement({ site }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [isAdding, setIsAdding] = useState(false);
  const [filtertransactionType, setFiltertransactionType] = useState("All");
  const [formData, setFormData] = useState({
    amount: "",
    category: expenseCategories[0],
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const handleSubmit = (event) => {
    event.preventDefault();

    const newExpense = {
      id: String(expenses.length + 1),
      amount: Number(formData.amount),
      transactionType: formData.category,
      description: formData.description,
      date: formData.date,
      status: "pending",
    };

    setExpenses([newExpense, ...expenses]);
    setIsAdding(false);
    setFormData({
      amount: "",
      category: expenseCategories[0],
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  const filteredExpenses =
    filtertransactionType === "All"
      ? expenses
      : expenses.filter(
          (expense) => expense.transactionType === filtertransactionType,
        );

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const pendingExpenses = expenses.filter(
    (expense) => expense.status === "pending",
  ).length;

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Current Site
        </p>
        <h3 className="text-gray-900">{site}</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-2 text-sm text-gray-600">
            <ReceiptIndianRupee className="h-4 w-4" />
            <p>Total Expenses</p>
          </div>
          <h3 className="text-gray-900">₹{totalExpenses.toLocaleString()}</h3>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm text-gray-600">Total Contractor</p>
          <h3 className="text-gray-900">{pendingExpenses} Contractors</h3>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-4 text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#FDB71A" }}
      >
        <Plus className="h-5 w-5" />
        Add New Expense
      </button>

      {/* <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <label className="text-gray-700">Filter by transactionType</label>
        </div>
        <select
          value={filtertransactionType}
          onChange={(event) => setFiltertransactionType(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
        >
          <option value="All">All Categories</option>
          {transactionTypes.map((transactionType) => (
            <option key={transactionType} value={transactionType}>
              {transactionType}
            </option>
          ))}
        </select>
      </div> */}

      <div className="space-y-3">
        {filteredExpenses.map((expense) => (
          <div
            key={expense.id}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="rounded px-2 py-1 text-xs"
                    style={{
                      backgroundColor:
                        expense.transactionType === "Credit"
                          ? "#DCFCE7"
                          : "#FEE2E2",
                      color:
                        expense.transactionType === "Credit"
                          ? "#15803D"
                          : "#DC2626",
                    }}
                  >
                    {expense.transactionType}
                  </span>
                  
                </div>
                <p className="mb-1 text-gray-900">{expense.description}</p>
                <p className="text-sm text-gray-500">{expense.date}</p>
              </div>
              <div className="text-right">
                <p className="text-lg text-gray-900">
                  ₹{expense.amount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-lg bg-white shadow-xl">
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
                <div>
                  <label className="mb-2 block text-gray-700">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(event) =>
                      setFormData({ ...formData, amount: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                    placeholder="Enter amount"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-gray-700">Category</label>
                  <select
                    value={formData.category}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        category: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  >
                    {expenseCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        description: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                    placeholder="Enter description"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-gray-700">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(event) =>
                      setFormData({ ...formData, date: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-gray-700">
                    Upload Bill/Receipt
                  </label>
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 transition-colors hover:border-[#FDB71A]"
                  >
                    <Camera className="h-5 w-5 text-gray-600" />
                    <span className="text-gray-600">
                      Take Photo / Upload Image
                    </span>
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg px-4 py-3 text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "#FDB71A" }}
                  >
                    Submit Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 rounded-lg bg-gray-200 px-4 py-3 text-gray-700 transition-colors hover:bg-gray-300"
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

export default ExpenseManagement;
