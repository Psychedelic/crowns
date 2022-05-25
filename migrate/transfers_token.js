import { Actor, HttpAgent } from "@dfinity/agent";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { idlFactory } from "./factory/idl.js";
import fetch from "isomorphic-fetch";
import { readFileSync } from "fs";
import { Principal } from "@dfinity/principal";

const identity = Ed25519KeyIdentity.fromSecretKey(
  Buffer.from(process.env.SECRET, "hex")
);

const actor = Actor.createActor(idlFactory, {
  canisterId: "iqvo2-7qaaa-aaaam-qacxa-cai", // TODO: update real canister id
  agent: new HttpAgent({ host: "https://ic0.app", fetch, identity }),
});

const data = [
  // {
  // to: "j3dqd-46f74-s45g5-yt6qa-c5vyq-4zv7t-y4iie-omikc-cjngg-olpgg-rqe",
  // id: "8888",
  // },
];

const batchSize = 100;

const chunks = data.reduce((all, one, i) => {
  const chIdx = Math.floor(i / batchSize);
  all[chIdx] = (all[chIdx] || []).concat(one);
  return all;
}, []);

for (let i = 0; i < chunks.length; i++) {
  console.log("processing chunk:", i);
  try {
    await Promise.all(
      chunks[i].map((c) =>
        actor
          .transfer(Principal.fromText(c.to), BigInt(c.id))
          .then((result) => {
            if ("Err" in result)
              throw new Error(`Error Transfer: ${Object.keys(result.Err)[0]}`);
          })
      )
    );
  } catch (e) {
    throw e;
  }
}
