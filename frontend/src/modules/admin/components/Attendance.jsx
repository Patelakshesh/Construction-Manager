import { useState } from "react";
import { Calendar, Users } from "lucide-react";

const attendanceRecords = [
  {
    id: "1",
    date: "2026-04-27",
    site: "Downtown Plaza",
    contractor: "ABC Construction",
    supervisor: "John Doe",
    skilledWorkers: 8,
    semiSkilledWorkers: 10,
    unskilledWorkers: 7,
    startTime: "08:00",
    endTime: "17:00",
  },
  {
    id: "2",
    date: "2026-04-27",
    site: "Riverside Complex",
    contractor: "XYZ Builders",
    supervisor: "Jane Smith",
    skilledWorkers: 6,
    semiSkilledWorkers: 7,
    unskilledWorkers: 5,
    startTime: "08:30",
    endTime: "17:30",
  },
  {
    id: "3",
    date: "2026-04-26",
    site: "Industrial Park",
    contractor: "Steel Masters",
    supervisor: "Mike Johnson",
    skilledWorkers: 4,
    semiSkilledWorkers: 5,
    unskilledWorkers: 3,
    startTime: "07:30",
    endTime: "17:30",
  },
  {
    id: "4",
    date: "2026-04-26",
    site: "Suburban Mall",
    contractor: "Prime Interiors",
    supervisor: "Sarah Williams",
    skilledWorkers: 5,
    semiSkilledWorkers: 9,
    unskilledWorkers: 6,
    startTime: "09:00",
    endTime: "18:00",
  },
  {
    id: "5",
    date: "2026-04-25",
    site: "Tech Campus",
    contractor: "ABC Construction",
    supervisor: "Tom Anderson",
    skilledWorkers: 9,
    semiSkilledWorkers: 11,
    unskilledWorkers: 10,
    startTime: "08:00",
    endTime: "17:00",
  },
];

function Attendance() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSite, setSelectedSite] = useState("all");

  const siteOptions = ["all", ...new Set(attendanceRecords.map((r) => r.site))];

  const filteredAttendance = attendanceRecords.filter((record) => {
    const matchesSite = selectedSite === "all" || record.site === selectedSite;
    const matchesStart = !startDate || record.date >= startDate;
    const matchesEnd = !endDate || record.date <= endDate;
    return matchesSite && matchesStart && matchesEnd;
  });

  const todayRecords = filteredAttendance.filter(
    (record) => record.date === "2026-04-27",
  );
  const totalWorkers = filteredAttendance.reduce(
    (sum, record) =>
      sum +
      record.skilledWorkers +
      record.semiSkilledWorkers +
      record.unskilledWorkers,
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
              <h3 className="text-gray-900">{filteredAttendance.length}</h3>
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
            {siteOptions.map((site) => (
              <option key={site} value={site}>
                {site === "all" ? "All Sites" : site}
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
                {/* <th className="px-6 py-4 text-left text-gray-700">
                  Work Type
                </th> */}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAttendance.map((record) => (
                <tr
                  key={record.id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-gray-900">{record.date}</td>
                  <td className="px-6 py-4 text-gray-900">{record.site}</td>
                  <td className="px-6 py-4 text-gray-900">
                    {record.contractor}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {record.supervisor}
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
                    {record.startTime}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {record.endTime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Attendance;




