import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

const App = () => {
  const [partnerFound, setPartnerFound] = useState(false);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnection = useRef(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    // Handle joining room and finding partner
    socket.on("partner-found", (partnerId) => {
      console.log("Partner found:", partnerId);
      setPartnerFound(true);
      initializeConnection(partnerId, true);
    });

    socket.on("signal", async ({ from, data }) => {
      if (!peerConnection.current) initializeConnection(from, false);
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data));
      if (data.type === "offer") {
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit("signal", { to: from, data: answer });
      }
    });

    socket.on("partner-disconnected", () => {
      alert("Partner disconnected!");
      resetConnection();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Initialize connection with partner
  const initializeConnection = async (partnerId, initiator) => {
    peerConnection.current = new RTCPeerConnection();

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("signal", { to: partnerId, data: event.candidate });
      }
    };

    peerConnection.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    // Reuse stream if it already exists
    if (stream) {
      stream.getTracks().forEach((track) => peerConnection.current.addTrack(track, stream));
      localVideoRef.current.srcObject = stream;
    } else {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(newStream);
      localVideoRef.current.srcObject = newStream;
      localStorage.setItem("videoStream", "true"); // Indicate that the stream is already created
      newStream.getTracks().forEach((track) => peerConnection.current.addTrack(track, newStream));
    }

    if (initiator) {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit("signal", { to: partnerId, data: offer });
    }
  };

  const resetConnection = () => {
    if (peerConnection.current) peerConnection.current.close();
    peerConnection.current = null;
    setPartnerFound(false);
  };

  const joinRoom = () => {
    socket.emit("join-room");
  };

  return (
    <div className="container">
      <h1>Random Video Chat</h1>
      <div className="video-container">
        <video ref={localVideoRef} autoPlay muted className="video" />
        <video ref={remoteVideoRef} autoPlay className="video" />
      </div>
      {!partnerFound && (
        <button onClick={joinRoom} className="button">
          Find a Partner
        </button>
      )}
    </div>
  );
};

export default App;
