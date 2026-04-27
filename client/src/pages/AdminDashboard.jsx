import React from "react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loading } from "../components/Loading.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";

export function AdminDashboard() {
  const toast = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [analyticsRes, verificationRes, reportRes] = await Promise.all([
        api.get("/admin/analytics"),
        api.get("/admin/verifications"),
        api.get("/admin/reports")
      ]);
      setAnalytics(analyticsRes.data.analytics);
      setVerifications(verificationRes.data.users ?? []);
      setReports(reportRes.data.reports ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "Admin access required."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function verify(userId, status) {
    try {
      await api.patch(`/admin/verifications/${userId}`, { status });
      toast.success(`Verification ${status}`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update verification"));
    }
  }

  async function resolveReport(id, status) {
    try {
      await api.patch(`/admin/reports/${id}`, { status });
      toast.success("Report updated");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update report"));
    }
  }

  if (error) return <p className="rounded-md bg-red-50 p-4 text-red-700">{error}</p>;
  if (loading) return <Loading label="Loading admin dashboard..." />;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="glass rounded-[32px] p-5">
          <h2 className="font-black">Admin</h2>
          <div className="mt-4 grid gap-2 text-sm font-bold text-slate-600">
            <a href="#metrics">Metrics</a>
            <a href="#verifications">Verifications</a>
            <a href="#reports">Reports</a>
          </div>
        </aside>
        <div id="metrics">
        <h1 className="text-2xl font-semibold">Admin dashboard</h1>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            ["Active users", analytics?.activeUsers],
            ["Listings", analytics?.totalListings],
            ["GMV", `INR ${analytics?.gmv || 0}`],
            ["Completion", `${analytics?.dealCompletionRate || 0}%`]
          ].map(([label, value]) => (
            <div className="rounded-lg border border-slate-200 bg-white p-4" key={label}>
              <p className="text-sm text-slate-600">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <div className="glass mt-5 h-80 rounded-[32px] p-5">
          <h2 className="mb-4 font-black">Popular categories</h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={analytics?.popularCategories?.map((item) => ({ category: item._id || "Other", count: item.count })) || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#7c3aed" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        </div>
      </section>
      <section id="verifications" className="glass rounded-[32px] p-5">
        <h2 className="text-xl font-semibold">Student verifications</h2>
        <div className="mt-4 divide-y">
          {verifications.map((user) => (
            <div className="flex items-center justify-between gap-4 py-4" key={user._id}>
              <span>{user.name} · {user.email}</span>
              <div className="flex gap-2">
                <button className="rounded-md bg-leaf px-3 py-2 text-sm font-semibold text-white" onClick={() => verify(user._id, "approved")}>Approve</button>
                <button className="rounded-md border px-3 py-2 text-sm font-semibold" onClick={() => verify(user._id, "rejected")}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section id="reports" className="glass rounded-[32px] p-5">
        <h2 className="text-xl font-semibold">Reports</h2>
        <div className="mt-4 divide-y">
          {reports.map((report) => (
            <div className="flex items-center justify-between gap-4 py-4" key={report._id}>
              <span>{report.targetType} · {report.reason} · {report.status}</span>
              <div className="flex gap-2">
                <button className="rounded-md border px-3 py-2 text-sm font-semibold" onClick={() => resolveReport(report._id, "reviewing")}>Review</button>
                <button className="rounded-md border px-3 py-2 text-sm font-semibold" onClick={() => resolveReport(report._id, "resolved")}>Resolve</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
