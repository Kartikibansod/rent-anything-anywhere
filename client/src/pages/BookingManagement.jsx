import React, { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { ErrorMessage } from "../components/ErrorMessage.jsx";
import { Loading } from "../components/Loading.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";

const ACTIONS = [
  ["approve",         "Approve"],
  ["reject",          "Reject"],
  ["mark_returned",   "Mark returned"],
  ["confirm_return",  "Confirm return"],
  ["dispute",         "Dispute"]
];

export function BookingManagement() {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/bookings/my");
      setBookings(data.bookings ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load bookings"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function act(id, action) {
    try {
      await api.patch(`/bookings/${id}/status`, { action });
      toast.success("Booking updated");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update booking"));
    }
  }

  return (
    <section className="glass rounded-[36px] p-5">
      <h1 className="text-2xl font-black">Bookings</h1>

      <ErrorMessage message={error} />
      {loading ? <Loading label="Loading bookings..." cards={3} /> : null}

      {!loading && bookings.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 py-10 text-slate-400">
          <Calendar size={40} className="text-slate-300" />
          <p className="font-semibold">No bookings yet</p>
          <p className="text-sm">Rental bookings will appear here once someone requests your items.</p>
        </div>
      )}

      {!loading && bookings.length > 0 && (
        <div className="mt-5 space-y-4">
          {bookings.map((booking) => (
            <article
              className="rounded-[28px] border border-white bg-white/70 p-4"
              key={booking._id}
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="font-semibold">{booking.listing?.title ?? "Rental booking"}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {booking.startDate?.slice(0, 10)} → {booking.endDate?.slice(0, 10)}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    INR {booking.rentalAmount} + INR {booking.damageDeposit ?? 0} deposit
                  </p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold capitalize ${
                    booking.status === "approved" ? "bg-emerald-100 text-emerald-700"
                    : booking.status === "rejected" ? "bg-red-100 text-red-700"
                    : booking.status === "completed" ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700"
                  }`}>
                    {booking.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ACTIONS.map(([action, label]) => (
                    <button
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                      key={action}
                      onClick={() => act(booking._id, action)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
