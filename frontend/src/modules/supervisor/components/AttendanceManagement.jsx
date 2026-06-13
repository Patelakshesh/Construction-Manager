import { useState, useEffect } from "react";
import { Calendar, Plus, Users as UsersIcon, X, Edit, Trash2 } from "lucide-react";
import apiClient from "../../../shared/services/apiClient";
import toast from "react-hot-toast";
import Pagination from "../../../shared/components/Pagination";
import ConfirmModal from "../../../shared/components/ConfirmModal";

const CREATE_ATTENDANCE_MUTATION = `
  mutation CreateAttendance($input: CreateAttendanceInput!) {
    createAttendance(input: $input) {
      id
    }
  }
`;

const UPDATE_ATTENDANCE_MUTATION = `
  mutation UpdateAttendance($input: UpdateAttendanceInput!) {
    updateAttendance(input: $input) {
      id
    }
  }
`;

const DELETE_ATTENDANCE_MUTATION = `
  mutation DeleteAttendance($id: Int!) {
    deleteAttendance(id: $id)
  }
`;

const toIsoDuration = (timeStr) => {
  if (!timeStr) return null;
  const parts = timeStr.split(":");
  const h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);
  const s = parseInt(parts[2] || "0", 10);
  return `PT${h}H${m}M${s}S`;
};

