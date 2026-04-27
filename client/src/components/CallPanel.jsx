import React from "react";
import Peer from "simple-peer/simplepeer.min.js";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function CallPanel({ socket, activeUserId }) {
  const [incoming, setIncoming] = useState(null);
  const [call, setCall] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    socket.on("call:incoming", setIncoming);
    socket.on("call:accepted", async (payload) => {
      const stream = await getMedia(payload.callType);
      const peer = createPeer({ initiator: true, stream, recipientId: payload.calleeId });
      peer.signal(payload.signal || {});
      setCall({ recipientId: payload.calleeId, callType: payload.callType });
    });
    socket.on("call:signal", (payload) => peerRef.current?.signal(payload.signal));
    socket.on("call:ended", endCall);
    return () => {
      socket.off("call:incoming", setIncoming);
      socket.off("call:accepted");
      socket.off("call:signal");
      socket.off("call:ended");
    };
  }, [socket]);

  async function getMedia(callType = "voice") {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video"
    });
    streamRef.current = stream;
    if (localVideo.current) localVideo.current.srcObject = stream;
    return stream;
  }

  function createPeer({ initiator, stream, recipientId }) {
    const peer = new Peer({ initiator, trickle: false, stream });
    peer.on("signal", (signal) => socket.emit("call:signal", { recipientId, signal }));
    peer.on("stream", (remoteStream) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
    });
    peerRef.current = peer;
    return peer;
  }

  async function startCall(callType) {
    if (!activeUserId) return;
    await getMedia(callType);
    socket.emit("call:request", { recipientId: activeUserId, callType });
    setCall({ recipientId: activeUserId, callType, ringing: true });
  }

  async function accept() {
    const stream = await getMedia(incoming.callType);
    const peer = createPeer({ initiator: false, stream, recipientId: incoming.callerId });
    setCall({ recipientId: incoming.callerId, callType: incoming.callType });
    socket.emit("call:accept", { callerId: incoming.callerId, callType: incoming.callType });
    setIncoming(null);
  }

  function reject() {
    socket.emit("call:reject", { callerId: incoming.callerId });
    setIncoming(null);
  }

  function endCall() {
    if (call?.recipientId) socket.emit("call:end", { recipientId: call.recipientId });
    peerRef.current?.destroy();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    peerRef.current = null;
    streamRef.current = null;
    setCall(null);
  }

  function toggleAudio() {
    streamRef.current?.getAudioTracks().forEach((track) => (track.enabled = muted));
    setMuted(!muted);
  }

  function toggleCamera() {
    streamRef.current?.getVideoTracks().forEach((track) => (track.enabled = cameraOff));
    setCameraOff(!cameraOff);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button className="rounded-md border px-3 py-2 font-semibold" onClick={() => startCall("voice")} type="button">Voice call</button>
        <button className="rounded-md border px-3 py-2 font-semibold" onClick={() => startCall("video")} type="button">Video call</button>
      </div>
      {incoming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-5 backdrop-blur-xl">
          <div className="glass w-full max-w-md rounded-[40px] p-8 text-center">
            <div className="brand-gradient mx-auto mb-5 grid h-24 w-24 place-items-center rounded-full text-3xl font-black text-white">R</div>
          <p className="font-semibold">Incoming {incoming.callType} call</p>
          <div className="mt-6 flex justify-center gap-3">
            <button className="rounded-full bg-emerald-500 px-6 py-3 font-bold text-white" onClick={accept}>Accept</button>
            <button className="rounded-full bg-red-500 px-6 py-3 font-bold text-white" onClick={reject}>Reject</button>
          </div>
          </div>
        </div>
      ) : null}
      {call ? (
        <div className="fixed inset-0 z-50 bg-slate-950/90 p-5 text-white backdrop-blur-xl">
          <div className="mx-auto flex h-full max-w-5xl flex-col justify-center">
          <div className="grid gap-2 sm:grid-cols-2">
            <video ref={localVideo} autoPlay muted playsInline className="aspect-video rounded-[32px] bg-black object-cover" />
            <video ref={remoteVideo} autoPlay playsInline className="aspect-video rounded-[32px] bg-black object-cover" />
          </div>
          <div className="mt-3 flex justify-center gap-2">
            <button className="rounded-full bg-white/10 p-3" onClick={toggleAudio}>{muted ? <MicOff /> : <Mic />}</button>
            <button className="rounded-full bg-white/10 p-3" onClick={toggleCamera}>{cameraOff ? <VideoOff /> : <Video />}</button>
            <button className="rounded-full bg-red-600 p-3" onClick={endCall}><PhoneOff /></button>
          </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
