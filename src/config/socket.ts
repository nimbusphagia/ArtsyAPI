import { Server } from "socket.io";
import { server } from "./server";

const io = new Server(server);

io.on("connection", (socket) => {
  console.log("client connected", socket.id);

  socket.on("disconnect", () => {
    console.log("client disconnected", socket.id);
  });
});
export default io;
