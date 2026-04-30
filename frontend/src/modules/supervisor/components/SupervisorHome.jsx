import {
  Calendar,
  Plus,
  Receipt,
  ReceiptIndianRupee,
  TrendingDown,
  Users,
} from "lucide-react";

const recentExpenses = [
  {
    id: 1,
    category: "Materials",
    amount: 5200,
    date: "2026-04-26",
    description: "Concrete supplies",
  },
  {
    id: 2,
    category: "Labor",
    amount: 3800,
    date: "2026-04-25",
    description: "Weekly wages",
  },
  {
    id: 3,
    category: "Equipment",
    amount: 1200,
    date: "2026-04-24",
    description: "Tool rental",
  },
  {
    id: 4,
    category: "Transport",
    amount: 450,
    date: "2026-04-23",
    description: "Material delivery",
  },
];

const recentAttendance = [
  { date: "2026-04-27", workers: 25, contractor: "ABC Construction" },
  { date: "2026-04-26", workers: 28, contractor: "ABC Construction" },
  { date: "2026-04-25", workers: 22, contractor: "XYZ Builders" },
];

function SupervisorHome({ site }) {
  const totalBudget = 500000;
  const totalExpenses = 420000;
  const remaining = totalBudget - totalExpenses;

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-gray-900">Budget Overview</h3>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
            {site}
          </span>
        </div>

        <div className="space-y-4">
          <div
            className="flex items-center justify-between rounded-lg p-4"
            style={{ backgroundColor: "#FDB71A20" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg"
                style={{ backgroundColor: "#FDB71A" }}
              >
                <ReceiptIndianRupee className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Income</p>
                <h3 className="text-gray-900">
                  ₹{totalBudget.toLocaleString()}
                </h3>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <h3 className="text-gray-900">
                  ₹{totalExpenses.toLocaleString()}
                </h3>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-green-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <ReceiptIndianRupee className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Remaining Balance</p>
                <h3 className="text-gray-900">₹{remaining.toLocaleString()}</h3>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-gray-600">Budget Used</span>
              <span className="text-gray-900">84%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-200">
              <div
                className="h-3 rounded-full"
                style={{ width: "84%", backgroundColor: "#F59E0B" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: "#FDB71A" }}
          >
            <Plus className="h-7 w-7 text-white" />
          </div>
          <span className="text-gray-900">Add Expense</span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600">
            <Users className="h-7 w-7 text-white" />
          </div>
          <span className="text-gray-900">Add Attendance</span>
        </button>
      </div> */}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h3 className="text-gray-900">Recent Expenses</h3>
          <Receipt className="h-5 w-5 text-gray-400" />
        </div>
        <div className="divide-y divide-gray-200">
          {recentExpenses.map((expense) => (
            <div
              key={expense.id}
              className="p-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="mb-1 text-gray-900">{expense.description}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded px-2 py-1 text-xs"
                      style={{ backgroundColor: "#FDB71A20", color: "#FDB71A" }}
                    >
                      {expense.category}
                    </span>
                    <span className="text-sm text-gray-500">
                      {expense.date}
                    </span>
                  </div>
                </div>
                <p className="text-gray-900">
                  ₹{expense.amount.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h3 className="text-gray-900">Recent Attendance</h3>
          <Calendar className="h-5 w-5 text-gray-400" />
        </div>
        <div className="divide-y divide-gray-200">
          {recentAttendance.map((record) => (
            <div
              key={`${record.date}-${record.contractor}`}
              className="p-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-gray-900">{record.contractor}</p>
                  <p className="text-sm text-gray-500">{record.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-900">{record.workers} workers</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SupervisorHome;
