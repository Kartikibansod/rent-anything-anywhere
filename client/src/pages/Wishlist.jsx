import React, { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { ListingCard } from "../components/ListingCard.jsx";
import { Loading } from "../components/Loading.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";

export function Wishlist() {
  const toast = useToast();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/listings/wishlist")
      .then(({ data }) => setListings(data.listings ?? []))
      .catch((err) => {
        toast.error(getErrorMessage(err, "Could not load wishlist"));
        setListings([]);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(listing) {
    try {
      await api.post(`/listings/${listing._id}/wishlist`);
      setListings((prev) => prev.filter((l) => l._id !== listing._id));
      toast.success("Removed from wishlist");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update wishlist"));
    }
  }

  return (
    <section>
      <h1 className="mb-2 text-2xl font-black">Wishlist</h1>
      <p className="mb-6 text-sm text-slate-500">
        You'll get notified when saved listings drop in price.
      </p>

      {loading ? <Loading cards={4} /> : null}

      {!loading && listings.length === 0 && (
        <div className="glass flex flex-col items-center gap-3 rounded-[32px] py-16 text-slate-400">
          <Heart size={40} className="text-slate-300" />
          <p className="font-semibold">Your wishlist is empty</p>
          <p className="text-sm">Tap the heart on any listing to save it here.</p>
        </div>
      )}

      {!loading && listings.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing._id} listing={listing} onSave={save} />
          ))}
        </div>
      )}
    </section>
  );
}
