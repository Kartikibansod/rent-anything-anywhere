import React, { useEffect, useState } from "react";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorMessage } from "../components/ErrorMessage.jsx";
import { Loading } from "../components/Loading.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";
import { getListingImage, handleImageError } from "../lib/listingImage.js";

export function MyListings() {
  const toast = useToast();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/listings/my");
      setListings(data.listings ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load your listings"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function remove(id) {
    try {
      await api.delete(`/listings/${id}`);
      setListings((prev) => prev.filter((l) => l._id !== id));
      toast.success("Listing deleted");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete listing"));
    }
  }

  return (
    <section className="glass rounded-[36px] p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">My listings</h1>
        <Link
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
          to="/sell"
        >
          <Plus size={15} /> New listing
        </Link>
      </div>

      <ErrorMessage message={error} />
      {loading ? <Loading label="Loading your listings..." cards={3} /> : null}

      {!loading && listings.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 py-10 text-slate-400">
          <Package size={40} className="text-slate-300" />
          <p className="font-semibold">No listings yet</p>
          <Link
            className="mt-1 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
            to="/sell"
          >
            Post your first listing
          </Link>
        </div>
      )}

      {!loading && listings.length > 0 && (
        <div className="mt-5 divide-y divide-slate-100">
          {listings.map((listing) => (
            <div className="flex items-center gap-4 py-4" key={listing._id}>
              {/* Thumbnail */}
              <img
                className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                src={getListingImage(listing)}
                alt={listing.title}
                onError={(e) => handleImageError(e, listing.category)}
              />
              {/* Info */}
              <div className="min-w-0 flex-1">
                <Link
                  className="block truncate font-semibold hover:text-indigo-700"
                  to={`/listings/${listing._id}`}
                >
                  {listing.title}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500">
                  {listing.category} ·{" "}
                  <span className={`font-semibold ${listing.type === "sell" ? "text-emerald-600" : "text-violet-600"}`}>
                    {listing.type === "sell" ? "For Sale" : "For Rent"}
                  </span>
                  {" · "}
                  <span className={`capitalize ${listing.status === "active" ? "text-emerald-600" : "text-slate-400"}`}>
                    {listing.status}
                  </span>
                </p>
              </div>
              {/* Actions */}
              <div className="flex shrink-0 gap-2">
                <Link
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                  to={`/listings/${listing._id}`}
                >
                  <Pencil size={15} />
                </Link>
                <button
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:border-red-300 hover:text-red-600"
                  onClick={() => remove(listing._id)}
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
