import { RTCPeerConnection, RtpPacket } from "werift";
import axios from "axios";
import { createSocket } from "dgram";
import { exec } from "child_process";

const url = process.argv[2] || "http://localhost:8080/offer";

const udp = createSocket("udp4");
udp.bind(5000);

new Promise<void>(async (r, f) => {
  setTimeout(() => {
    f();
  }, 30_000);

  const pc = new RTCPeerConnection({
    iceConfig: { stunServer: ["stun.l.google.com", 19302] },
  });
  const transceiver = pc.addTransceiver("video", "sendrecv");
  transceiver.onTrack.once((track) => {
    track.onRtp.subscribe((rtp) => {
      console.log(rtp.header);
      r();
    });
  });

  await pc.setLocalDescription(await pc.createOffer()).catch((e) => f(e));
  const { data } = await axios.post(url, pc.localDescription).catch((e) => {
    f(e);
    throw e;
  });
  pc.setRemoteDescription(data).catch((e) => f(e));

  await pc.connectionStateChange.watch((state) => state === "connected");
  udp.on("message", (data) => {
    const rtp = RtpPacket.deSerialize(data);
    rtp.header.payloadType = transceiver.codecs[0].payloadType;
    transceiver.sendRtp(rtp);
  });

  exec(
    "ffmpeg -re -f lavfi -i testsrc=size=640x480:rate=30 -vcodec libvpx -keyint_min 30 -f rtp rtp://127.0.0.1:5000"
  );
})
  .then(() => {
    console.log("done");
    process.exit(0);
  })
  .catch((e) => {
    console.log("failed", e);
    process.exit(1);
  });
