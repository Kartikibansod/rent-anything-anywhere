import React from "react";
import { ArrowRight, PackageOpen, Search, Sparkles } from "lucide-react";
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
  ["Books", "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400"],
  ["Electronics", "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400"],
  ["Furniture", "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400"],
  ["Clothes", "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400"],
  ["Cycles", "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"],
  ["Kitchenware", "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400"],
  ["Sports gear", "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400"]
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
    <div className="-mx-4 space-y-0 bg-white pb-20 sm:-mx-5">
      <motion.section
        className="relative isolate mx-4 overflow-hidden rounded-[32px] px-5 py-20 text-center text-white shadow-2xl shadow-indigo-950/20 sm:mx-5 sm:px-10"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(130deg,#4f46e5_0%,#7c3aed_42%,#2563eb_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.22),transparent_28rem)]" />
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

      <motion.section className="mt-16 bg-white px-4 sm:px-5" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-black">Browse categories</h2>
          <button className="inline-flex items-center gap-2 font-bold text-indigo-700" onClick={() => navigate("/search")}>
            Explore all <ArrowRight size={17} />
          </button>
        </div>
        <div className="hide-scrollbar flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-7 lg:overflow-visible">
          {categories.map(([category, image]) => (
            <motion.button
              className="group relative h-40 w-52 shrink-0 overflow-hidden rounded-2xl text-left shadow-lg transition lg:w-auto"
              key={category}
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -8, scale: 1.03 }}
              onClick={() => navigate(`/buy?category=${encodeURIComponent(category)}`)}
            >
              <img className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110" src={image} alt="" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/5" />
              <span className="absolute bottom-4 left-4 right-4 text-xl font-black text-white">{category}</span>
            </motion.button>
          ))}
        </div>
      </motion.section>

      <section className="mt-16 bg-[#f9fafb] px-4 py-12 sm:px-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-black">Trending near you</h2>
          <div className="flex gap-2">
            {["", "sell", "rent"].map((item) => (
              <button
                className={`rounded-full px-4 py-2 text-sm font-bold ${type === item ? "brand-gradient text-white" : "bg-white text-slate-700 shadow-sm"}`}
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
              <div className="w-full rounded-[24px] bg-white p-10 text-center text-slate-600 shadow-sm">
                <PackageOpen className="mx-auto mb-3 text-indigo-600" size={42} />
                <p className="text-lg font-black text-slate-800">No listings yet</p>
                <p className="mt-2 text-sm">Be the first to post something!</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {categories.map(([category]) => {
        const categoryListings = listings
          .filter((listing) => listing.category === category)
          .slice(0, 4);
        if (categoryListings.length === 0) return null;
        return (
          <section className="bg-white px-4 py-12 sm:px-5" key={category}>
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
            </div>
          </section>
        );
      })}

      <footer className="mx-4 mt-4 rounded-[24px] bg-white p-6 text-sm text-slate-600 shadow-sm sm:mx-5">
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
