import { useState } from "react";
import { CreditCard, Edit, Plus, ReceiptIndianRupee, Trash2, X } from "lucide-react";

const supervisors = [
  "John Doe",
  "Jane Smith",
  "Mike Johnson",
  "Sarah Williams",
  "Tom Anderson",
];

const initialCredits = [
  {
    id: "SC-001",
    supervisor: "John Doe",
    amount: "Rs. 25,000",
    paymentMode: "Online",
    transactionId: "TXN100245",
    comment: "Fuel and daily work advance",
    date: "2026-04-29",
  },
  {
    id: "SC-002",
    supervisor: "Jane Smith",
    amount: "Rs. 18,500",
    paymentMode: "Check",
    transactionId: "CHK008742",
    comment: "Concrete pour support credit",
    date: "2026-04-28",
  },
  {
    id: "SC-003",
    supervisor: "Mike Johnson",
    amount: "Rs. 12,000",
    paymentMode: "Cash",
    transactionId: "",
    comment: "Urgent site purchase allowance",
    date: "2026-04-27",
  },
];

function SupervisorCredit() {
  const [credits, setCredits] = useState(initialCredits);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState("all");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    supervisor: "",
    amount: "",
    paymentMode: "Cash",
    transactionId: "",
    comment: "",
    date: new Date().toISOString().split("T")[0],
  });

  const handleAddNew = () => {
    setEditingCredit(null);
    setFormData({
      supervisor: "",
      amount: "",
      paymentMode: "Cash",
      transactionId: "",
      comment: "",
      date: new Date().toISOString().split("T")[0],
    });
    setIsModalOpen(true);
  };

  const handleEdit = (credit) => {
    setEditingCredit(credit);
    setFormData({
      supervisor: credit.supervisor,
      amount: credit.amount.replace("Rs. ", "").replace(/,/g, ""),
      paymentMode: credit.paymentMode,
      transactionId: credit.transactionId || "",
      comment: credit.comment,
      date: credit.date,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (creditId) => {
    setCredits(credits.filter((credit) => credit.id !== creditId));
  };

  const handleSave = (event) => {
    event.preventDefault();
    const amount = `Rs. ${Number(formData.amount).toLocaleString("en-IN")}`;
    const payload = {
      ...formData,
      amount,
      transactionId:
        formData.paymentMode === "Cash" ? "" : formData.transactionId,
    };

    if (editingCredit) {
      setCredits(
        credits.map((credit) =>
          credit.id === editingCredit.id
            ? { ...credit, ...payload }
            : credit,
        ),
      );
    } else {
      setCredits([
        {
          id: `SC-00${credits.length + 1}`,
          ...payload,
        },
        ...credits,
      ]);
    }

    setIsModalOpen(false);
  };

  const filteredCredits = credits.filter((credit) => {
    const matchesSupervisor =
      selectedSupervisor === "all" || credit.supervisor === selectedSupervisor;
    const matchesPaymentMode =
      selectedPaymentMode === "all" ||
      credit.paymentMode === selectedPaymentMode;
    const matchesSearch =
      credit.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      credit.comment.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSupervisor && matchesPaymentMode && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-900 md:text-3xl">
            Supervisor Credit
          </h1>
          <p className="text-gray-600">
            Manage supervisor credit entries and payment details
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#FDB71A" }}
        >
          <Plus className="h-5 w-5" />
          Add Credit
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Credits</p>
              <h3 className="text-gray-900">{credits.length}</h3>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#FDB71A20" }}
            >
              <ReceiptIndianRupee className="h-6 w-6" style={{ color: "#FDB71A" }} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Online or Check</p>
              <h3 className="text-gray-900">
                {
                  credits.filter(
                    (credit) =>
                      credit.paymentMode === "Online" ||
                      credit.paymentMode === "Check",
                  ).length
                }
              </h3>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cash Credits</p>
              <h3 className="text-gray-900">
                {credits.filter((credit) => credit.paymentMode === "Cash").length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-3">
        <input
          type="text"
          placeholder="Search by ID or comment..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
        />
        <select
          value={selectedSupervisor}
          onChange={(event) => setSelectedSupervisor(event.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
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
          className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
        >
          <option value="all">All Payment Modes</option>
          <option value="Cash">Cash</option>
          <option value="Check">Check</option>
          <option value="Online">Online</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-gray-700">ID</th>
                <th className="px-6 py-4 text-left text-gray-700">Supervisor</th>
                <th className="px-6 py-4 text-left text-gray-700">Amount</th>
                <th className="px-6 py-4 text-left text-gray-700">Payment Mode</th>
                <th className="px-6 py-4 text-left text-gray-700">Comment</th>
                <th className="px-6 py-4 text-left text-gray-700">Date</th>
                <th className="px-6 py-4 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCredits.map((credit) => (
                <tr key={credit.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{credit.id}</td>
                  <td className="px-6 py-4 text-gray-900">{credit.supervisor}</td>
                  <td className="px-6 py-4 text-gray-900">{credit.amount}</td>
                  <td className="px-6 py-4 text-gray-900">{credit.paymentMode}</td>
                  <td className="px-6 py-4 text-gray-900">{credit.comment}</td>
                  <td className="px-6 py-4 text-gray-900">{credit.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(credit)}
                        className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                      >
                        <Edit className="h-5 w-5 text-gray-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(credit.id)}
                        className="rounded-lg p-2 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="h-5 w-5 text-red-600" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingCredit ? "Edit Supervisor Credit" : "Add Supervisor Credit"}
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
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Supervisor
                  </label>
                  <select
                    value={formData.supervisor}
                    onChange={(event) =>
                      setFormData({ ...formData, supervisor: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                    required
                  >
                    <option value="">Select supervisor</option>
                    {supervisors.map((supervisor) => (
                      <option key={supervisor} value={supervisor}>
                        {supervisor}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.amount}
                    onChange={(event) =>
                      setFormData({ ...formData, amount: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                    placeholder="Amount in Rs."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Payment Mode
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
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                    <option value="Online">Online</option>
                  </select>
                </div>

                {(formData.paymentMode === "Check" ||
                  formData.paymentMode === "Online") && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {formData.paymentMode === "Check"
                        ? "Check ID"
                        : "Transaction ID"}
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
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                      placeholder={
                        formData.paymentMode === "Check"
                          ? "e.g. CHK98765"
                          : "e.g. TXN123456"
                      }
                    />
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Comment
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(event) =>
                      setFormData({ ...formData, comment: event.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                    placeholder="Enter comment or description"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(event) =>
                      setFormData({ ...formData, date: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#FDB71A" }}
                >
                  {editingCredit ? "Update" : "Add"} Credit
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
      )}
    </div>
  );
}

export default SupervisorCredit;
