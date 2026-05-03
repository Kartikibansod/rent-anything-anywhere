import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyBookings, createReview, checkReviewEligibility } from "../lib/api";
import { api, getErrorMessage } from "../lib/api";
import { useUser } from "../lib/userContext";
import { getImageUrl } from "../lib/listingImage";
import { StarIcon } from "@heroicons/react/20/solid";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";

export const MyDeals = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [cashMeetups, setCashMeetups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewModal, setReviewModal] = useState({ open: false, transaction: null, listing: null });
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const data = await getMyBookings();
        const meetupResponse = await api.get("/cash-meetups/my");
        setBookings(data);
        setCashMeetups(meetupResponse.data.requests || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const openReviewModal = async (booking) => {
    try {
      // Check eligibility
      const eligibility = await checkReviewEligibility(booking.transactionId || booking._id);
      if (!eligibility.data.eligible) {
        if (eligibility.data.alreadyReviewed) {
          alert("You have already reviewed this transaction");
        } else {
          alert("This transaction is not eligible for review");
        }
        return;
      }

      setReviewModal({
        open: true,
        transaction: booking.transactionId || booking._id,
        listing: booking.listingId
      });
      setRating(5);
      setReviewText("");
    } catch (err) {
      console.error("Error checking eligibility:", err);
      alert("Failed to check review eligibility");
    }
  };

  const updateCashMeetup = async (requestId, action) => {
    try {
      if (action === "accept" || action === "reject") {
        await api.patch(`/cash-meetups/${requestId}/status`, { action });
      } else {
        await api.patch(`/cash-meetups/${requestId}/confirm`);
      }
      const meetupResponse = await api.get("/cash-meetups/my");
      setCashMeetups(meetupResponse.data.requests || []);
    } catch (err) {
      alert(getErrorMessage(err, "Could not update cash meetup"));
    }
  };

  const submitReview = async () => {
    if (!reviewModal.transaction || !reviewModal.listing) return;

    setSubmitting(true);
    try {
      await createReview({
        rating,
        reviewText,
        listingId: reviewModal.listing._id,
        sellerId: reviewModal.listing.ownerId,
        transactionId: reviewModal.transaction
      });

      setReviewModal({ open: false, transaction: null, listing: null });
      // Refresh bookings to update status
      const data = await getMyBookings();
      setBookings(data);
    } catch (err) {
      console.error("Error creating review:", err);
      alert(err.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800"
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusStyles[status] || statusStyles.pending}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Deals</h1>

      {cashMeetups.length > 0 ? (
        <div className="mb-8 space-y-4">
          <h2 className="text-xl font-bold">Cash meetup requests</h2>
          {cashMeetups.map((request) => {
            const isSeller = request.seller?._id === user?._id;
            const isBuyer = request.buyer?._id === user?._id;
            return (
              <div className="rounded-xl bg-white p-5 shadow-md" key={request._id}>
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <p className="font-semibold">{request.listing?.title}</p>
                    <p className="text-sm text-gray-500">
                      Buyer: {request.buyer?.name} · Seller: {request.seller?.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Item: {request.listing?.title} · Price: INR {Number(request.listing?.askingPrice || request.listing?.rentRates?.daily || 0).toLocaleString()} · Requested: {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-sm font-semibold capitalize text-blue-700">{request.status}</p>
                    {isBuyer && request.status === "pending" ? <p className="mt-1 text-sm text-gray-500">Request sent! Waiting for seller to accept.</p> : null}
                    {request.status === "accepted" ? <p className="mt-1 text-sm text-gray-500">Meet up and exchange item. Both parties must confirm handoff.</p> : null}
                    {isBuyer && request.status === "accepted" ? <p className="mt-1 text-sm font-semibold text-emerald-700">Seller accepted! You can now chat to arrange meetup.</p> : null}
                    {isBuyer && request.status === "rejected" ? <p className="mt-1 text-sm font-semibold text-red-700">Request declined. Choose another payment method.</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isSeller && request.status === "pending" ? (
                      <>
                        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => updateCashMeetup(request._id, "accept")}>Accept</button>
                        <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => updateCashMeetup(request._id, "reject")}>Decline</button>
                      </>
                    ) : null}
                    {request.status === "accepted" && (isBuyer || isSeller) ? (
                      <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => updateCashMeetup(request._id, "confirm")}>
                        {isBuyer ? "I received the item" : "I received the cash"}
                      </button>
                    ) : null}
                    {request.chatRoomId ? <button className="rounded-lg border px-4 py-2 text-sm font-semibold" onClick={() => navigate(`/chat?with=${isBuyer ? request.seller?._id : request.buyer?._id}&listing=${request.listing?._id}`)}>Open chat</button> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No deals yet</p>
          <button
            onClick={() => navigate("/browse")}
            className="mt-4 text-blue-500 hover:text-blue-700 font-medium"
          >
            Start exploring listings
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking._id}
              className="bg-white rounded-xl shadow-md p-6 flex items-center gap-6"
            >
              <img
                src={getImageUrl(booking.listingId?.images?.[0])}
                alt={booking.listingId?.title}
                className="w-24 h-24 rounded-lg object-cover"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {booking.listingId?.title}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {booking.listingId?.category}
                    </p>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>
                    {booking.rentalStartDate &&
                      new Date(booking.rentalStartDate).toLocaleDateString()}
                    {booking.rentalEndDate &&
                      ` - ${new Date(booking.rentalEndDate).toLocaleDateString()}`}
                  </span>
                  <span className="font-bold text-blue-600">
                    ₹{booking.totalPrice}
                  </span>
                </div>
                {booking.status === "completed" && (
                  <button
                    onClick={() => openReviewModal(booking)}
                    className="mt-3 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 transition-colors"
                  >
                    Write a Review
                  </button>
                )}
              </div>
              <button
                onClick={() => navigate(`/listing/${booking.listingId?._id}`)}
                className="text-blue-500 hover:text-blue-700 font-medium"
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Write a Review</h2>

            {reviewModal.listing && (
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <img
                  src={getImageUrl(reviewModal.listing.images?.[0])}
                  alt={reviewModal.listing.title}
                  className="w-16 h-16 rounded object-cover"
                />
                <div>
                  <p className="font-semibold">{reviewModal.listing.title}</p>
                  <p className="text-sm text-gray-600">
                    Seller: {reviewModal.listing.owner?.name}
                  </p>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <StarIcon
                      className={`w-8 h-8 ${
                        star <= rating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                      } hover:text-yellow-500`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Review (optional)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="4"
                placeholder="Share your experience with this seller..."
                maxLength={500}
              />
              <p className="text-sm text-gray-500 mt-1">
                {reviewText.length}/500 characters
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setReviewModal({ open: false, transaction: null, listing: null })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDeals;
