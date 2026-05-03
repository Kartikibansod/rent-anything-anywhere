import React, { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, MapPin, Mic, Phone, Send, Video } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { getChatMessages, getChats, initSocket } from "../lib/socket.js";
import { useUser } from "../lib/userContext.jsx";

export function ChatInbox() {
  const { user, coords } = useUser();
  const [params] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState([]);
  const [activeCashMeetup, setActiveCashMeetup] = useState(null);
  const [text, setText] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    getChats().then(setConversations).catch(() => setConversations([]));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    getChatMessages(activeId).then(setMessages).catch(() => setMessages([]));
  }, [activeId]);

  useEffect(() => {
    if (!user?._id) return;
    let activeSocket;
    initSocket().then((socket) => {
      activeSocket = socket;
      socket.emit("join-room", user._id);
      const onReceive = (payload) => {
        if (payload.conversationId === activeId) {
          setMessages((prev) => [...prev, payload.message]);
        }
      };
      socket.on("receive-message", onReceive);
      return () => socket.off("receive-message", onReceive);
    });
    return () => {
      if (activeSocket) activeSocket.off("receive-message");
    };
  }, [user?._id, activeId]);

  useEffect(() => {
    const withUser = params.get("with") || params.get("user");
    const listing = params.get("listing") || "general";
    if (withUser && user?._id) {
      const ids = [user._id, withUser].sort();
      const conversationId = `${ids[0]}:${ids[1]}:${listing}`;
      setActiveId(conversationId);
    }
  }, [params, user?._id]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.conversationId === activeId),
    [conversations, activeId]
  );
  const partnerId = useMemo(() => {
    const [a, b] = activeId.split(":");
    if (!a || !b || !user?._id) return "";
    return a === user._id ? b : a;
  }, [activeId, user?._id]);
  const listingId = useMemo(() => activeId.split(":")[2] || "", [activeId]);

  useEffect(() => {
    if (!activeId || !listingId || listingId === "general") {
      setActiveCashMeetup(null);
      return;
    }
    api.get("/cash-meetups/my")
      .then(({ data }) => {
        const request = (data.requests || []).find((item) => item.status === "accepted" && String(item.listing?._id) === String(listingId));
        setActiveCashMeetup(request || null);
      })
      .catch(() => setActiveCashMeetup(null));
  }, [activeId, listingId]);

  async function send(payload) {
    if (!activeId) return;
    const [a, b, listing] = activeId.split(":");
    const receiverId = a === user._id ? b : a;
    const { data } = await api.post("/messages", {
      receiverId,
      listingId: listing !== "general" ? listing : undefined,
      ...payload
    });
    setMessages((prev) => [...prev, data.message]);
    setText("");
  }

  async function onPhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await send({ type: "image", photos: [reader.result], content: "Image" });
    };
    reader.readAsDataURL(file);
  }

  async function confirmCashMeetup() {
    if (!activeCashMeetup?._id) return;
    await api.patch(`/cash-meetups/${activeCashMeetup._id}/confirm`);
    const { data } = await api.get("/cash-meetups/my");
    const request = (data.requests || []).find((item) => item._id === activeCashMeetup._id);
    setActiveCashMeetup(request || null);
  }

  const cashBanner = messages.find((msg) => msg.type === "system" && msg.content?.startsWith("Cash meetup agreed for"));

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white lg:grid-cols-[340px_1fr]">
      <aside className="border-r border-slate-100">
        <div className="p-4 text-lg font-black">Chats</div>
        {conversations.length === 0 ? (
          <div className="px-4 py-8 text-sm text-slate-500">No conversations yet. Start chatting with a seller!</div>
        ) : conversations.map((item) => (
          <button
            key={item._id}
            className={`block w-full border-t border-slate-100 px-4 py-3 text-left ${activeId === item.conversationId ? "bg-violet-50" : ""}`}
            onClick={() => setActiveId(item.conversationId)}
          >
            <p className="font-semibold">{item.content || "Conversation"}</p>
            <p className="text-xs text-slate-500">{item.conversationId}</p>
          </button>
        ))}
      </aside>
      <section className="flex min-h-0 flex-col">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="font-semibold">Conversation</p>
            <p className="text-xs text-slate-500">{activeConversation?.conversationId || "Select a chat"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-full border p-2"><Mic size={16} /></button>
            <button
              className="rounded-full border p-2"
              onClick={() => initSocket().then((socket) => socket.emit("call-request", { receiverId: partnerId, type: "audio", conversationId: activeId }))}
              type="button"
            ><Phone size={16} /></button>
            <button
              className="rounded-full border p-2"
              onClick={() => initSocket().then((socket) => socket.emit("call-request", { receiverId: partnerId, type: "video", conversationId: activeId }))}
              type="button"
            ><Video size={16} /></button>
          </div>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {cashBanner ? (
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{cashBanner.content}</div>
          ) : null}
          {activeCashMeetup ? (
            <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3">
              <button className="rounded-full border px-3 py-2 text-xs font-semibold" type="button" onClick={() => coords && send({ content: `https://maps.google.com/?q=${coords.lat},${coords.lng}`, type: "text" })}>Share location</button>
              <button className="rounded-full bg-violet-600 px-3 py-2 text-xs font-semibold text-white" type="button" onClick={confirmCashMeetup}>
                {String(activeCashMeetup.buyer?._id) === String(user?._id) ? "Confirm I received item" : "Confirm I received cash"}
              </button>
            </div>
          ) : null}
          {messages.map((msg) => (
            <div key={msg._id} className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${String(msg.sender?._id || msg.sender) === String(user?._id) ? "ml-auto bg-violet-600 text-white" : "bg-slate-100 text-slate-800"}`}>
              {msg.type === "image" && msg.photos?.[0] ? <img src={msg.photos[0]} alt="shared" className="mb-2 max-h-56 rounded-xl" /> : null}
              {msg.content?.includes("maps.google.com") ? <a className="underline" href={msg.content} target="_blank" rel="noreferrer">Shared location</a> : msg.content}
            </div>
          ))}
        </div>
        <form
          className="flex items-center gap-2 border-t border-slate-100 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!text.trim()) return;
            send({ content: text, type: "text" });
          }}
        >
          <button type="button" className="rounded-full border p-2" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={16} />
          </button>
          <button
            type="button"
            className="rounded-full border p-2"
            onClick={() => {
              if (!coords) return;
              send({ content: `https://maps.google.com/?q=${coords.lat},${coords.lng}`, type: "text" });
            }}
          >
            <MapPin size={16} />
          </button>
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none"
            placeholder="Type a message..."
          />
          <button className="rounded-full bg-violet-600 p-2 text-white" type="submit"><Send size={16} /></button>
          <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={onPhotoChange} />
        </form>
      </section>
    </div>
  );
}
