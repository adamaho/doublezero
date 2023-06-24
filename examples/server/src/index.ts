import fs from "fs";
import path from "path";

import { randomUUID } from "node:crypto";

import fastify, { FastifyReply } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";

import jsonpatch from "fast-json-patch";

const server = fastify({
  http2: true,
  https: {
    key: fs.readFileSync(path.join(__dirname, "../https/server.key")),
    cert: fs.readFileSync(path.join(__dirname, "../https/server.cert")),
  },
  logger: true,
});

server.register(cors, {
  origin: (origin, cb) => {
    const hostname = new URL(origin as string).hostname;
    if (hostname === "localhost") {
      cb(null, true);
      return;
    }
    cb(new Error("Not allowed"), false);
  },
  credentials: true,
});

server.addHook("onClose", (instance, done) => {
  console.log(instance);
  // Some code
  done();
});

server.register(cookie, {
  secret: "my-secret",
  hook: "onRequest",
  parseOptions: {},
});

type ClientId = string;
type CursorPosition = { client_id: string; x: number; y: number };

let cursors: Record<ClientId, CursorPosition> = {};
let clients = new Map<ClientId, FastifyReply<any>>();

server.get("/client", (_, res) => {
  const client_id = randomUUID();

  res.setCookie("client_id", client_id, {
    path: "/",
    secure: true,
    sameSite: "none",
    httpOnly: true,
  });

  res.send({ client_id });
});

server.post("/cursor", (req, res) => {
  const prev = { ...cursors };

  // update the cursor position in the "db"
  cursors[req.cookies.client_id as ClientId] = req.body[
    req.body.length - 1
  ] as CursorPosition;

  // generate a patch for the difference
  const patch = jsonpatch.compare(prev, cursors);

  if (patch.length === 0) return;

  // send the patch to all subscribed clients
  for (const r of clients.values()) {
    r.raw.write(JSON.stringify(patch));
  }

  res.send(null);
});

server.get("/cursor", (req, res) => {
  const headers = {
    "Content-Type": "application/json-patch+json",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
    "Access-Control-Allow-Origin": "http://localhost:3000",
    "Access-Control-Allow-Credentials": "true",
  };

  clients.set(req.cookies.client_id as ClientId, res);

  res.raw.writeHead(200, headers);
});

server.listen({ port: 3001 }, function (err, address) {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }

  console.log(`Listening on ${address}`);
});
