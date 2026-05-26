import { useState } from "react";
import { Calendar, Plus, Users as UsersIcon, X } from "lucide-react";

const initialAttendance = [
  {
    id: "1",
    date: "2026-04-27",
    contractor: "ABC Construction",
    workers: 25,
    workType: "Foundation work",
    hours: 8,
  },
  {
    id: "2",
    date: "2026-04-26",
    contractor: "ABC Construction",
    workers: 28,
    workType: "Concrete pouring",
    hours: 9,
  },
  {
    id: "3",
    date: "2026-04-26",
    contractor: "XYZ Electrical",
    workers: 8,
    workType: "Wiring installation",
    hours: 8,
  },
  {
    id: "4",
    date: "2026-04-25",
    contractor: "ABC Construction",
    workers: 22,
    workType: "Reinforcement setup",
    hours: 8,
  },
  {
    id: "5",
    date: "2026-04-25",
    contractor: "Steel Masters",
    workers: 12,
    workType: "Steel frame assembly",
    hours: 10,
  },
  {
    id: "6",
    date: "2026-04-24",
    contractor: "ABC Construction",
    workers: 26,
    workType: "Excavation",
    hours: 8,
  },
];

const contractors = [
  "ABC Construction",
  "XYZ Electrical",
  "Steel Masters",
  "Plumbing Pro",
  "Mason Works",
];

const workTypes = [
  "Foundation work",
  "Concrete pouring",
  "Wiring installation",
  "Plumbing",
  "Masonry",
  "Steel work",
  "Finishing",
];

function AttendanceManagement({ site }) {
  const [attendance, setAttendance] = useState(initialAttendance);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    contractor: contractors[0],
    workers: "",
    workType: workTypes[0],
    hours: "8",
    date: new Date().toISOString().split("T")[0],
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const newRecord = {
      id: String(attendance.length + 1),
      date: formData.date,
      contractor: formData.contractor,
      workers: Number(formData.workers),
      workType: formData.workType,
      hours: Number(formData.hours),
    };

    setAttendance([newRecord, ...attendance]);
    setIsAdding(false);
    setFormData({
      contractor: contractors[0],
      workers: "",
      workType: workTypes[0],
      hours: "8",
      date: new Date().toISOString().split("T")[0],
    });
  };

  const today = new Date().toISOString().split("T")[0];
  const totalWorkers = attendance
    .filter((record) => record.date === today)
    .reduce((sum, record) => sum + record.workers, 0);

  const thisWeekWorkers = attendance
    .filter((record) => {
      const recordDate = new Date(record.date);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return recordDate >= weekAgo;
    })
    .reduce((sum, record) => sum + record.workers, 0);

  const groupedByDate = attendance.reduce((accumulator, record) => {
    if (!accumulator[record.date]) {
      accumulator[record.date] = [];
    }
    accumulator[record.date].push(record);
    return accumulator;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) =>
    b.localeCompare(a),
  );

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
          <p className="mb-1 text-sm text-gray-600">Today&apos;s Workers</p>
          <h3 className="text-gray-900">{totalWorkers}</h3>
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

      <div className="space-y-4">
        {sortedDates.map((date) => (
          <div key={date}>
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              <h4 className="text-gray-900">{date}</h4>
              <span className="text-sm text-gray-500">
                (
                {groupedByDate[date].reduce(
                  (sum, record) => sum + record.workers,
                  0,
                )}{" "}
                workers)
              </span>
            </div>

            <div className="space-y-2">
              {groupedByDate[date].map((record) => (
                <div
                  key={record.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="mb-1 text-gray-900">{record.contractor}</p>
                      <p className="mb-2 text-sm text-gray-600">
                        {record.workType}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <UsersIcon className="h-4 w-4" />
                          <span>{record.workers} workers</span>
                        </div>
                        <span>{record.hours}h</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-gray-900">Add Daily Attendance</h3>
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
                  <label className="mb-2 block text-gray-700">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(event) =>
                      setFormData({ ...formData, date: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-gray-700">
                    Contractor Name
                  </label>
                  <select
                    value={formData.contractor}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        contractor: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                  >
                    {contractors.map((contractor) => (
                      <option key={contractor} value={contractor}>
                        {contractor}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-gray-700">
                    Number of Skills Workers
                  </label>
                  <input
                    type="number"
                    value={formData.workers}
                    onChange={(event) =>
                      setFormData({ ...formData, workers: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    placeholder="Enter number of skills workers"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-700">
                    Number of Semi-Skills Workers
                  </label>
                  <input
                    type="number"
                    value={formData.workers}
                    onChange={(event) =>
                      setFormData({ ...formData, workers: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    placeholder="Enter number of semi-skills workers"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-700">
                    Number of Unskills Workers
                  </label>
                  <input
                    type="number"
                    value={formData.workers}
                    onChange={(event) =>
                      setFormData({ ...formData, workers: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    placeholder="Enter number of unskills workers"
                    required
                    min="1"
                  />
                </div>

                {/* <div>
                  <label className="mb-2 block text-gray-700">Work Type</label>
                  <select
                    value={formData.workType}
                    onChange={(event) =>
                      setFormData({ ...formData, workType: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                  >
                    {workTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div> */}

                {/* <div>
                  <label className="mb-2 block text-gray-700">
                    Hours Worked
                  </label>
                  <input
                    type="number"
                    value={formData.hours}
                    onChange={(event) =>
                      setFormData({ ...formData, hours: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    placeholder="Enter hours"
                    required
                    min="1"
                    max="24"
                  />
                </div> */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-gray-700">
                      Start Time
                    </label>
                    <select
                      value={formData.startTime || "9"}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          startTime: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    >
                      {[...Array(24)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}:00
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-gray-700">End Time</label>
                    <select
                      value={formData.endTime || "17"}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          endTime: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
                    >
                      {[...Array(24)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}:00
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg px-4 py-3 text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "#3D36BE" }}
                  >
                    Submit Attendance
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

export default AttendanceManagement;
