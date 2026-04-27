import React from "react";
import { Calendar, Eye, Flag, Heart, MessageCircle, Share2, Star, UserCircle2, X } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loading } from "../components/Loading.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage, submitReport } from "../lib/api.js";
import { getListingFallbackImage, postedAgo } from "../lib/display.js";

export function ListingDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [listing, setListing] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [offer, setOffer] = useState("");
  const [booking, setBooking] = useState({ startDate: "", endDate: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [similar, setSimilar] = useState([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Fake listing");

  useEffect(() => {
    api
      .get(`/listings/${id}`)
      .then(({ data }) => {
        setListing(data.listing);
        return api.get(`/listings/${id}/similar`, { params: { limit: 4 } });
      })
      .then(({ data }) => setSimilar(data.listings || []))
      .catch((err) => setError(getErrorMessage(err, "Could not load listing")));
  }, [id]);

  if (!listing && !error) return <Loading label="Loading listing..." />;
  if (error) return <p className="rounded-md bg-red-50 p-4 text-red-700">{error}</p>;

  const photo = listing.photos?.[photoIndex]?.url;

  async function makeOffer() {
    try {
      await api.post(`/listings/${id}/offer`, { amount: offer });
      setMessage("Offer sent.");
      toast.success("Offer sent");
    } catch (err) {
      const text = getErrorMessage(err);
      setMessage(text);
      toast.error(text);
    }
  }

  async function book() {
    const rate = listing.rentRates?.daily || listing.rentRates?.weekly || listing.rentRates?.monthly || 0;
    try {
      await api.post("/bookings", {
        listingId: id,
        ...booking,
        totalPrice: rate,
        depositAmount: listing.damageDeposit
      });
      setMessage("Booking request sent.");
      toast.success("Booking request sent");
    } catch (err) {
      const text = getErrorMessage(err);
      setMessage(text);
      toast.error(text);
    }
  }

  async function save() {
    try {
      await api.post(`/listings/${id}/wishlist`);
      toast.success("Wishlist updated");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update wishlist"));
    }
  }

  async function report() {
    try {
      await submitReport({ type: "listing", reported: id, reason: reportReason });
      toast.success("Report submitted");
      setReportOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not submit report"));
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
      setShareOpen(false);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`Check this out: ${listing.title} ${url}`)}`, "_blank");
      setShareOpen(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-sm text-slate-500">
        <Link to="/feed" className="hover:text-violet-700">Home</Link> {" > "}
        <span>{listing.category}</span> {" > "}
        <span className="text-slate-700">{listing.title}</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <section className="space-y-3">
        <div className="glass aspect-[4/3] overflow-hidden rounded-[40px] bg-slate-100">
          {photo ? <motion.img className="h-full w-full object-cover" src={photo} alt={listing.title} onError={(event) => { event.currentTarget.src = getListingFallbackImage(listing.category); }} initial={{ scale: 1.05, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} /> : null}
        </div>
        <div className="flex gap-2 overflow-auto">
          {(listing.photos || []).slice(0, 5).map((item, index) => (
            <button className="h-20 w-24 overflow-hidden rounded-2xl border border-white/70 shadow-sm" key={item.publicId || item.url} onClick={() => setPhotoIndex(index)} type="button">
              <img className="h-full w-full object-cover" src={item.url} onError={(event) => { event.currentTarget.src = getListingFallbackImage(listing.category); }} alt="" />
            </button>
          ))}
        </div>
      </section>
      <aside className="glass sticky top-28 h-fit rounded-[36px] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-indigo-700">{listing.category}</p>
            <h1 className="mt-2 text-3xl font-black">{listing.title}</h1>
          </div>
          <motion.button className="rounded-full border border-white bg-white/70 p-3 shadow-sm" onClick={save} type="button" whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.08 }}>
            <Heart size={20} />
          </motion.button>
        </div>
        <p className="text-gradient mt-4 text-3xl font-black">
          {listing.type === "rent" ? `INR ${listing.rentRates?.daily || 0}/day` : `INR ${listing.askingPrice || 0}`}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1"><Eye size={14} /> {listing.viewCount || 0} views</span>
          <span>Posted {postedAgo(listing.createdAt)}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${listing.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            {listing.status === "active" ? "Available" : "Sold"}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">{listing.condition} · {listing.location?.address}</p>
        {listing.itemAge ? <p className="mt-2 text-sm font-semibold text-slate-700">Age: {listing.itemAge}</p> : null}
        {listing.conditionDescription ? <p className="mt-2 text-sm text-slate-600">{listing.conditionDescription}</p> : null}
        <p className="mt-5 leading-7 text-slate-700">{listing.description}</p>

        <div className="mt-5 rounded-[24px] bg-white/70 p-4">
          <Link to={`/profile/${listing.owner?._id}`} className="flex items-center justify-between">
          <span>
            <strong>{listing.owner?.name}</strong>
            <span className="ml-2 text-xs text-leaf">
              {listing.owner?.verification?.status === "approved" ? "Verified" : listing.owner?.userType}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm">
            <Star size={14} className="fill-saffron text-saffron" />
            {listing.owner?.rating?.average?.toFixed?.(1) || "0.0"}
          </span>
          </Link>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link to={`/chat?with=${listing.owner?._id}&listing=${listing._id}`} className="rounded-xl border px-3 py-2 text-center text-sm font-semibold">Chat</Link>
            <Link to={`/profile/${listing.owner?._id}`} className="rounded-xl border px-3 py-2 text-center text-sm font-semibold"><UserCircle2 size={14} className="mr-1 inline" />View Profile</Link>
          </div>
        </div>

        {message ? <p className="mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm">{message}</p> : null}

        {listing.type === "sell" ? (
          <div className="mt-5 flex gap-2">
            <input className="min-w-0 flex-1 rounded-md border px-3 py-2" placeholder="Offer price" value={offer} onChange={(event) => setOffer(event.target.value)} />
            <button className="brand-gradient rounded-2xl px-4 py-2 font-bold text-white" onClick={makeOffer} type="button">
              Make offer
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <input className="rounded-md border px-3 py-2" type="date" value={booking.startDate} onChange={(event) => setBooking((b) => ({ ...b, startDate: event.target.value }))} />
            <input className="rounded-md border px-3 py-2" type="date" value={booking.endDate} onChange={(event) => setBooking((b) => ({ ...b, endDate: event.target.value }))} />
            <button className="brand-gradient inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-bold text-white sm:col-span-2" onClick={book} type="button">
              <Calendar size={17} />
              Request booking
            </button>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 font-semibold" to={`/chat?with=${listing.owner?._id}&listing=${listing._id}`}>
            <MessageCircle size={17} />
            Chat
          </Link>
          <button className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 font-semibold" onClick={() => setShareOpen(true)}>
            <Share2 size={17} />
            Share
          </button>
          <button className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 font-semibold" onClick={() => setReportOpen(true)}>
            <Flag size={17} />
            Report
          </button>
          <Link to={`/checkout/${listing._id}`} className={`inline-flex items-center justify-center rounded-md px-4 py-2 font-semibold text-white ${listing.type === "sell" ? "bg-emerald-600" : "bg-violet-600"}`}>
            {listing.type === "sell" ? "Buy Now" : "Book Now"}
          </Link>
        </div>
      </aside>
      </div>
      <section>
        <h2 className="mb-4 text-xl font-black">Similar listings</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {similar.map((item) => (
            <Link key={item._id} to={`/listing/${item._id}`} className="rounded-2xl border border-slate-200 bg-white p-3">
              <img src={item.photos?.[0]?.url} alt={item.title} className="mb-2 aspect-[4/3] w-full rounded-xl object-cover" />
              <p className="line-clamp-1 font-semibold">{item.title}</p>
            </Link>
          ))}
        </div>
      </section>
      {shareOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">Share listing</h3>
              <button type="button" onClick={() => setShareOpen(false)}><X size={16} /></button>
            </div>
            <div className="grid gap-2">
              <button className="rounded-xl border px-3 py-2 text-left font-semibold" onClick={share} type="button">Copy link</button>
              <button className="rounded-xl border px-3 py-2 text-left font-semibold" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Check this out: ${listing.title} ${window.location.href}`)}`, "_blank")} type="button">Share on WhatsApp</button>
            </div>
          </div>
        </div>
      ) : null}
      {reportOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">Report listing</h3>
              <button type="button" onClick={() => setReportOpen(false)}><X size={16} /></button>
            </div>
            <div className="space-y-2">
              {["Fake listing", "Wrong price", "Spam", "Inappropriate content"].map((reason) => (
                <button key={reason} className={`w-full rounded-xl border px-3 py-2 text-left ${reportReason === reason ? "border-violet-600 bg-violet-50" : "border-slate-200"}`} onClick={() => setReportReason(reason)} type="button">{reason}</button>
              ))}
            </div>
            <button className="mt-3 w-full rounded-xl bg-slate-900 px-3 py-2 font-semibold text-white" onClick={report} type="button">Submit report</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
