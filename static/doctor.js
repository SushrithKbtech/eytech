const socket = io();
const room = "room1"; // Replace with dynamic room info if needed

socket.emit("join", { room });

const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");
const startCallButton = document.getElementById("start-call");

let localStream, remoteStream, peerConnection;
const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

startCallButton.onclick = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection(config);

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
        if (!remoteStream) {
            remoteStream = new MediaStream();
            remoteVideo.srcObject = remoteStream;
        }
        remoteStream.addTrack(event.track);
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("signal", { signal: event.candidate, target: room });
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("signal", { signal: offer, target: room });
};

socket.on("signal", async (data) => {
    if (data.signal.type === "offer") {
        await peerConnection.setRemoteDescription(data.signal);

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit("signal", { signal: answer, target: data.sid });
    } else if (data.signal.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal));
    }
});
