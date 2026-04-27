import React from "react";
import { Camera, Check, MapPin, Package, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { ErrorMessage } from "../components/ErrorMessage.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { api, getErrorMessage } from "../lib/api.js";

const categories = ["Books", "Electronics", "Furniture", "Clothes", "Cycles", "Kitchenware", "Sports gear"];
const steps = ["Type", "Details", "Photos", "Pricing", "Location", "Review"];

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
    itemAge: "",
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

  const previews = useMemo(() => photos.map((file) => ({ file, url: URL.createObjectURL(file) })), [photos]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    maxFiles: 5,
    onDrop(files) {
      setPhotos(files.slice(0, 5));
    }
  });

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
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
    body.append("location", JSON.stringify({ type: "Point", coordinates: [Number(form.lng), Number(form.lat)], address: form.address }));
    photos.forEach((photo) => body.append("photos", photo));
    if (type === "sell") body.append("askingPrice", form.askingPrice);
    if (type === "rent") {
      body.append("rentRates", JSON.stringify({ daily: Number(form.daily), weekly: Number(form.weekly), monthly: Number(form.monthly) }));
      body.append("damageDeposit", form.damageDeposit || 0);
      body.append("availability", JSON.stringify([]));
    }

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
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input className="sm:col-span-2" name="title" placeholder="Title" value={form.title} onChange={update} />
            <Select name="category" value={form.category} onChange={update} options={categories} />
            <Select name="condition" value={form.condition} onChange={update} options={["new", "like_new", "used", "poor"]} />
            <Input name="itemAge" placeholder="Item age (e.g. 6 months, 1 year, Brand new)" value={form.itemAge} onChange={update} />
            <Input name="conditionDescription" placeholder="Condition details (e.g. Minor scratches, works perfectly)" value={form.conditionDescription} onChange={update} />
            <textarea className="min-h-36 rounded-[22px] border border-slate-200 bg-white/80 px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-100 sm:col-span-2" name="description" placeholder="Description" value={form.description} onChange={update} />
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
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-4">
              <Input name="address" placeholder="Address or landmark" value={form.address} onChange={update} />
              <Input name="lat" placeholder="Latitude" value={form.lat} onChange={update} />
              <Input name="lng" placeholder="Longitude" value={form.lng} onChange={update} />
            </div>
            <div className="h-80 overflow-hidden rounded-[32px]">
              <MapContainer center={[Number(form.lat), Number(form.lng)]} zoom={12} className="h-full w-full">
                <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationMarker form={form} setForm={setForm} />
              </MapContainer>
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
  useMapEvents({
    click(event) {
      setForm((current) => ({ ...current, lat: String(event.latlng.lat), lng: String(event.latlng.lng) }));
    }
  });
  return <Marker position={[Number(form.lat), Number(form.lng)]} />;
}
