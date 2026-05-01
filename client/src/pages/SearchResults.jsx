import React from "react";
import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, Map as MapIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { ErrorMessage } from "../components/ErrorMessage.jsx";
import { ListingCard } from "../components/ListingCard.jsx";
import { Loading } from "../components/Loading.jsx";
import { MapView } from "../components/MapView.jsx";
import { api, getErrorMessage } from "../lib/api.js";
import { getLocationWithFallback } from "../lib/location.js";
import { useUser } from "../lib/userContext.jsx";

const categories = ["All", "Books", "Electronics", "Furniture", "Clothes", "Cycles", "Kitchenware", "Sports gear"];
const conditions = ["Any", "New", "Like New", "Used", "Poor"];
const sellerTypes = ["All", "Student", "Local"];
const listingTypes = [["", "All"], ["sell", "Buy"], ["rent", "Rent"]];

export function SearchResults() {
  const { coords: userCoords } = useUser();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({
    search: params.get("search") || params.get("keyword") || "",
    category: params.get("category") || "All",
    type: params.get("type") || "",
    condition: "Any",
    minPrice: "0",
    maxPrice: "100000",
    radius: "15",
    sellerType: "All",
    lat: params.get("lat") || "",
    lng: params.get("lng") || ""
  });
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      search: params.get("search") || params.get("keyword") || "",
      category: params.get("category") || "All",
      type: params.get("type") || ""
    }));
  }, [params]);

  const query = useMemo(() => {
    const computed = { ...filters };
    if (computed.category === "All") computed.category = "";
    if (computed.condition === "Any") computed.condition = "";
    if (computed.sellerType === "All") computed.sellerType = "";
    return computed;
  }, [filters]);

  useEffect(() => {
    if (filters.lat && filters.lng) return;
    if (userCoords?.lat && userCoords?.lng) {
      setFilters((current) => ({
        ...current,
        lat: current.lat || String(userCoords.lat),
        lng: current.lng || String(userCoords.lng)
      }));
      return;
    }
    getLocationWithFallback().then((coords) => {
      setFilters((current) => ({
        ...current,
        lat: current.lat || String(coords.lat),
        lng: current.lng || String(coords.lng)
      }));
    });
  }, [filters.lat, filters.lng, userCoords]);

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get("/listings", { params: query })
      .then(({ data }) => setListings(data.listings))
      .catch((err) => setError(getErrorMessage(err, "Could not search listings")))
      .finally(() => setLoading(false));
  }, [query]);

  function update(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearAllFilters() {
    setFilters((current) => ({
      ...current,
      search: "",
      category: "All",
      condition: "Any",
      minPrice: "0",
      maxPrice: "100000",
      radius: "15",
      sellerType: "All",
      type: ""
    }));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <motion.aside className="glass h-fit rounded-[32px] p-6" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}>
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-lg font-black"><SlidersHorizontal size={18} /> Search filters</h1>
          <button className="text-sm font-semibold text-violet-700" onClick={clearAllFilters} type="button">Clear all filters</button>
        </div>
        <div className="mt-5 space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-black text-slate-700">Search</h3>
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-4 focus:ring-indigo-100" value={filters.search} onChange={(event) => update("search", event.target.value)} placeholder="What are you looking for?" />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-black text-slate-700">Type</h3>
            <div className="grid grid-cols-3 gap-2">
              {listingTypes.map(([value, label]) => (
                <button key={label} type="button" onClick={() => update("type", value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filters.type === value ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-black text-slate-700">Price range (INR)</h3>
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>INR {Number(filters.minPrice).toLocaleString()}</span>
              <span>INR {Number(filters.maxPrice).toLocaleString()}</span>
            </div>
            <input type="range" min="0" max="100000" step="500" value={filters.minPrice} onChange={(event) => update("minPrice", Math.min(Number(event.target.value), Number(filters.maxPrice)).toString())} className="mt-2 w-full accent-violet-600" />
            <input type="range" min="0" max="100000" step="500" value={filters.maxPrice} onChange={(event) => update("maxPrice", Math.max(Number(event.target.value), Number(filters.minPrice)).toString())} className="mt-2 w-full accent-violet-600" />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-black text-slate-700">Condition</h3>
            <div className="flex flex-wrap gap-2">
              {conditions.map((condition) => (
                <button key={condition} type="button" onClick={() => update("condition", condition)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filters.condition === condition ? "bg-violet-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}>{condition}</button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-black text-slate-700">Distance</h3>
            <div className="text-xs font-semibold text-slate-600">{filters.radius} km</div>
            <input type="range" min="1" max="50" value={filters.radius} onChange={(event) => update("radius", event.target.value)} className="mt-2 w-full accent-violet-600" />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-black text-slate-700">Seller type</h3>
            <div className="flex flex-wrap gap-2">
              {sellerTypes.map((sellerType) => (
                <button key={sellerType} type="button" onClick={() => update("sellerType", sellerType)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filters.sellerType === sellerType ? "bg-violet-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}>{sellerType}</button>
              ))}
            </div>
          </div>
        </div>
      </motion.aside>
      <section>
        <div className="hide-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button
              key={category}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${filters.category === category ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
              onClick={() => update("category", category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-black">{listings.length} results</h2>
          <button className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold text-indigo-700" onClick={() => setShowMap(!showMap)}>
            <MapIcon size={17} /> {showMap ? "Hide map" : "Map view"}
          </button>
        </div>
        <ErrorMessage message={error} />
        {loading ? <Loading label="Searching..." /> : null}
        {showMap ? <div className="mb-5"><MapView listings={listings} /></div> : null}
        <motion.div className="columns-1 gap-5 sm:columns-2 xl:columns-3" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}>
          {!loading && listings.map((listing) => (
            <motion.div className="mb-4 break-inside-avoid" key={listing._id} variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}>
              <ListingCard listing={listing} />
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
