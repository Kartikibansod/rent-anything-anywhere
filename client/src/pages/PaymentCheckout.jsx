import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = loadStripe(stripePublishableKey);

export function PaymentCheckout() {
  return <Elements stripe={stripePromise}><PaymentCheckoutForm /></Elements>;
}

function PaymentCheckoutForm() {
  const { listingId } = useParams();
  const stripe = useStripe();
  const elements = useElements();
  const toast = useToast();
  const [form, setForm] = useState({ listingId: listingId || "", amount: "", type: "purchase" });
  const [step, setStep] = useState("summary");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [result, setResult] = useState(null);
  const [listingData, setListingData] = useState(null);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const canPay = useMemo(() => Boolean(currentUser?.isEmailVerified && currentUser?.profileCompleted && (currentUser.userType !== "student" || currentUser?.verification?.status === "approved")), [currentUser]);

  useEffect(() => {
    if (!listingId) return;
    api.get(`/listings/${listingId}`).then(({ data }) => {
      setListingData(data.listing);
      setForm((current) => ({ ...current, listingId, amount: data.listing.type === "rent" ? (data.listing.rentRates?.daily || 0) : data.listing.askingPrice || 0, type: data.listing.type === "rent" ? "rental" : "purchase" }));
    }).catch(() => {});
  }, [listingId]);

  async function payOnline() {
    if (!canPay) return;
    if (!stripe || !elements) return;
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;
    setIsProcessing(true);
    try {
      const { data } = await api.post("/payments/create-intent", { listingId: form.listingId, amount: form.amount, currency: "inr", paymentMethod });
      const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, { payment_method: { card: cardElement } });
      if (error) throw new Error(error.message || "Payment failed");
      if (paymentIntent?.status === "succeeded") {
        setResult({ status: "success", message: "Payment successful" });
        setStep("confirm");
      }
    } catch (err) {
      setResult({ status: "failed", message: getErrorMessage(err) });
      setStep("confirm");
      toast.error(getErrorMessage(err));
    } finally { setIsProcessing(false); }
  }

  return (
    <section className="glass mx-auto max-w-xl rounded-[36px] p-6">
      <h1 className="text-2xl font-semibold">Payment checkout</h1>
      {!canPay ? <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">Verify your account to buy. Complete email OTP, profile name/location, and student ID verification.</div> : null}
      <div className="my-5 grid grid-cols-3 gap-2">{["summary", "method", "confirm"].map((item) => <button className={`rounded-full px-3 py-2 text-xs font-bold ${step === item ? "brand-gradient text-white" : "bg-white/70 text-slate-500"}`} key={item} onClick={() => setStep(item)}>{item}</button>)}</div>
      <div className="mt-5 space-y-3">
        {step === "summary" ? <><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="font-bold">{listingData?.title || "Listing"}</p><p className="text-sm text-slate-500">{form.type === "rental" ? "Rental" : "Sale"}</p></div><input className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3" name="amount" value={form.amount} onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))} /><button className="brand-gradient w-full rounded-2xl px-4 py-3 font-bold text-white" onClick={() => setStep("method")}>Continue</button></> : null}
        {step === "method" ? <><select className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="upi">UPI + Card</option><option value="card">Card</option><option value="netbanking">Net banking</option><option value="wallet">Wallets</option></select><div className="rounded-2xl border border-slate-200 bg-white p-4"><CardElement /></div><button className="brand-gradient w-full rounded-2xl px-4 py-3 font-bold text-white disabled:opacity-70" onClick={payOnline} disabled={isProcessing || !stripe || !canPay}>{isProcessing ? "Processing..." : "Pay now"}</button><p className="text-xs text-slate-500">Cash on meetup is still supported and requires both buyer + seller confirmation in app.</p></> : null}
        {step === "confirm" ? <div className={`rounded-[24px] p-6 text-center ${result?.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{result?.status === "success" ? "Payment success" : "Payment failed"}<p className="mt-2 text-sm">{result?.message || "Confirmation details will appear here."}</p></div> : null}
      </div>
    </section>
  );
}
