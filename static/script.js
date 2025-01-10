let localStream;
let peerConnections = {};
const socket = io();

function initVideoCall(roomId) {
    navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
            localStream = stream;
            document.getElementById("localVideo").srcObject = stream;

            socket.emit("join", { room: roomId });

            socket.on("joined", (data) => {
                data.peers.forEach((peerId) => {
                    if (peerId !== socket.id) {
                        createPeerConnection(peerId, true, roomId);
                    }
                });
            });

            socket.on("signal", (data) => {
                if (data.sid !== socket.id) {
                    createPeerConnection(data.sid, false, roomId);
                    peerConnections[data.sid].setRemoteDescription(
                        new RTCSessionDescription(data.signal)
                    );
                }
            });

            socket.on("peer-left", (data) => {
                if (peerConnections[data.sid]) {
                    peerConnections[data.sid].close();
                    delete peerConnections[data.sid];
                }
            });
        })
        .catch((err) => {
            console.error("Error accessing media devices:", err);
        });

    document.getElementById("startCall").addEventListener("click", () => {
        Object.keys(peerConnections).forEach((peerId) => {
            peerConnections[peerId]
                .createOffer()
                .then((offer) => {
                    peerConnections[peerId].setLocalDescription(offer);
                    socket.emit("signal", { target: peerId, signal: offer });
                })
                .catch((err) => console.error("Error creating offer:", err));
        });
    });
}

function createPeerConnection(peerId, isInitiator, roomId) {
    const peerConnection = new RTCPeerConnection();
    localStream.getTracks().forEach((track) =>
        peerConnection.addTrack(track, localStream)
    );

    peerConnection.ontrack = (event) => {
        document.getElementById("remoteVideo").srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("signal", {
                target: peerId,
                signal: event.candidate,
            });
        }
    };

    if (isInitiator) {
        peerConnection
            .createOffer()
            .then((offer) => {
                peerConnection.setLocalDescription(offer);
                socket.emit("signal", { target: peerId, signal: offer });
            })
            .catch((err) => console.error("Error creating offer:", err));
    }

    peerConnections[peerId] = peerConnection;
}