const formatDuration = (durationStr) => {
  if (!durationStr) return "--:--";
  const regex = /^-?PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
  const match = durationStr.match(regex);
  if (!match) {
    if (durationStr.includes(":")) {
      return durationStr.slice(0, 5);
    }
    return durationStr;
  }
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${hh}:${mm}`;
};

const calculateHours = (startIso, endIso) => {
  if (!startIso || !endIso) return null;
  const parseToMinutes = (durationStr) => {
    const regex = /^-?PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
    const match = durationStr.match(regex);
    if (!match) {
      if (durationStr.includes(":")) {
        const parts = durationStr.split(":");
        return parseInt(parts[0] || "0", 10) * 60 + parseInt(parts[1] || "0", 10);
      }
      return 0;
    }
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    return hours * 60 + minutes;
  };
  const startMins = parseToMinutes(startIso);
  const endMins = parseToMinutes(endIso);
  const diffMins = endMins - startMins;
  if (diffMins <= 0) return null;
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  if (m === 0) {
    return `${h} hrs`;
  }
  return `${h}h ${m}m`;
};


function AttendanceManagement({ selectedSite, user }) {
  const [attendance, setAttendance] = useState([]);
  const [allSiteAttendance, setAllSiteAttendance] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const pageSize = 10;

  const [formData, setFormData] = useState({
    contractorId: "",
    skilledWorkers: "0",
    semiSkilledWorkers: "0",
    unskilledWorkers: "0",
    startTime: "09:00",
    endTime: "17:00",
    date: new Date().toISOString().split("T")[0],
  });

  const loadData = async () => {
    if (!selectedSite) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.post(
        "/graphql",
        {
          query: `
            query GetAttendanceAndContractors($pageNumber: Int!, $pageSize: Int!, $siteId: Int) {
              attendancesPage(pageNumber: $pageNumber, pageSize: $pageSize, siteId: $siteId) {
                items {
                  id
                  date
                  contractorId
                  contractor { contractorName }
                  supervisorId
                  supervisor { name }
                  siteId
                  skilledWorkers
                  semiSkilledWorkers
                  unskilledWorkers
                  startTime
                  endTime
                }
                totalCount
              }
              attendances {
                date
                siteId
                skilledWorkers
                semiSkilledWorkers
                unskilledWorkers
              }
              contractors { id contractorName enable }
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
        const pageItems = response.data.data.attendancesPage?.items || [];
        setAttendance(pageItems);
        setTotalCount(response.data.data.attendancesPage?.totalCount || 0);

        const allAttendances = response.data.data.attendances || [];
        const siteAttendance = allAttendances.filter(
          a => String(a.siteId) === String(selectedSite.id)
        );
        setAllSiteAttendance(siteAttendance);

        const loadedContractors = (response.data.data.contractors || []).filter(c => c.enable);
        setContractors(loadedContractors);
      }
    } catch (error) {
      toast.error(error?.message || "Failed to load attendance data");
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
    if (!formData.date) errors.date = "Date is required.";
    if (!formData.contractorId) errors.contractorId = "Contractor is required.";
    
    const skilled = formData.skilledWorkers === "" ? 0 : Number(formData.skilledWorkers);
    const semiSkilled = formData.semiSkilledWorkers === "" ? 0 : Number(formData.semiSkilledWorkers);
    const unskilled = formData.unskilledWorkers === "" ? 0 : Number(formData.unskilledWorkers);
    
    if (formData.skilledWorkers !== "" && Number(formData.skilledWorkers) < 0) {
      errors.skilledWorkers = "Cannot be negative.";
    }
    if (formData.semiSkilledWorkers !== "" && Number(formData.semiSkilledWorkers) < 0) {
      errors.semiSkilledWorkers = "Cannot be negative.";
    }
    if (formData.unskilledWorkers !== "" && Number(formData.unskilledWorkers) < 0) {
      errors.unskilledWorkers = "Cannot be negative.";
    }
    
    if (skilled === 0 && semiSkilled === 0 && unskilled === 0) {
      errors.skilledWorkers = "At least one worker type must be greater than 0.";
    }

    if (!formData.startTime) errors.startTime = "Start time is required.";
    if (!formData.endTime) errors.endTime = "End time is required.";
    
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

  const handleEdit = (record) => {
    setEditingItem(record);
    setFormData({
      contractorId: record.contractorId || "",
      skilledWorkers: String(record.skilledWorkers),
      semiSkilledWorkers: String(record.semiSkilledWorkers),
      unskilledWorkers: String(record.unskilledWorkers),
      startTime: formatDuration(record.startTime),
      endTime: formatDuration(record.endTime),
      date: record.date.split("T")[0],
    });
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.post(
        "/graphql",
        {
          query: DELETE_ATTENDANCE_MUTATION,
          variables: { id: Number(itemToDelete) },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.errors) {
        toast.error(response.data.errors[0].message);
        return;
      }

      toast.success("Attendance deleted successfully.");
      loadData();
    } catch (error) {
      toast.error(error?.message || "Failed to delete attendance");
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

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
      const startTimeIso = toIsoDuration(formData.startTime);
      const endTimeIso = toIsoDuration(formData.endTime);

      const isEdit = !!editingItem;
      const mutation = isEdit ? UPDATE_ATTENDANCE_MUTATION : CREATE_ATTENDANCE_MUTATION;
      const variables = {
        input: {
          ...(isEdit ? { id: Number(editingItem.id) } : {}),
          date: new Date(formData.date).toISOString(),
          siteId: Number(selectedSite.id),
          contractorId: Number(formData.contractorId),
          supervisorId: Number(user.id),
          skilledWorkers: formData.skilledWorkers === "" ? 0 : Number(formData.skilledWorkers),
          semiSkilledWorkers: formData.semiSkilledWorkers === "" ? 0 : Number(formData.semiSkilledWorkers),
          unskilledWorkers: formData.unskilledWorkers === "" ? 0 : Number(formData.unskilledWorkers),
          startTime: startTimeIso,
          endTime: endTimeIso,
          ...(isEdit ? { modifiedBy: user.name } : { createdBy: user.name }),
        },
      };

      const response = await apiClient.post(
        "/graphql",
        {
          query: mutation,
          variables,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.errors) {
        toast.error(response.data.errors[0].message);
        return;
      }

      toast.success(isEdit ? "Attendance updated successfully!" : "Attendance added successfully!");
      setIsAdding(false);
      setEditingItem(null);
      setFormData({
        contractorId: "",
        skilledWorkers: "0",
        semiSkilledWorkers: "0",
        unskilledWorkers: "0",
        startTime: "09:00",
        endTime: "17:00",
        date: new Date().toISOString().split("T")[0],
      });
      loadData();
    } catch (error) {
      toast.error(error?.message || "Failed to save attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const totalWorkersToday = allSiteAttendance
    .filter((record) => record.date.split("T")[0] === today)
    .reduce((sum, record) => sum + (record.skilledWorkers || 0) + (record.semiSkilledWorkers || 0) + (record.unskilledWorkers || 0), 0);

  const thisWeekWorkers = allSiteAttendance
    .filter((record) => {
      const recordDate = new Date(record.date);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return recordDate >= weekAgo;
    })
    .reduce((sum, record) => sum + (record.skilledWorkers || 0) + (record.semiSkilledWorkers || 0) + (record.unskilledWorkers || 0), 0);

  const groupedByDate = attendance.reduce((accumulator, record) => {
    const dateStr = record.date.split("T")[0];
    if (!accumulator[dateStr]) {
      accumulator[dateStr] = [];
    }
    accumulator[dateStr].push(record);
    return accumulator;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) =>
    b.localeCompare(a),
  );

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
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm text-gray-600">Today&apos;s Workers</p>
          <h3 className="text-gray-900">{totalWorkersToday}</h3>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm text-gray-600">This Week</p>
          <h3 className="text-gray-900">{thisWeekWorkers}</h3>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-4 text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#3D36BE" }}
      >
        <Plus className="h-5 w-5" />
        Add Attendance
      </button>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading attendance...</div>
        ) : attendance.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No attendance recorded for this site yet.</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-gray-700">Date</th>
                    <th className="px-6 py-4 text-left text-gray-700">Contractor</th>
                    <th className="px-6 py-4 text-left text-gray-700">Skilled Workers</th>
                    <th className="px-6 py-4 text-left text-gray-700">Semi-Skilled Workers</th>
                    <th className="px-6 py-4 text-left text-gray-700">Unskilled Workers</th>
                    <th className="px-6 py-4 text-left text-gray-700">Start Time</th>
                    <th className="px-6 py-4 text-left text-gray-700">End Time</th>
                    <th className="px-6 py-4 text-left text-gray-700">Total Hours</th>
                    <th className="px-6 py-4 text-left text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendance.map((record) => (
                    <tr
                      key={record.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-gray-900">
                        {record.date.split("T")[0]}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-medium">
                        {record.contractor?.contractorName || "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {record.skilledWorkers}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {record.semiSkilledWorkers}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {record.unskilledWorkers}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {formatDuration(record.startTime)}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {formatDuration(record.endTime)}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-semibold">
                        {calculateHours(record.startTime, record.endTime) || "—"} hrs
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(record)}
                            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                            title="Edit"
                          >
                            <Edit className="h-5 w-5 text-gray-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(record.id)}
                            className="rounded-lg p-2 transition-colors hover:bg-red-50"
                            title="Delete"
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

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-gray-100">
              {attendance.map((record) => (
                <div
                  key={record.id}
                  className="p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {record.contractor?.contractorName || "Unknown Contractor"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {record.date.split("T")[0]}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {calculateHours(record.startTime, record.endTime) || "—"} hrs
                    </span>
                  </div>

                  <div className="mb-4 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span className="font-medium">Skilled Workers:</span>
                      <span>{record.skilledWorkers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Semi-Skilled Workers:</span>
                      <span>{record.semiSkilledWorkers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Unskilled Workers:</span>
                      <span>{record.unskilledWorkers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Timing:</span>
                      <span>
                        {formatDuration(record.startTime)} - {formatDuration(record.endTime)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(record)}
                      className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                      title="Edit"
                    >
                      <Edit className="h-5 w-5 text-gray-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(record.id)}
                      className="rounded-lg p-2 transition-colors hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto md:items-center">
          <div className="my-auto w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-gray-900">{editingItem ? "Edit Daily Attendance" : "Add Daily Attendance"}</h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingItem(null);
                    setFormData({
                      contractorId: "",
                      skilledWorkers: "0",
                      semiSkilledWorkers: "0",
                      unskilledWorkers: "0",
                      startTime: "09:00",
                      endTime: "17:00",
                      date: new Date().toISOString().split("T")[0],
                    });
                  }}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Row 1 */}
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

                  <div>
                    <label className="mb-2 block text-gray-700">
                      Contractor Name <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <select
                      value={formData.contractorId}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          contractorId: event.target.value,
                        })
                      }
                      className={getFieldClassName(Boolean(formErrors.contractorId))}
                      required
                    >
                      <option value="" disabled>Select contractor</option>
                      {contractors.map((contractor) => (
                        <option key={contractor.id} value={contractor.id}>
                          {contractor.contractorName}
                        </option>
                      ))}
                    </select>
                    {renderFieldError(formErrors.contractorId)}
                  </div>

                  {/* Row 2 */}
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-gray-700 font-medium border-b pb-2">
                      Worker Breakdown
                    </label>
                  </div>

                  <div>
                    <label className="mb-2 block text-gray-700">
                      Skilled Workers
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.skilledWorkers}
                      onChange={(event) =>
                        setFormData({ ...formData, skilledWorkers: event.target.value })
                      }
                      className={getFieldClassName(Boolean(formErrors.skilledWorkers))}
                      placeholder="0"
                    />
                    {renderFieldError(formErrors.skilledWorkers)}
                  </div>

                  <div>
                    <label className="mb-2 block text-gray-700">
                      Semi-Skilled Workers
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.semiSkilledWorkers}
                      onChange={(event) =>
                        setFormData({ ...formData, semiSkilledWorkers: event.target.value })
                      }
                      className={getFieldClassName(Boolean(formErrors.semiSkilledWorkers))}
                      placeholder="0"
                    />
                    {renderFieldError(formErrors.semiSkilledWorkers)}
                  </div>

                  <div>
                    <label className="mb-2 block text-gray-700">
                      Unskilled Workers
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.unskilledWorkers}
                      onChange={(event) =>
                        setFormData({ ...formData, unskilledWorkers: event.target.value })
                      }
                      className={getFieldClassName(Boolean(formErrors.unskilledWorkers))}
                      placeholder="0"
                    />
                    {renderFieldError(formErrors.unskilledWorkers)}
                  </div>

                  {/* Row 3 */}
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-gray-700 font-medium border-b pb-2">
                      Work Hours
                    </label>
                  </div>

                  <div>
                    <label className="mb-2 block text-gray-700">
                      Start Time <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(event) =>
                        setFormData({ ...formData, startTime: event.target.value })
                      }
                      className={getFieldClassName(Boolean(formErrors.startTime))}
                      required
                    />
                    {renderFieldError(formErrors.startTime)}
                  </div>

                  <div>
                    <label className="mb-2 block text-gray-700">
                      End Time <span className="text-[#EC3F3F]">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(event) =>
                        setFormData({ ...formData, endTime: event.target.value })
                      }
                      className={getFieldClassName(Boolean(formErrors.endTime))}
                      required
                    />
                    {renderFieldError(formErrors.endTime)}
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-lg px-4 py-3 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#3D36BE" }}
                  >
                    {isSubmitting ? "Submitting..." : editingItem ? "Update Attendance" : "Submit Attendance"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingItem(null);
                      setFormErrors({});
                      setFormData({
                        contractorId: "",
                        skilledWorkers: "0",
                        semiSkilledWorkers: "0",
                        unskilledWorkers: "0",
                        startTime: "09:00",
                        endTime: "17:00",
                        date: new Date().toISOString().split("T")[0],
                      });
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
      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Attendance"
        message="Are you sure you want to delete this attendance record? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

export default AttendanceManagement;
