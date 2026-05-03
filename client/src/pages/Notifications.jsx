import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.jsx";
import { api } from "../lib/api.js";

export function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateCashMeetup(event, requestId, action) {
    event.stopPropagation();
    await api.patch(`/cash-meetups/${requestId}/status`, { action });
    await load();
  }

  return (
    <section className="glass rounded-[36px] p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Notifications</h1>
        <button
          className="text-sm font-semibold text-indigo-600 hover:underline"
          onClick={() => api.patch("/notifications/read-all").then(load)}
        >
          Mark all read
        </button>
      </div>

      {loading ? <Loading label="Loading notifications..." cards={3} /> : null}

      {!loading && notifications.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 py-8 text-slate-400">
          <Bell size={36} className="text-slate-300" />
          <p className="font-semibold">No notifications yet</p>
          <p className="text-sm">You'll see alerts for bookings, messages, and price drops here.</p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="mt-4 divide-y divide-slate-100">
          {notifications.map((note) => (
            <div
              role="button"
              tabIndex={0}
              className={`block w-full rounded-2xl px-3 py-4 text-left transition hover:bg-white/70 ${!note.read ? "bg-indigo-50/60" : ""}`}
              key={note._id}
              onClick={() => {
                api.patch(`/notifications/${note._id}/read`).then(load);
                if (note.data?.actionUrl) {
                  window.location.href = note.data.actionUrl;
                  return;
                }
                if (note.data?.listingId) navigate(`/listing/${note.data.listingId}`);
                if (note.data?.bookingId) navigate("/bookings");
              }}
            >
              <p className="font-semibold text-slate-900">{note.title}</p>
              <p className="mt-0.5 text-sm text-slate-600">{note.message}</p>
              {note.type === "cash_meetup" && note.data?.requestId && note.title === "Cash meetup request" ? (
                <div className="mt-3 flex gap-2">
                  <button className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white" type="button" onClick={(event) => updateCashMeetup(event, note.data.requestId, "accept")}>Accept</button>
                  <button className="rounded-full border border-red-300 px-4 py-2 text-xs font-bold text-red-600" type="button" onClick={(event) => updateCashMeetup(event, note.data.requestId, "reject")}>Decline</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
