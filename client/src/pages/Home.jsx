import React from "react";
import { ArrowRight, Bike, BookOpen, Dumbbell, Laptop, Search, Shirt, Sofa, Sparkles, UtensilsCrossed } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorMessage } from "../components/ErrorMessage.jsx";
import { ListingCard } from "../components/ListingCard.jsx";
import { Loading } from "../components/Loading.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";
import { getLocationWithFallback } from "../lib/location.js";
import { useUser } from "../lib/userContext.jsx";

const categories = [
  ["Books", BookOpen, "#f97316"],
  ["Electronics", Laptop, "#3b82f6"],
  ["Furniture", Sofa, "#22c55e"],
  ["Clothes", Shirt, "#ec4899"],
  ["Cycles", Bike, "#06b6d4"],
  ["Kitchenware", UtensilsCrossed, "#eab308"],
  ["Sports gear", Dumbbell, "#ef4444"]
];

export function Home() {
  const { coords: userCoords } = useUser();
  const navigate = useNavigate();
  const toast = useToast();
  const [listings, setListings] = useState([]);
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState({ lat: 16.7050, lng: 74.2433 });
  const [heroType, setHeroType] = useState("sell");

  useEffect(() => {
    if (userCoords?.lat && userCoords?.lng) {
      setCoords(userCoords);
      return;
    }
    getLocationWithFallback().then(setCoords);
  }, [userCoords]);

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get("/listings", { params: { type, lat: coords.lat, lng: coords.lng, radius: 15 } })
      .then(({ data }) => setListings(data.listings))
      .catch((err) => setError(getErrorMessage(err, "Could not load listings")))
      .finally(() => setLoading(false));
  }, [type, coords.lat, coords.lng]);

  async function save(listing) {
    try {
      await api.post(`/listings/${listing._id}/wishlist`);
      toast.success("Saved to wishlist");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not save listing"));
    }
  }

  function submit(event) {
    event.preventDefault();
    navigate(`/search?search=${encodeURIComponent(search)}&type=${heroType || "sell"}&lat=${coords.lat}&lng=${coords.lng}`);
  }

  function submitWithType(nextType) {
    setHeroType(nextType);
    navigate(`/search?search=${encodeURIComponent(search)}&type=${nextType}&lat=${coords.lat}&lng=${coords.lng}`);
  }

  return (
    <div className="space-y-16 pb-20">
      <motion.section
        className="relative isolate overflow-hidden rounded-[40px] px-5 py-20 text-center text-white shadow-2xl shadow-indigo-950/20 sm:px-10"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(130deg,#4f46e5_0%,#7c3aed_35%,#0ea5e9_100%)]" />
        <motion.div className="absolute -left-16 top-10 -z-10 h-44 w-44 rounded-full bg-white/20 blur-3xl" animate={{ y: [0, -16, 0] }} transition={{ duration: 8, repeat: Infinity }} />
        <motion.div className="absolute right-10 top-16 -z-10 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" animate={{ y: [0, 12, 0] }} transition={{ duration: 10, repeat: Infinity }} />
        <motion.div className="absolute bottom-12 left-1/3 -z-10 h-40 w-40 rounded-full bg-fuchsia-300/20 blur-3xl" animate={{ y: [0, -10, 0] }} transition={{ duration: 9, repeat: Infinity }} />
        <motion.p className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur" whileHover={{ scale: 1.03 }}>
          <Sparkles size={16} />
          Student and local marketplace
        </motion.p>
        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
          Rent, Buy & Sell — Everything Around You
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-white/82">
          Discover books, cycles, gadgets, furniture, and daily essentials from people near your campus.
        </p>
        <form className="glass mx-auto mt-9 flex max-w-3xl flex-col gap-3 rounded-full p-2 text-slate-950 sm:flex-row" onSubmit={submit}>
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
            <input
              className="w-full rounded-full border-0 bg-white/80 px-12 py-4 outline-none transition focus:ring-4 focus:ring-white/50"
              placeholder="Search books, cycles, laptops..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <motion.button
            type="button"
            className="rounded-full bg-emerald-600 px-7 py-4 font-bold text-white"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => submitWithType("sell")}
          >
            Buy
          </motion.button>
          <motion.button
            type="button"
            className="rounded-full bg-violet-600 px-7 py-4 font-bold text-white"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => submitWithType("rent")}
          >
            Rent
          </motion.button>
        </form>
      </motion.section>

      <motion.section initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-black">Browse categories</h2>
          <button className="inline-flex items-center gap-2 font-bold text-indigo-700" onClick={() => navigate("/search")}>
            Explore all <ArrowRight size={17} />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {categories.map(([category, Icon, bg]) => (
            <motion.button
              className="glass rounded-[28px] p-5 text-left transition"
              key={category}
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -8, scale: 1.03 }}
              onClick={() => navigate(`/search?category=${encodeURIComponent(category)}&lat=${coords.lat}&lng=${coords.lng}`)}
            >
              <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg" style={{ backgroundColor: bg }}>
                <Icon size={22} />
              </span>
              <span className="font-bold">{category}</span>
            </motion.button>
          ))}
        </div>
      </motion.section>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-black">Trending near you</h2>
          <div className="flex gap-2">
            {["", "sell", "rent"].map((item) => (
              <button
                className={`rounded-full px-4 py-2 text-sm font-bold ${type === item ? "brand-gradient text-white" : "glass text-slate-700"}`}
                key={item || "all"}
                onClick={() => setType(item)}
              >
                {item === "sell" ? "Buy" : item === "rent" ? "Rent" : "All"}
              </button>
            ))}
          </div>
        </div>
        <ErrorMessage message={error} />
        {loading ? <Loading label="Finding nearby listings..." cards={4} /> : null}
        {!loading ? (
          <div className="hide-scrollbar flex gap-5 overflow-x-auto pb-4">
            {listings.map((listing) => (
              <div className="w-80 shrink-0" key={listing._id}>
                <ListingCard listing={listing} onSave={save} />
              </div>
            ))}
            {listings.length === 0 ? (
              <div className="glass w-full rounded-[32px] p-10 text-center text-slate-600">
                <Sparkles className="mx-auto mb-3 text-indigo-600" />
                No listings yet. Be the first to post something useful nearby.
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {categories.map(([category]) => {
        const categoryListings = listings
          .filter((listing) => listing.category === category)
          .slice(0, 4);
        return (
          <section key={category}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black">{category} near you</h2>
              <button
                className="inline-flex items-center gap-2 font-bold text-indigo-700"
                onClick={() =>
                  navigate(
                    `/search?category=${encodeURIComponent(category)}&type=${type}&lat=${coords.lat}&lng=${coords.lng}`
                  )
                }
                type="button"
              >
                See all <ArrowRight size={17} />
              </button>
            </div>
            <div className="hide-scrollbar flex gap-5 overflow-x-auto pb-4">
              {categoryListings.map((listing) => (
                <div className="w-80 shrink-0" key={listing._id}>
                  <ListingCard listing={listing} onSave={save} />
                </div>
              ))}
              {categoryListings.length === 0 ? (
                <div className="glass w-full rounded-[24px] p-6 text-sm text-slate-600">
                  No {category.toLowerCase()} listings found nearby.
                </div>
              ) : null}
            </div>
          </section>
        );
      })}

      <footer className="glass rounded-[32px] p-6 text-sm text-slate-600">
        <div className="flex flex-col justify-between gap-3 sm:flex-row">
          <p className="font-bold text-slate-950">Rent Anything Anywhere</p>
          <div className="flex gap-4">
            <button onClick={() => navigate("/search")}>Search</button>
            <button onClick={() => navigate("/create")}>Post</button>
            <button onClick={() => navigate("/chat")}>Chat</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
