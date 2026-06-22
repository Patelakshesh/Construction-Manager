import { useState, useEffect } from "react";
import { Calendar, Plus, Users as UsersIcon, X, Edit, Trash2 } from "lucide-react";
import apiClient from "../../../shared/services/apiClient";
import toast from "react-hot-toast";
import Pagination from "../../../shared/components/Pagination";
import ConfirmModal from "../../../shared/components/ConfirmModal";
import { createPortal } from "react-dom";

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
    `w-full h-12 rounded-lg border px-4 focus:outline-none focus:ring-2 font-sans ${
      hasError
        ? "border-[#EC3F3F] focus:ring-[#EC3F3F]"
        : "border-[#C8D9EF] focus:ring-[#3D35BE] text-[#353535]"
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
          <p className="text-sm font-medium text-red-800 font-sans">
            You are not assigned to any site. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8 font-sans">
      {/* Current Site & Stats Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2] px-6 py-5 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-[#717579] font-sans mb-1">
            Current Site
          </p>
          <h3 className="text-lg font-bold text-[#353535] font-sans">{selectedSite.siteName}</h3>
        </div>

        <div className="bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2] px-6 py-5 flex-1 flex items-center gap-4">
          <div 
            className="p-2 rounded-lg border border-[#EBE9FD] flex items-center justify-center shrink-0 bg-[#EFFFFE]" 
            style={{ width: 44, height: 44 }}
          >
            <UsersIcon className="h-5 w-5 text-[#01B6A8]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#717579] font-sans mb-0.5 font-sans">Today's Workers</p>
            <h3 className="text-xl font-bold text-[#353535] font-sans truncate">{totalWorkersToday}</h3>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2] px-6 py-5 flex-1 flex items-center gap-4">
          <div 
            className="p-2 rounded-lg border border-[#EBE9FD] flex items-center justify-center shrink-0 bg-[#F0EFFF]" 
            style={{ width: 44, height: 44 }}
          >
            <Calendar className="h-5 w-5 text-[#3D35BE]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#717579] font-sans mb-0.5 font-sans">This Week</p>
            <h3 className="text-xl font-bold text-[#353535] font-sans truncate">{thisWeekWorkers}</h3>
          </div>
        </div>
      </div>

      {/* Add Attendance Button */}
      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-4 text-white text-base font-bold transition-all shadow-[0px_2px_10px_rgba(61,53,190,0.25)] hover:scale-[1.01] active:scale-[0.99] font-sans"
        style={{ backgroundColor: "#3D35BE" }}
      >
        <Plus className="h-5 w-5" />
        Add Attendance
      </button>

      {/* Main Table Container Card */}
      <div 
        className="w-full bg-white flex flex-col min-w-0 rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]" 
        style={{ 
          paddingLeft: 24, 
          paddingRight: 24, 
          paddingTop: 30, 
          paddingBottom: 30, 
        }}
      >
        <div 
          className="w-full flex flex-col overflow-hidden rounded-lg min-w-0" 
          style={{ outline: '1px rgba(61, 53, 190, 0.26) solid' }}
        >
          {isLoading ? (
            <div className="p-8 text-center text-[#717579] font-sans bg-white">Loading attendance...</div>
          ) : attendance.length === 0 ? (
            <div className="p-8 text-center text-[#717579] font-sans bg-white">No attendance recorded for this site yet.</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto w-full">
                <table className="w-full min-w-[800px] border-collapse">
                  <thead className="bg-[#F0EFFF] border-b border-[#9792E7]">
                    <tr className="h-[68px]">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Contractor</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Skilled Workers</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Semi-Skilled</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Unskilled</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Start Time</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">End Time</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Total Hours</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {attendance.map((record) => (
                      <tr
                        key={record.id}
                        className="h-[78px] transition-colors hover:bg-gray-50/50"
                      >
                        <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                          {formatDate(record.date)}
                        </td>
                        <td className="px-6 py-4 text-base text-[#5B6065] font-semibold font-sans capitalize">
                          {record.contractor?.contractorName || "—"}
                        </td>
                        <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                          {record.skilledWorkers}
                        </td>
                        <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                          {record.semiSkilledWorkers}
                        </td>
                        <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                          {record.unskilledWorkers}
                        </td>
                        <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                          {formatDuration(record.startTime)}
                        </td>
                        <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                          {formatDuration(record.endTime)}
                        </td>
                        <td className="px-6 py-4 text-base text-[#3E424E] font-bold font-sans">
                          {calculateHours(record.startTime, record.endTime) || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(record)}
                              className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#2945AC]"
                              title="Edit"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(record.id)}
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
              <div className="block md:hidden bg-white divide-y divide-gray-100">
                {attendance.map((record) => {
                  const totalWorkers = (record.skilledWorkers || 0) + 
                                       (record.semiSkilledWorkers || 0) + 
                                       (record.unskilledWorkers || 0);
                  return (
                    <div
                      key={record.id}
                      className="p-4 hover:bg-gray-50/50 transition-colors font-sans"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-[#353535] capitalize text-base font-sans">
                            {record.contractor?.contractorName || "Unknown Contractor"}
                          </p>
                          <p className="text-xs text-[#717579] font-sans mt-0.5">
                            {formatDate(record.date)}
                          </p>
                        </div>
                        <span className="inline-flex items-center justify-center rounded-lg bg-[#EFFFFE] border border-[#A0EBE5] px-2.5 py-1 text-xs font-semibold text-[#01B6A8] font-sans">
                          {calculateHours(record.startTime, record.endTime) || "—"} hrs
                        </span>
                      </div>

                      <div className="mb-4 space-y-2 text-sm text-[#5B6065] font-sans">
                        <div className="flex justify-between">
                          <span className="font-medium text-[#717579]">Skilled Workers:</span>
                          <span>{record.skilledWorkers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-[#717579]">Semi-Skilled Workers:</span>
                          <span>{record.semiSkilledWorkers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-[#717579]">Unskilled Workers:</span>
                          <span>{record.unskilledWorkers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-[#717579]">Timing:</span>
                          <span>
                            {formatDuration(record.startTime)} - {formatDuration(record.endTime)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(record)}
                          className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#2945AC]"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(record.id)}
                          className="rounded-lg p-2 transition-colors hover:bg-red-50 text-[#F15F7F]"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

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

      {isAdding && createPortal(
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto md:items-center">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl p-6 md:p-8">
            <div className="p-0">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#353535] font-sans">
                  {editingItem ? "Edit Daily Attendance" : "Add Daily Attendance"}
                </h3>
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
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Row 1 */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#5B6065] font-sans">
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
                    <label className="mb-2 block text-sm font-semibold text-[#5B6065] font-sans">
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
                    <label className="mb-2 block text-base font-bold text-[#353535] font-sans border-b border-[#E5E9F1] pb-2 mt-4">
                      Worker Breakdown
                    </label>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#5B6065] font-sans">
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
                    <label className="mb-2 block text-sm font-semibold text-[#5B6065] font-sans">
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
                    <label className="mb-2 block text-sm font-semibold text-[#5B6065] font-sans">
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
                    <label className="mb-2 block text-base font-bold text-[#353535] font-sans border-b border-[#E5E9F1] pb-2 mt-4">
                      Work Hours
                    </label>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#5B6065] font-sans">
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
                    <label className="mb-2 block text-sm font-semibold text-[#5B6065] font-sans">
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

                <div className="flex flex-col sm:flex-row gap-3 pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:flex-1 h-12 rounded-lg text-white font-bold text-base transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 font-sans"
                    style={{ backgroundColor: "#3D35BE" }}
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
                    className="w-full sm:flex-1 h-12 rounded-lg border border-[#3D35BE] bg-white text-[#3D35BE] font-semibold text-base transition-all hover:bg-[#F0EFFF] disabled:opacity-50 font-sans"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
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
