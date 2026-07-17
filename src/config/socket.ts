import { Server } from "socket.io";
import { server } from "./server";

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
});

io.on("connection", (socket) => {
  console.log("client connected", socket.id);

  socket.on("disconnect", () => {
    console.log("client disconnected", socket.id);
  });
});
export default io;
