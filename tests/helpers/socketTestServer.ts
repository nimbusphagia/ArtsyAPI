import { server } from "../../src/config/server";
import io from "../../src/config/socket";
import { AddressInfo } from "net";

let attached = false;

export async function startTestServer(): Promise<{ port: number }> {
  if (!attached) {
    io.attach(server);
    attached = true;
  }

  return new Promise((resolve) => {
    server.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({ port });
    });
  });
}

export async function stopTestServer(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}
