import React, { useState, useEffect } from "react";
import { safeSessionStorage } from "../utils/storage";

interface AttendanceRecord {
  id: number;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
}

export default function EmployeePortal({ authToken }: { authToken?: string }) {
  const [activeTab, setActiveTab] = useState<"checkin" | "routes" | "mom" | "history">("checkin");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // MOM Form state
  const [momSubject, setMomSubject] = useState("");
  const [momNotes, setMomNotes] = useState("");

  const token = authToken || safeSessionStorage.getItem("token");


  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/attendance/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const records = Array.isArray(data) ? data : data.results || [];
        setAttendance(records);
        const todayRec = records.find((r: AttendanceRecord) => !r.check_out_time);
        setIsCheckedIn(!!todayRec);
      }
    } catch (e) {
      console.error("Failed to fetch attendance history", e);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    setMessage("");

    const payload = { lat: 12.9716, lng: 77.5946 };

    // Offline queue fallback
    if (!navigator.onLine) {
      const pendingQueue = JSON.parse(localStorage.getItem("offline_checkins") || "[]");
      pendingQueue.push({ type: "check-in", timestamp: new Date().toISOString(), payload });
      localStorage.setItem("offline_checkins", JSON.stringify(pendingQueue));
      setMessage("Offline: Check-in queued locally and will sync when reconnected.");
      setIsCheckedIn(true);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/attendance/check-in/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage("Check-in recorded successfully!");
        setIsCheckedIn(true);
        fetchHistory();
      } else {
        let errText = "Check-in failed.";
        try {
          const err = await res.json();
          errText = err.detail || err.error || errText;
        } catch (_) {}
        setMessage(errText);
      }
    } catch (e) {
      setMessage("Network error during check-in.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    setMessage("");

    const payload = { lat: 12.9716, lng: 77.5946 };

    try {
      const res = await fetch("/api/attendance/check-out/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage("Check-out recorded successfully!");
        setIsCheckedIn(false);
        fetchHistory();
      } else {
        let errText = "Check-out failed.";
        try {
          const err = await res.json();
          errText = err.detail || err.error || errText;
        } catch (_) {}
        setMessage(errText);
      }

    } catch (e) {
      setMessage("Network error during check-out.");
    } finally {
      setLoading(false);
    }
  };

  const handleMomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/visit-logs/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject: momSubject, notes: momNotes }),
      });
      if (res.ok) {
        setMessage("MOM / Visit Log submitted successfully!");
        setMomSubject("");
        setMomNotes("");
      } else {
        setMessage("Failed to submit MOM.");
      }
    } catch (e) {
      setMessage("Network error submitting MOM.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans max-w-md mx-auto shadow-2xl">
      {/* Top Mobile Bar */}
      <header className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">FieldSense Mobile</h1>
          <p className="text-xs text-slate-400">Field Worker Portal</p>
        </div>
        <button
          onClick={() => {
            safeSessionStorage.clear();
            window.location.href = "/login";
          }}
          className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 transition"
        >
          Logout
        </button>
      </header>

      {/* Alert Banner */}
      {message && (
        <div className="m-4 p-3 rounded-lg text-sm bg-blue-500/20 border border-blue-500/50 text-blue-300">
          {message}
        </div>
      )}

      {/* Content Area */}
      <main className="flex-1 p-4 overflow-y-auto space-y-6">
        {activeTab === "checkin" && (
          <div className="space-y-6 text-center pt-6">
            <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/10 border-2 border-blue-500 flex items-center justify-center text-blue-400 text-2xl font-bold">
                {isCheckedIn ? "ON" : "OFF"}
              </div>
              <div>
                <h2 className="text-xl font-bold">{isCheckedIn ? "Checked In" : "Not Checked In"}</h2>
                <p className="text-xs text-slate-400">
                  {isCheckedIn ? "Active Shift in Progress" : "Ready to Start Shift"}
                </p>
              </div>

              {!isCheckedIn ? (
                <button
                  onClick={handleCheckIn}
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-white shadow-lg transition"
                >
                  {loading ? "Recording..." : "Start Shift (Check-In)"}
                </button>
              ) : (
                <button
                  onClick={handleCheckOut}
                  disabled={loading}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 font-bold rounded-xl text-white shadow-lg transition"
                >
                  {loading ? "Recording..." : "End Shift (Check-Out)"}
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">My Attendance History</h2>
            {attendance.length === 0 ? (
              <p className="text-sm text-slate-500">No attendance records found.</p>
            ) : (
              attendance.map((rec) => (
                <div key={rec.id} className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-200">{rec.date}</p>
                    <p className="text-xs text-slate-400">In: {rec.check_in_time || "N/A"}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${rec.check_out_time ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {rec.check_out_time ? `Out: ${rec.check_out_time}` : 'Active'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "mom" && (
          <form onSubmit={handleMomSubmit} className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">File Visit Log / MOM</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Subject</label>
              <input
                type="text"
                value={momSubject}
                onChange={(e) => setMomSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Notes / Minutes of Meeting</label>
              <textarea
                rows={4}
                value={momNotes}
                onChange={(e) => setMomNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-lg text-white text-sm transition"
            >
              Submit Visit Log
            </button>
          </form>
        )}
      </main>

      {/* Bottom Nav Tabs */}
      <nav className="p-2 bg-slate-800 border-t border-slate-700 grid grid-cols-3 gap-1 text-center text-xs">
        <button
          onClick={() => setActiveTab("checkin")}
          className={`py-2 rounded-lg transition ${activeTab === "checkin" ? "bg-blue-600 font-bold text-white" : "text-slate-400 hover:bg-slate-700"}`}
        >
          Check-In
        </button>
        <button
          onClick={() => setActiveTab("mom")}
          className={`py-2 rounded-lg transition ${activeTab === "mom" ? "bg-blue-600 font-bold text-white" : "text-slate-400 hover:bg-slate-700"}`}
        >
          File MOM
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`py-2 rounded-lg transition ${activeTab === "history" ? "bg-blue-600 font-bold text-white" : "text-slate-400 hover:bg-slate-700"}`}
        >
          History
        </button>
      </nav>
    </div>
  );
}
