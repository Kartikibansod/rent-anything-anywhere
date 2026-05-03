import React from "react";
import { CheckCircle2, Heart, MapPin, MessageCircle, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { getListingFallbackImage } from "../lib/display.js";

export function ListingCard({ listing, onSave }) {
  const photo = listing.photos?.[0]?.url || getListingFallbackImage(listing.category);
  const listingTypeLabel = listing.type === "sell" ? "For Sale" : "For Rent";
  const price =
    listing.type === "rent"
      ? `INR ${listing.rentRates?.daily || listing.rentRates?.weekly || listing.rentRates?.monthly || 0}/day`
      : `INR ${listing.askingPrice || 0}`;
  const shortDescription = listing.description && listing.description.length > 80
    ? `${listing.description.slice(0, 80)}...`
    : listing.description;

  return (
    <Link to={`/listings/${listing._id}`} className="block">
      <motion.article
        className="group overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition hover:shadow-[0_16px_34px_rgba(0,0,0,0.14)]"
        whileHover={{ y: -6, scale: 1.01 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        layout
      >
        <div className="relative aspect-[4/3.4] overflow-hidden rounded-t-2xl bg-slate-100">
          <img
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            src={photo}
            alt={listing.title}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src = getListingFallbackImage(listing.category);
            }}
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-violet-50/95 px-3 py-1 text-xs font-bold text-violet-700 backdrop-blur">{listing.category}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold backdrop-blur ${listing.type === "sell" ? "bg-emerald-50/95 text-emerald-700" : "bg-blue-50/95 text-blue-700"}`}>{listingTypeLabel}</span>
            {listing.moderation?.state === "under_review" ? <span className="rounded-full bg-amber-500/90 px-3 py-1 text-xs font-bold text-white">Under review</span> : null}
          </div>
          <motion.button
            className="absolute right-3 top-3 rounded-full bg-white/95 p-2 text-slate-500 shadow-sm hover:text-pink-600"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onSave?.(listing);
            }}
            aria-label="Save listing"
            whileTap={{ scale: 0.82 }}
            whileHover={{ scale: 1.08 }}
          >
            <Heart size={17} />
          </motion.button>
        </div>
      <div className="p-4">
        <div className="line-clamp-1 text-base font-semibold text-slate-900 hover:text-leaf">
          {listing.title}
        </div>
        <p className="mt-1 text-base font-bold text-[#7c3aed]">{price}</p>
        {shortDescription ? <p className="mt-2 line-clamp-2 text-sm text-slate-500">{shortDescription}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">{listing.condition}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin size={13} />
            {listing.location?.address || "Nearby"}
          </span>
          {listing.owner?.collegeName ? <span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">From your campus</span> : null}
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
          <span className="inline-flex items-center gap-1">
            {listing.owner?.name || "Seller"}
            {listing.owner?.isVerified ? <CheckCircle2 size={14} className="text-blue-600" /> : null}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star size={14} className="fill-saffron text-saffron" />
            {listing.owner?.rating?.average?.toFixed?.(1) || "0.0"}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-medium text-slate-500">
            {listing.distanceKm != null ? `${listing.distanceKm} km away` : "Listed recently"}
          </span>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
              to={`/chat?with=${listing.owner?._id}&listing=${listing._id}`}
              onClick={(event) => event.stopPropagation()}
            >
              <MessageCircle size={14} />
              Chat
            </Link>
            <Link
              className="brand-gradient inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold text-white"
              to={`/listings/${listing._id}`}
              onClick={(event) => event.stopPropagation()}
            >
              {listing.type === "rent" ? "Rent" : "Buy"}
            </Link>
          </div>
        </div>
      </div>
      </motion.article>
    </Link>
  );
}
