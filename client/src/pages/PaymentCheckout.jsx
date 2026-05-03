import React, { useEffect, useMemo, useState } from "react";
import { CardElement, Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { MessageCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const hasStripeKey = /^pk_(test|live)_/.test(stripePublishableKey) && !stripePublishableKey.includes("your_");
const stripePromise = hasStripeKey ? loadStripe(stripePublishableKey) : Promise.resolve(null);

export function PaymentCheckout() {
  return <PaymentCheckoutForm />;
}

function PaymentCheckoutForm() {
  const { listingId } = useParams();
  const toast = useToast();
  const [listing, setListing] = useState(null);
  const [tab, setTab] = useState("card");
  const [statusText, setStatusText] = useState("");
  const [cashRequest, setCashRequest] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [upiIntent, setUpiIntent] = useState(null);
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const amount = listing?.type === "rent" ? listing?.rentRates?.daily : listing?.askingPrice;
  const stripeConfigured = Boolean(hasStripeKey && paymentConfig?.stripeConfigured && paymentConfig?.stripePublishableKeyConfigured);

  useEffect(() => {
    if (!listingId) return;
    Promise.all([
      api.get(`/listings/${listingId}`),
      api.get("/payments/config")
    ])
      .then(([listingRes, configRes]) => {
        setListing(listingRes.data.listing);
        setPaymentConfig(configRes.data);
      })
      .catch((err) => toast.error(getErrorMessage(err, "Could not load checkout")));
  }, [listingId, toast]);

  async function createIntent(paymentMethodType) {
    const { data } = await api.post("/payments/create-intent", { listingId, payment_method_type: paymentMethodType });
    return data;
  }

  async function startUpi() {
    if (!stripeConfigured) {
      setStatusText("Payment not configured. Add real Stripe keys in server/.env and client/.env, or use Cash on meetup.");
      return;
    }
    setIsProcessing(true);
    setStatusText("");
    try {
      const data = await createIntent("upi");
      localStorage.setItem("lastTransactionId", data.transactionId);
      setUpiIntent(data);
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
          {!stripeConfigured ? <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Payment not configured. Add real STRIPE_SECRET_KEY in server/.env and VITE_STRIPE_PUBLISHABLE_KEY in client/.env. Cash on meetup is still available.</p> : null}
          <Elements stripe={stripePromise}>
            <CardPayment amount={amount} createIntent={createIntent} stripeConfigured={stripeConfigured} user={user} />
          </Elements>
        </div>
      ) : null}

      {tab === "upi" ? (
        <div className="mt-5 space-y-4">
          {!stripeConfigured ? <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Payment not configured. Add real STRIPE_SECRET_KEY in server/.env and VITE_STRIPE_PUBLISHABLE_KEY in client/.env. Cash on meetup is still available.</p> : null}
          {!upiIntent ? (
            <button className="w-full rounded-2xl bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-50" disabled={!stripeConfigured || isProcessing} onClick={startUpi} type="button">
              {isProcessing ? "Starting..." : "Pay with UPI"}
            </button>
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret: upiIntent.clientSecret }}>
              <UpiPayment user={user} />
            </Elements>
          )}
          {statusText ? <p className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">{statusText}</p> : null}
        </div>
      ) : null}

      {tab === "cash" ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">Request cash meetup from seller. Buyer cannot complete the deal alone; seller must accept first, then both parties confirm handoff.</div>
          <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white disabled:opacity-50" disabled={isProcessing} onClick={requestCashMeetup} type="button">Send Request</button>
          {statusText ? <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">{statusText}</p> : null}
          {cashRequest?.status ? <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold capitalize text-amber-800">Status: {cashRequest.status}</p> : null}
          {cashRequest?.chatRoomId ? <Link className="inline-flex items-center gap-2 font-bold text-indigo-700" to={`/chat/${cashRequest.chatRoomId}`}><MessageCircle size={16} /> Open chat</Link> : null}
        </div>
      ) : null}
    </section>
  );
}

function CardPayment({ amount, createIntent, stripeConfigured, user }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [cardError, setCardError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  async function payCard() {
    if (!stripeConfigured) {
      setCardError("Payment not configured. Add real Stripe keys in server/.env and client/.env, or use Cash on meetup.");
      return;
    }
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setIsProcessing(true);
    setCardError("");
    try {
      const data = await createIntent("card");
      const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card, billing_details: { name: user.name || "Buyer" } }
      });
      if (error) throw new Error(error.message);
      if (["succeeded", "requires_capture"].includes(paymentIntent?.status)) {
        localStorage.setItem("lastTransactionId", data.transactionId);
        navigate("/payment-success");
      }
    } catch (err) {
      setCardError(getErrorMessage(err, err.message || "Card payment failed"));
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-200 p-4"><CardElement onChange={(event) => setCardError(event.error?.message || "")} /></div>
      {cardError ? <p className="text-sm text-red-600">{cardError}</p> : null}
      <button className="w-full rounded-2xl bg-indigo-700 px-4 py-3 font-bold text-white disabled:opacity-50" disabled={!stripeConfigured || !stripe || isProcessing} onClick={payCard} type="button">
        {isProcessing ? "Processing..." : `Pay INR ${Number(amount || 0).toLocaleString()}`}
      </button>
    </>
  );
}

function UpiPayment({ user }) {
  const stripe = useStripe();
  const elements = useElements();
  const [statusText, setStatusText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  async function payUpi() {
    if (!stripe || !elements) return;
    setIsProcessing(true);
    setStatusText("");
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
        payment_method_data: {
          billing_details: { name: user.name || "Buyer" }
        }
      }
    });
    if (error) setStatusText(error.message || "UPI payment failed");
    setIsProcessing(false);
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-200 p-4"><PaymentElement /></div>
      <button className="w-full rounded-2xl bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-50" disabled={!stripe || isProcessing} onClick={payUpi} type="button">
        {isProcessing ? "Redirecting..." : "Pay with UPI"}
      </button>
      {statusText ? <p className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">{statusText}</p> : null}
    </>
  );
}
