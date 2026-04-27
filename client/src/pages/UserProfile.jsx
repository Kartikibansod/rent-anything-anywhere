import React, { useEffect, useState } from "react";
import { ShieldCheck, Star, Flag, Phone } from "lucide-react";
import { useParams } from "react-router-dom";
import { ErrorMessage } from "../components/ErrorMessage.jsx";
import { ListingCard } from "../components/ListingCard.jsx";
import { Loading } from "../components/Loading.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getSellerReviews, submitReport } from "../lib/api.js";
import { getInitials, postedAgo, roleLabel } from "../lib/display.js";
import { useUser } from "../lib/userContext.jsx";

export function UserProfile() {
  const { id } = useParams();
  const { user: currentUser } = useUser();
  const toast = useToast();
  const [profileUser, setProfileUser] = useState(null);
  const [activeListings, setActiveListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userId = id || currentUser?._id;
        if (!userId) return;
        const profile = await api.get(`/auth/users/${userId}`);
        setProfileUser(profile.data.user);
        setActiveListings(profile.data.activeListings || []);
        const reviewsData = await getSellerReviews(userId, 1, 5);
        setReviews(reviewsData.data?.reviews || []);
      } catch (err) {
        setError(err.message || "Could not load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, currentUser]);

  async function reportUser() {
    try {
      await submitReport({ type: "user", reported: profileUser._id, reason: "Fake listing" });
      toast.success("User reported");
    } catch (err) {
      toast.error(err.message || "Could not report user");
    }
  }

  async function sendPhoneOtp() {
    try {
      await api.post("/auth/phone/send-otp");
      toast.success("Phone OTP sent");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send phone OTP");
    }
  }

  if (loading) return <Loading label="Loading profile..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!profileUser) return <ErrorMessage message="User not found" />;

  return (
    <div className="space-y-6">
      <section className="glass rounded-[32px] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-violet-100 text-2xl font-black text-violet-700">
            {profileUser.avatar ? <img src={profileUser.avatar} className="h-20 w-20 rounded-full object-cover" alt={profileUser.name} /> : getInitials(profileUser.name)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black">{profileUser.name}</h1>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">{roleLabel(profileUser)}</span>
              {profileUser?.verification?.status === "approved" ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700"><ShieldCheck size={14} />Verified</span> : null}
              {profileUser?.isPhoneVerified ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700"><Phone size={14} />Phone verified</span> : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" /> {(profileUser?.rating?.average || 0).toFixed(1)}</span>
              <span>{profileUser?.rating?.count || reviews.length} reviews</span>
              <span>Member since {postedAgo(profileUser.createdAt)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold" onClick={reportUser} type="button"><Flag size={14} />Report user</button>
            {currentUser?._id === profileUser._id && !profileUser?.isPhoneVerified ? <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold" onClick={sendPhoneOtp} type="button"><Phone size={14} />Verify phone</button> : null}
          </div>
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-xl font-black">Active listings</h2>
        {activeListings.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeListings.map((listing) => <ListingCard key={listing._id} listing={listing} />)}
          </div>
        ) : <div className="glass rounded-2xl p-5 text-sm text-slate-600">No active listings right now.</div>}
      </section>
      <section className="glass rounded-[32px] p-6">
        <h2 className="mb-4 text-xl font-black">Reviews</h2>
        {reviews.length ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <article key={review._id} className="rounded-2xl bg-white p-4">
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-semibold">{review.reviewer?.name || "Anonymous"}</p>
                  <span className="inline-flex items-center gap-1 text-sm"><Star size={13} className="fill-amber-400 text-amber-400" />{review.rating}</span>
                </div>
                <p className="text-sm text-slate-600">{review.comment || review.reviewText || "No comment provided."}</p>
              </article>
            ))}
          </div>
        ) : <p className="text-sm text-slate-600">No reviews yet.</p>}
      </section>
    </div>
  );
}