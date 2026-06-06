import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Calendar, Users } from "lucide-react";
import apiClient from "../../../shared/services/apiClient";
import Pagination from "../../../shared/components/Pagination";

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


function Attendance() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSite, setSelectedSite] = useState("all");

  const [attendances, setAttendances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [allAttendances, setAllAttendances] = useState([]);
  const pageSize = 10;

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadData();
  }, [pageNumber, selectedSite, startDate, endDate]);

  useEffect(() => {
    setPageNumber(1);
  }, [selectedSite, startDate, endDate]);

  const loadMetadata = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.post(
        "/graphql",
        {
          query: `
            query GetAttendanceMetadata {
              sites {
                id
                siteName
              }
            }
          `
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response?.data?.data) {
        setSites(response.data.data.sites || []);
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
      
      let startVar = null;
      if (startDate) {
        startVar = new Date(startDate).toISOString();
      }
      
      let endVar = null;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        endVar = end.toISOString();
      }

      const response = await apiClient.post(
        "/graphql",
        {
          query: `
            query GetAttendancesPage($pageNumber: Int!, $pageSize: Int!, $siteId: Int, $startDate: DateTime, $endDate: DateTime) {
              attendancesPage(pageNumber: $pageNumber, pageSize: $pageSize, siteId: $siteId, startDate: $startDate, endDate: $endDate) {
                items {
                  id
                  date
                  site { siteName }
                  contractor { contractorName }
                  supervisor { name }
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
            }
          `,
          variables: {
            pageNumber,
            pageSize,
            siteId: selectedSite === "all" ? null : parseInt(selectedSite),
            startDate: startVar,
            endDate: endVar,
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response?.data?.data) {
        setAttendances(response.data.data.attendancesPage?.items || []);
        setTotalCount(response.data.data.attendancesPage?.totalCount || 0);
        setAllAttendances(response.data.data.attendances || []);
      }
    } catch (error) {
      console.error("Failed to load attendances page", error);
      toast.error(error?.message || "Failed to load attendance data");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAll = allAttendances.filter((record) => {
    const recordDate = record.date.split("T")[0];
    const matchesSite = selectedSite === "all" || String(record.siteId) === String(selectedSite);
    const matchesStart = !startDate || recordDate >= startDate;
    const matchesEnd = !endDate || recordDate <= endDate;
    return matchesSite && matchesStart && matchesEnd;
  });

  const paginatedAttendance = attendances;

  const todayStr = new Date().toISOString().split("T")[0];
  const todayRecords = filteredAll.filter(
    (record) => record.date.split("T")[0] === todayStr,
  );
  const totalWorkers = filteredAll.reduce(
    (sum, record) =>
      sum +
      (record.skilledWorkers || 0) +
      (record.semiSkilledWorkers || 0) +
      (record.unskilledWorkers || 0),
    0,
  );

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900 md:text-3xl">
          Attendance
        </h1>
        <p className="text-gray-600">
          View daily worker attendance records from all sites
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Today Records</p>
              <h3 className="text-gray-900">{todayRecords.length}</h3>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Workers</p>
              <h3 className="text-gray-900">{totalWorkers}</h3>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#3D36BE20" }}
            >
              <Calendar className="h-6 w-6" style={{ color: "#3D36BE" }} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Entries</p>
              <h3 className="text-gray-900">{filteredAll.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm text-gray-700">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-gray-700">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-gray-700">Site</label>
          <select
            value={selectedSite}
            onChange={(event) => setSelectedSite(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
          >
            <option value="all">All Sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.siteName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-gray-700">Date</th>
                <th className="px-6 py-4 text-left text-gray-700">Site</th>
                <th className="px-6 py-4 text-left text-gray-700">
                  Contractor
                </th>
                <th className="px-6 py-4 text-left text-gray-700">
                  Supervisor
                </th>
                <th className="px-6 py-4 text-left text-gray-700">Skills Workers</th>
                <th className="px-6 py-4 text-left text-gray-700">Semi-Skills Workers</th>
                <th className="px-6 py-4 text-left text-gray-700">Unskills Workers</th>
                <th className="px-6 py-4 text-left text-gray-700">Start Time</th>
                <th className="px-6 py-4 text-left text-gray-700">End Time</th>
                <th className="px-6 py-4 text-left text-gray-700">Total Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                    No data available
                  </td>
                </tr>
              ) : (
                attendances.map((record) => (
                  <tr
                    key={record.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-gray-900">{record.date.split("T")[0]}</td>
                    <td className="px-6 py-4 text-gray-900">{record.site?.siteName || "—"}</td>
                    <td className="px-6 py-4 text-gray-900">
                      {record.contractor?.contractorName || "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {record.supervisor?.name || "—"}
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
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      {calculateHours(record.startTime, record.endTime) || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="border-t border-gray-200 px-6 py-4">
          <Pagination
            pageNumber={pageNumber}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={(nextPage) => setPageNumber(nextPage)}
          />
        </div>
      </div>
    </div>
  );
}

export default Attendance;




