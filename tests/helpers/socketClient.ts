import { io as ioClient, Socket } from "socket.io-client";

export function connectSocket(
  port: number,
  accessToken: string,
): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${port}`, {
      auth: { token: `Bearer ${accessToken}` },
      transports: ["websocket"],
      forceNew: true,
    });

    socket.once("ready", () => resolve(socket));
    socket.on("connect_error", (err: Error) => reject(err));
  });
}

export function waitForEvent<T = any>(
  socket: Socket,
  event: string,
  timeoutMs = 2000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(
        new Error(`Timed out waiting for "${event}" after ${timeoutMs}ms`),
      );
    }, timeoutMs);

    const handler = (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    };

    socket.once(event, handler);
  });
}
