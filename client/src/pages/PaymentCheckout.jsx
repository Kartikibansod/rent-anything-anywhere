import React from "react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";

const stripePublishableKey = (typeof process !== "undefined" ? process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY : "") || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = loadStripe(stripePublishableKey);

export function PaymentCheckout() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentCheckoutForm />
    </Elements>
  );
}

function PaymentCheckoutForm() {
  const { listingId } = useParams();
  const stripe = useStripe();
  const elements = useElements();
  const toast = useToast();
  const [form, setForm] = useState({ listingId: listingId || "", sellerId: "", amount: "", type: "purchase" });
  const [message, setMessage] = useState("");
  const [step, setStep] = useState("summary");
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cashSelected, setCashSelected] = useState(false);
  const [listingData, setListingData] = useState(null);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = currentUser.name || "Customer";
  const userEmail = currentUser.email || "";

  useEffect(() => {
    if (!listingId) return;
    api.get(`/listings/${listingId}`).then(({ data }) => {
      setListingData(data.listing);
      setForm((current) => ({
        ...current,
        listingId,
        sellerId: data.listing.owner?._id,
        amount: data.listing.type === "rent" ? (data.listing.rentRates?.daily || 0) : data.listing.askingPrice || 0,
        type: data.listing.type === "rent" ? "rental" : "purchase"
      }));
    }).catch(() => {});
  }, [listingId]);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function payOnline() {
    if (!stripe || !elements) {
      setMessage("Payment form is still loading. Please try again.");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setMessage("Card input not ready. Please try again.");
      return;
    }

    setIsProcessing(true);
    try {
      const { data } = await api.post("/create-payment-intent", {
        listingId: form.listingId,
        amount: form.amount,
        currency: "inr",
        type: form.type
      });

      const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: userName,
            email: userEmail
          }
        }
      });

      if (error) {
        throw new Error(error.message || "Payment failed");
      }

      if (paymentIntent?.status === "succeeded") {
        setMessage("Payment verified successfully.");
        toast.success("Payment verified");
        setSuccess(true);
        setStep("confirm");
      } else {
        setMessage("Payment submitted. Waiting for final confirmation.");
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setMessage(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function cash() {
    try {
      const { data } = await api.post("/payments/cash-confirm", { transactionId: form.transactionId });
      setMessage(`Cash meetup transaction updated: ${data.transaction._id}.`);
      toast.success("Cash meetup transaction created");
      setCashSelected(true);
      setStep("confirm");
    } catch (err) {
      const message = getErrorMessage(err);
      setMessage(message);
      toast.error(message);
    }
  }

  return (
    <section className="glass mx-auto max-w-xl rounded-[36px] p-6">
      <h1 className="text-2xl font-semibold">Payment checkout</h1>
      <div className="my-5 grid grid-cols-3 gap-2">
        {["summary", "method", "confirm"].map((item) => (
          <button className={`rounded-full px-3 py-2 text-xs font-bold ${step === item ? "brand-gradient text-white" : "bg-white/70 text-slate-500"}`} key={item} onClick={() => setStep(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {step === "summary" ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">Listing</p>
              <p className="font-bold">{listingData?.title || "Listing"}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">Seller</p>
              <p>{listingData?.owner?.name || "Seller"}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">Buyer</p>
              <p>{userName}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">Transaction type</p>
              <p>{form.type === "rental" ? "Rental" : "Sale"}</p>
            </div>
            <input className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3" name="amount" placeholder="amount" value={form.amount} onChange={update} />
            <select className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3" name="type" value={form.type} onChange={update}>
              <option value="purchase">Sale</option>
              <option value="rental">Rental</option>
            </select>
            <button className="brand-gradient w-full rounded-2xl px-4 py-3 font-bold text-white" onClick={() => setStep("method")}>Continue</button>
          </>
        ) : null}
        {step === "method" ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: "16px",
                      color: "#1a1a1a",
                      "::placeholder": {
                        color: "#9ca3af"
                      }
                    },
                    invalid: {
                      color: "#dc2626"
                    }
                  }
                }}
              />
            </div>
            <button className="brand-gradient w-full rounded-2xl px-4 py-3 font-bold text-white disabled:opacity-70" onClick={payOnline} disabled={isProcessing || !stripe}>
              {isProcessing ? "Processing..." : "Pay with card"}
            </button>
            <button className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 font-bold" onClick={cash}>Cash on meetup</button>
          </>
        ) : null}
        {step === "confirm" ? (
          <div className="rounded-[24px] bg-white/70 p-6 text-center text-slate-600">
            {success ? <p className="text-lg font-bold text-emerald-700">Payment successful. Order confirmed.</p> : null}
            {cashSelected ? <p className="text-sm">Cash meetup selected. Meet at a safe public place and confirm handoff in app.</p> : null}
            {!success && !cashSelected ? <p>Confirmation details will appear after payment or meetup confirmation.</p> : null}
          </div>
        ) : null}
      </div>
      {message ? <p className="mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm">{message}</p> : null}
    </section>
  );
}
