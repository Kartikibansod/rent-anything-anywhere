import React, { useEffect, useMemo, useState } from "react";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { MessageCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const hasStripeKey = /^pk_(test|live)_/.test(stripePublishableKey) && !stripePublishableKey.includes("your_");
const stripePromise = hasStripeKey ? loadStripe(stripePublishableKey) : Promise.resolve(null);

export function PaymentCheckout() {
  return <Elements stripe={stripePromise}><PaymentCheckoutForm /></Elements>;
}

function PaymentCheckoutForm() {
  const { listingId } = useParams();
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const toast = useToast();
  const [listing, setListing] = useState(null);
  const [tab, setTab] = useState("card");
  const [cardError, setCardError] = useState("");
  const [upiId, setUpiId] = useState("");
  const [statusText, setStatusText] = useState("");
  const [cashRequest, setCashRequest] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const amount = listing?.type === "rent" ? listing?.rentRates?.daily : listing?.askingPrice;

  useEffect(() => {
    if (!listingId) return;
    api.get(`/listings/${listingId}`)
      .then(({ data }) => setListing(data.listing))
      .catch((err) => toast.error(getErrorMessage(err, "Could not load listing")));
  }, [listingId, toast]);

  async function createIntent() {
    const { data } = await api.post("/payments/create-intent", { listingId });
    return data;
  }

  async function pollStatus(transactionId) {
    setSecondsLeft(300);
    const startedAt = Date.now();
    const timer = setInterval(async () => {
      const remaining = Math.max(0, 300 - Math.floor((Date.now() - startedAt) / 1000));
      setSecondsLeft(remaining);
      try {
        const { data } = await api.get(`/payments/status/${transactionId}`);
        if (["held", "paid", "completed", "released"].includes(data.transaction?.status)) {
          clearInterval(timer);
          localStorage.setItem("lastTransactionId", transactionId);
          navigate("/payment-success");
        }
        if (data.transaction?.status === "failed") {
          clearInterval(timer);
          setStatusText("Payment failed. Try again.");
        }
      } catch {
        clearInterval(timer);
        setStatusText("Could not check payment status.");
      }
      if (remaining <= 0) {
        clearInterval(timer);
        setStatusText("Payment not completed. Try again");
      }
    }, 3000);
  }

  async function payCard() {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setIsProcessing(true);
    setCardError("");
    try {
      const data = await createIntent();
      const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card, billing_details: { name: user.name || "Buyer" } }
      });
      if (error) throw new Error(error.message);
      if (["succeeded", "requires_capture"].includes(paymentIntent?.status)) {
        localStorage.setItem("lastTransactionId", data.transactionId);
        navigate("/payment-success");
      }
      else setStatusText("Payment is processing. We will update your deal shortly.");
    } catch (err) {
      setCardError(getErrorMessage(err, err.message || "Card payment failed"));
    } finally {
      setIsProcessing(false);
    }
  }

  async function payUpi() {
    if (!stripe) return;
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(upiId)) {
      setStatusText("Enter valid UPI ID (e.g. name@paytm)");
      return;
    }
    setIsProcessing(true);
    setStatusText("");
    try {
      const data = await createIntent();
      const { error, paymentIntent } = await stripe.confirmUpiPayment(data.clientSecret, {
        payment_method: {
          upi: { vpa: upiId },
          billing_details: { name: user.name || "Buyer" }
        },
        return_url: "http://localhost:5173/payment-success"
      });
      if (error) throw new Error(error.message);
      setStatusText("Redirecting to your UPI app...");
      if (["succeeded", "requires_capture"].includes(paymentIntent?.status)) {
        localStorage.setItem("lastTransactionId", data.transactionId);
        navigate("/payment-success");
      }
      else pollStatus(data.transactionId);
    } catch (err) {
      setStatusText(getErrorMessage(err, err.message || "UPI payment failed"));
    } finally {
      setIsProcessing(false);
    }
  }

  async function requestCashMeetup() {
    setIsProcessing(true);
    try {
      const { data } = await api.post("/payments/cash", { listingId });
      setCashRequest(data.request);
      setStatusText(data.message || "Request sent! Waiting for seller to accept");
    } catch (err) {
      setStatusText(getErrorMessage(err, "Could not request cash meetup"));
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl rounded-[32px] bg-white p-6 shadow-xl">
      <h1 className="text-2xl font-black">Checkout</h1>
      <div className="mt-5 rounded-2xl border border-slate-200 p-4">
        <p className="font-bold">{listing?.title || "Listing"}</p>
        <p className="text-sm text-slate-500">{listing?.type === "rent" ? "Rental" : "Sale"}</p>
        <p className="mt-2 text-3xl font-black">INR {Number(amount || 0).toLocaleString()}{listing?.type === "rent" ? "/day" : ""}</p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {["card", "upi", "cash"].map((item) => (
          <button className={`rounded-full px-4 py-2 text-sm font-bold ${tab === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`} key={item} onClick={() => { setTab(item); setStatusText(""); }} type="button">
            {item === "card" ? "Card" : item === "upi" ? "UPI" : "Cash on meetup"}
          </button>
        ))}
      </div>

      {tab === "card" ? (
        <div className="mt-5 space-y-4">
          {!hasStripeKey ? <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Stripe publishable key is not configured in client/.env.</p> : null}
          <div className="rounded-2xl border border-slate-200 p-4"><CardElement onChange={(event) => setCardError(event.error?.message || "")} /></div>
          {cardError ? <p className="text-sm text-red-600">{cardError}</p> : null}
          <button className="w-full rounded-2xl bg-indigo-700 px-4 py-3 font-bold text-white disabled:opacity-50" disabled={!stripe || isProcessing} onClick={payCard} type="button">
            {isProcessing ? "Processing..." : `Pay INR ${Number(amount || 0).toLocaleString()}`}
          </button>
        </div>
      ) : null}

      {tab === "upi" ? (
        <div className="mt-5 space-y-4">
          <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="yourname@paytm" value={upiId} onChange={(event) => setUpiId(event.target.value)} />
          <button className="w-full rounded-2xl bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-50" disabled={!stripe || isProcessing} onClick={payUpi} type="button">
            {isProcessing ? "Starting..." : "Pay with UPI"}
          </button>
          {statusText ? <p className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">{statusText} {secondsLeft < 300 && secondsLeft > 0 ? `(${secondsLeft}s left)` : ""}</p> : null}
        </div>
      ) : null}

      {tab === "cash" ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">Request cash meetup from seller. Buyer cannot complete the deal alone; seller must accept first, then both parties confirm handoff.</div>
          <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white disabled:opacity-50" disabled={isProcessing} onClick={requestCashMeetup} type="button">Send Request</button>
          {statusText ? <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">{statusText}</p> : null}
          {cashRequest?.chatRoomId ? <Link className="inline-flex items-center gap-2 font-bold text-indigo-700" to={`/chat/${cashRequest.chatRoomId}`}><MessageCircle size={16} /> Open chat</Link> : null}
        </div>
      ) : null}
    </section>
  );
}
