import React from "react";
import { Camera, Check, LocateFixed, MapPin, Sparkles, Package, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { ErrorMessage } from "../components/ErrorMessage.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";

const categories = ["Books", "Electronics", "Furniture", "Clothes", "Cycles", "Kitchenware", "Sports gear"];
const steps = ["Type", "Details", "Photos", "Pricing", "Location", "Review"];
const ageOptions = ["Brand new", "Less than 3 months", "3-6 months", "6 months - 1 year", "1-2 years", "2-3 years", "3+ years"];

export function CreateListing() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [type, setType] = useState("sell");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "Books",
    condition: "used",
    conditionDescription: "",
    itemAge: "Brand new",
    askingPrice: "",
    daily: "",
    weekly: "",
    monthly: "",
    damageDeposit: "",
    description: "",
    address: "Campus area",
    lat: "16.7050",
    lng: "74.2433"
  });
  const [photos, setPhotos] = useState([]);
  const [estimate, setEstimate] = useState(null);
  const [aiCondition, setAiCondition] = useState(null);
  const [grokConfigured, setGrokConfigured] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    api.get("/ai/config")
      .then(({ data }) => setGrokConfigured(Boolean(data.grokConfigured)))
      .catch(() => setGrokConfigured(false));
  }, []);

  const previews = useMemo(() => photos.map((file) => ({ file, url: URL.createObjectURL(file) })), [photos]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    maxFiles: 5,
    multiple: true,
    onDrop(files) {
      setPhotos((current) => [...current, ...files].slice(0, 5));
    }
  });

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function estimatePrice() {
    setIsEstimating(true);
    try {
      const { data } = await api.post("/ai/estimate-price", {
        title: form.title,
        category: form.category,
        condition: form.condition,
        itemAge: form.itemAge,
        description: form.description
      });
      setEstimate(data);
      toast.success("Price estimate ready");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not estimate price"));
    } finally {
      setIsEstimating(false);
    }
  }

  async function reverseGeocode(lat, lng) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      return data.display_name || `${lat}, ${lng}`;
    } catch {
      return `${lat}, ${lng}`;
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        const address = await reverseGeocode(lat, lng);
        setForm((current) => ({ ...current, lat, lng, address }));
        setIsLocating(false);
        toast.success("Location added");
      },
      () => {
        setIsLocating(false);
        toast.error("Could not get your location");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function scoreMyItem() {
    if (!photos[0]) {
      toast.error("Upload at least one photo first");
      return;
    }
    const body = new FormData();
    body.append("photo", photos[0]);
    try {
      const { data } = await api.post("/listings/score-condition", body);
      setAiCondition(data);
      setForm((current) => ({ ...current, condition: data.condition }));
      toast.success("Condition scored by AI");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not score condition"));
    }
  }

  async function submit() {
    setError("");
    setIsSubmitting(true);
    const body = new FormData();
    body.append("type", type);
    body.append("title", form.title);
    body.append("category", form.category);
    body.append("condition", form.condition);
    body.append("conditionDescription", form.conditionDescription);
    body.append("itemAge", form.itemAge);
    body.append("description", form.description);
    if (aiCondition?.score) body.append("conditionScore", String(aiCondition.score));
    if (aiCondition?.reasoning) body.append("conditionAiReasoning", aiCondition.reasoning);
    body.append("location", JSON.stringify({ type: "Point", coordinates: [Number(form.lng), Number(form.lat)], address: form.address }));
    photos.forEach((photo) => body.append("photos", photo));
    if (type === "sell") body.append("askingPrice", form.askingPrice);
    if (type === "rent") {
      body.append("rentRates", JSON.stringify({ daily: Number(form.daily), weekly: Number(form.weekly), monthly: Number(form.monthly) }));
      body.append("damageDeposit", form.damageDeposit || 0);
      body.append("availability", JSON.stringify([]));
    }
    if (estimate) body.append("aiPriceEstimate", JSON.stringify(estimate));

    try {
      const { data } = await api.post("/listings", body);
      toast.success("Listing published");
      navigate(`/listings/${data.listing._id}`);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-6">
        <p className="font-bold text-indigo-700">Create listing</p>
        <h1 className="mt-2 text-4xl font-black">Post something people nearby will love.</h1>
      </div>

      <div className="glass mb-6 rounded-full p-2">
        <div className="grid grid-cols-6 gap-2">
          {steps.map((label, index) => (
            <button
              className={`rounded-full px-3 py-2 text-xs font-bold transition ${index <= step ? "brand-gradient text-white" : "text-slate-500 hover:bg-white/70"}`}
              key={label}
              onClick={() => setStep(index)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <motion.div className="glass rounded-[36px] p-6" key={step} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <ErrorMessage message={error} />
        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["sell", "Sell (Buy)", "Set a one-time price for buyers.", Tag],
              ["rent", "Rent an item", "Add rates, deposit, and availability.", Package]
            ].map(([value, title, body, Icon]) => (
              <motion.button
                className={`rounded-[28px] border p-6 text-left ${type === value ? "border-indigo-400 bg-indigo-50" : "border-white bg-white/70"}`}
                key={value}
                onClick={() => setType(value)}
                whileHover={{ y: -6 }}
              >
                <Icon className="mb-5 text-indigo-600" />
                <h2 className="text-xl font-black">{title}</h2>
                <p className="mt-2 text-sm text-slate-600">{body}</p>
              </motion.button>
            ))}
            {estimate ? <div className="rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-900 sm:col-span-2">Estimated sell: INR {estimate.sellPrice?.recommended || estimate.sellPrice || "-"}, rent/day: INR {estimate.rentPerDay?.recommended || estimate.rentPerDay || "-"}. Confidence: {estimate.confidence || "medium"}. {estimate.marketAnalysis || estimate.pricingReasoning || estimate.reasoning} {estimate.actualCondition ? <span className="font-bold">Actual condition: {estimate.actualCondition}</span> : null}</div> : null}
            {aiCondition ? <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 sm:col-span-2">Condition score: {aiCondition.score}/10. {aiCondition.reasoning}</div> : null}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input className="sm:col-span-2" name="title" placeholder="Title" value={form.title} onChange={update} />
            <Select name="category" value={form.category} onChange={update} options={categories} />
            <div className="space-y-2">
              <Select name="condition" value={form.condition} onChange={update} options={["new", "like_new", "used", "poor"]} />
            </div>
            <Select name="itemAge" value={form.itemAge} onChange={update} options={ageOptions} />
            <Input name="conditionDescription" placeholder="Describe the condition in detail — scratches, dents, working condition etc." value={form.conditionDescription} onChange={update} />
            <div className="sm:col-span-2">
              <textarea className="min-h-36 w-full rounded-[22px] border border-slate-200 bg-white/80 px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-100" name="description" minLength={20} maxLength={500} placeholder="Describe your item — mention any defects, accessories included, reason for selling, etc." value={form.description} onChange={update} />
              <p className="mt-1 text-right text-xs font-semibold text-slate-500">{500 - form.description.length} characters remaining</p>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <div {...getRootProps()} className={`grid min-h-64 cursor-pointer place-items-center rounded-[32px] border-2 border-dashed p-8 text-center transition ${isDragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-white/60"}`}>
              <input {...getInputProps()} />
              <div>
                <Camera className="mx-auto mb-4 text-indigo-600" size={36} />
                <p className="font-black">Drag photos here or click to upload</p>
                <p className="mt-2 text-sm text-slate-500">Up to 5 images. Uploaded to Cloudinary on submit.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {previews.map(({ file, url }) => <img className="aspect-square rounded-3xl object-cover" key={file.name} src={url} alt={file.name} />)}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {grokConfigured ? <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-60 sm:col-span-2" onClick={estimatePrice} disabled={isEstimating}><Sparkles size={16} />{isEstimating ? "Estimating price..." : "AI Estimate Price"}</button> : <button type="button" className="cursor-not-allowed rounded-xl border px-3 py-2 text-sm font-semibold text-slate-400 sm:col-span-2" disabled title="GROK_API_KEY is not configured"><Sparkles size={16} className="inline" /> AI Estimator (API key required)</button>}
            {estimate ? (
              <div className="rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-900 sm:col-span-2">
                <p className="font-bold">AI estimate</p>
                <p>Sell: INR {estimate.sellPrice?.recommended || estimate.sellPrice || "-"} · Rent/day: INR {estimate.rentPerDay?.recommended || estimate.rentPerDay || "-"} · Confidence: {estimate.confidence || "medium"}</p>
                <p className="mt-1">{estimate.reasoning || estimate.marketAnalysis || estimate.pricingReasoning}</p>
                {estimate.actualCondition ? <p className="mt-1 font-bold text-amber-700">Actual condition: {estimate.actualCondition}</p> : null}
                <button
                  className="mt-3 rounded-xl bg-indigo-700 px-3 py-2 text-xs font-bold text-white"
                  type="button"
                  onClick={() => setForm((current) => ({
                    ...current,
                    askingPrice: type === "sell" && (estimate.sellPrice?.recommended || estimate.sellPrice) ? String(estimate.sellPrice?.recommended || estimate.sellPrice) : current.askingPrice,
                    daily: type === "rent" && (estimate.rentPerDay?.recommended || estimate.rentPerDay) ? String(estimate.rentPerDay?.recommended || estimate.rentPerDay) : current.daily
                  }))}
                >
                  Use this price
                </button>
              </div>
            ) : null}
            {type === "sell" ? <Input name="askingPrice" placeholder="Sell price" value={form.askingPrice} onChange={update} /> : (
              <>
                <Input name="daily" placeholder="Price per day" value={form.daily} onChange={update} />
                <Input name="weekly" placeholder="Price per week" value={form.weekly} onChange={update} />
                <Input name="monthly" placeholder="Price per month" value={form.monthly} onChange={update} />
                <Input name="damageDeposit" placeholder="Refundable damage deposit" value={form.damageDeposit} onChange={update} />
              </>
            )}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-[24px] bg-indigo-700 px-5 py-4 text-base font-black text-white disabled:opacity-60 sm:w-auto" type="button" onClick={useCurrentLocation} disabled={isLocating}>
              <LocateFixed size={20} />
              {isLocating ? "Finding your location..." : "Use my current location"}
            </button>
            <div className="h-96 overflow-hidden rounded-[32px] border border-white/70 shadow-sm">
              <MapContainer center={[Number(form.lat), Number(form.lng)]} zoom={12} className="h-full w-full">
                <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationMarker form={form} setForm={setForm} />
                <MapCenter lat={Number(form.lat)} lng={Number(form.lng)} />
              </MapContainer>
            </div>
            <div className="rounded-[24px] bg-white/75 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800"><MapPin size={16} /> Selected address</p>
              <Input name="address" placeholder="Address or landmark" value={form.address} onChange={update} className="w-full" />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input name="lat" placeholder="Latitude" value={form.lat} onChange={update} readOnly />
                <Input name="lng" placeholder="Longitude" value={form.lng} onChange={update} readOnly />
              </div>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="rounded-[28px] bg-white/70 p-5">
            <h2 className="text-2xl font-black">{form.title || "Untitled listing"}</h2>
            <p className="mt-2 text-slate-600">{type === "sell" ? "Buy" : "Rent"} · {form.category} · {form.condition}</p>
            <p className="mt-2 text-slate-600">{form.itemAge || "Item age not specified"}</p>
            <p className="mt-2 text-slate-600">{form.conditionDescription || "Condition details not specified"}</p>
            <p className="mt-2 text-slate-600">{form.address}</p>
            <button className="brand-gradient mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 font-bold text-white disabled:opacity-60" disabled={isSubmitting} onClick={submit}>
              <Check size={18} />
              {isSubmitting ? "Publishing..." : "Publish listing"}
            </button>
          </div>
        ) : null}

        <div className="mt-8 flex justify-between">
          <button className="rounded-full border border-slate-200 bg-white/70 px-5 py-3 font-bold" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            Back
          </button>
          {step < 5 ? (
            <button className="brand-gradient rounded-full px-6 py-3 font-bold text-white" onClick={() => setStep(Math.min(5, step + 1))}>
              Next
            </button>
          ) : null}
        </div>
      </motion.div>
    </section>
  );
}

function Input({ className = "", ...props }) {
  return <input className={`rounded-[22px] border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 ${className}`} {...props} />;
}

function Select({ options, ...props }) {
  return (
    <select className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" {...props}>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function LocationMarker({ form, setForm }) {
  async function updateAddress(lat, lng) {
    setForm((current) => ({ ...current, lat: String(lat), lng: String(lng) }));
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data.display_name) {
        setForm((current) => ({ ...current, address: data.display_name }));
      }
    } catch {
      // Keep coordinates even if reverse geocoding is unavailable.
    }
  }

  useMapEvents({
    click(event) {
      updateAddress(event.latlng.lat.toFixed(6), event.latlng.lng.toFixed(6));
    }
  });
  return (
    <Marker
      draggable
      eventHandlers={{
        dragend(event) {
          const point = event.target.getLatLng();
          updateAddress(point.lat.toFixed(6), point.lng.toFixed(6));
        }
      }}
      position={[Number(form.lat), Number(form.lng)]}
    />
  );
}

function MapCenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      map.setView([lat, lng], Math.max(map.getZoom(), 14));
    }
  }, [lat, lng, map]);
  return null;
}
