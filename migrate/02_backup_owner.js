import fetch from "isomorphic-fetch";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "./factory/idl_legacy.js";
import { writeFileSync } from "fs";
import { Ed25519KeyIdentity } from "@dfinity/identity";

const identity = Ed25519KeyIdentity.generate();

const actor = Actor.createActor(idlFactory, {
  canisterId: "vlhm2-4iaaa-aaaam-qaatq-cai",
  agent: new HttpAgent({ host: "https://ic0.app", fetch, identity }),
});

const totalItems = 10_000;
const batchSize = 100;

const chunks = Array(totalItems)
  .fill(undefined)
  .reduce((all, one, i) => {
    const chIdx = Math.floor(i / batchSize);
    all[chIdx] = (all[chIdx] || []).concat(one);
    return all;
  }, []);

for (let i = 0; i < chunks.length; i++) {
  console.log("fetching chunk:", i);

  let promises = Array(batchSize).fill(undefined);

  for (let j = 0; j < chunks[i].length; j++) {
    const tokenId = i * chunks[i].length + j;

    promises[j] = actor
      .ownerOfDip721(BigInt(tokenId))
      .then((result) => result.Ok)
      .then((ownerId) => ({
        tokenId,
        ownerId: ownerId.toText(),
      }));
  }

  try {
    chunks[i] = await Promise.all(promises);
  } catch (e) {
    throw e;
  }
}

const flatten = chunks.reduce((acc, c) => acc.concat(c), []);

writeFileSync("02_backup_owner.json", JSON.stringify(flatten, null, 2));
