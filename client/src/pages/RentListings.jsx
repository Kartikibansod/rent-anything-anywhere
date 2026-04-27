import React, { useEffect, useState } from "react";
import { ArrowRight, Search, Tag, SlidersHorizontal, X } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ListingCard } from "../components/ListingCard.jsx";
import { Loading } from "../components/Loading.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";
import { getLocationWithFallback } from "../lib/location.js";

const categories = ["Books", "Electronics", "Furniture", "Clothes", "Cycles", "Kitchenware", "Sports gear"];

export function RentListings() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get("search") || "");
  const [category, setCategory] = useState(params.get("category") || "");
  const [condition, setCondition] = useState("");
  const [coords, setCoords] = useState({ lat: 16.705, lng: 74.2433 });

  useEffect(() => {
    getLocationWithFallback().then(setCoords);
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get("/listings", {
        params: {
          mode: "rent",
          search: search || undefined,
          category: category || undefined,
          condition: condition || undefined,
          lat: coords.lat,
          lng: coords.lng,
          distance: 15
        }
      })
      .then(({ data }) => setListings(data.listings))
      .catch((err) => toast.error(getErrorMessage(err, "Could not load listings")))
      .finally(() => setLoading(false));
  }, [search, category, condition, coords.lat, coords.lng]);

  async function save(listing) {
    try {
      await api.post(`/listings/${listing._id}/wishlist`);
      toast.success("Saved to wishlist");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not save"));
    }
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <motion.div
        className="relative isolate overflow-hidden rounded-[36px] bg-gradient-to-br from-violet-600 to-purple-700 px-8 py-14 text-white shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute inset-0 -z-10 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 0, transparent 40%)" }} />
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
          <Tag size={15} /> Items available for rent
        </div>
        <h1 className="mt-4 text-4xl font-black sm:text-5xl">Rent Items</h1>
        <p className="mt-3 max-w-xl text-white/85">
          Rent cycles, cameras, books, furniture and more from people near your campus — by the day, week, or month.
        </p>

        {/* Search bar */}
        <form className="mt-6 flex max-w-2xl gap-3" onSubmit={(e) => e.preventDefault()}>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" size={18} />
            <input
              className="w-full rounded-full border-0 bg-white/20 px-11 py-3.5 text-white placeholder-white/60 outline-none backdrop-blur focus:bg-white/30 focus:ring-2 focus:ring-white/50"
              placeholder="Search items to rent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <button
              className="rounded-full bg-white/20 px-4 py-3 backdrop-blur hover:bg-white/30"
              onClick={() => setSearch("")}
              type="button"
            >
              <X size={16} />
            </button>
          )}
        </form>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <SlidersHorizontal size={15} /> Filter:
        </div>
        <button
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${!category ? "bg-violet-600 text-white" : "glass text-slate-700 hover:bg-white"}`}
          onClick={() => setCategory("")}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${category === cat ? "bg-violet-600 text-white" : "glass text-slate-700 hover:bg-white"}`}
            onClick={() => setCategory(cat === category ? "" : cat)}
          >
            {cat}
          </button>
        ))}
        <select
          className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold outline-none"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        >
          <option value="">Any condition</option>
          <option value="new">New</option>
          <option value="like_new">Like new</option>
          <option value="used">Used</option>
          <option value="poor">Poor</option>
        </select>
      </div>

      {/* Results */}
      <div>
        {!loading && (
          <p className="mb-4 text-sm font-semibold text-slate-500">
            {listings.length} item{listings.length !== 1 ? "s" : ""} available for rent nearby
          </p>
        )}

        {loading ? (
          <Loading cards={8} />
        ) : listings.length === 0 ? (
          <div className="glass rounded-[32px] p-12 text-center text-slate-500">
            <Tag className="mx-auto mb-4 text-violet-400" size={40} />
            <p className="text-lg font-bold">No rental items found.</p>
            <p className="mt-2 text-sm">Try a different category or search term.</p>
            <button
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-700"
              onClick={() => navigate("/sell")}
            >
              List your item for rent <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <motion.div
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          >
            {listings.map((listing) => (
              <motion.div
                key={listing._id}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              >
                <ListingCard listing={listing} onSave={save} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
