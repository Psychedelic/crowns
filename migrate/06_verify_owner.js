import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory as idlFactoryLegacy } from "./factory/idl_legacy.js";
import { idlFactory } from "./factory/idl.js";
import fetch from "isomorphic-fetch";
import { Ed25519KeyIdentity } from "@dfinity/identity";

const identity = Ed25519KeyIdentity.generate();

const legacyActor = Actor.createActor(idlFactoryLegacy, {
  canisterId: "vlhm2-4iaaa-aaaam-qaatq-cai",
  agent: new HttpAgent({ host: "https://ic0.app", fetch, identity }),
});

const crownTestActor = Actor.createActor(idlFactory, {
  canisterId: "iqvo2-7qaaa-aaaam-qacxa-cai",
  agent: new HttpAgent({ host: "https://ic0.app", fetch, identity }),
});

const batchSize = 100;

for (let batchNum = 0; batchNum < batchSize; batchNum++) {
  const legacyOwnerOfPromise = Array(batchSize)
    .fill(undefined)
    .map((_, index) =>
      legacyActor
        .ownerOfDip721(BigInt(batchNum * batchSize + index))
        .then((result) => result.Ok)
    );

  const ownerOfPromise = Array(batchSize)
    .fill(undefined)
    .map((_, index) =>
      crownTestActor
        .ownerOf(BigInt(batchNum * batchSize + index))
        .then((result) => result.Ok[0])
    );

  const legacyOwnerOf = await Promise.all(legacyOwnerOfPromise);
  const ownerOf = await Promise.all(ownerOfPromise);

  Array(batchSize)
    .fill(undefined)
    .forEach((_, index) => {
      if (legacyOwnerOf[index].toText() !== ownerOf[index].toText()) {
        throw new Error(
          `owner token id ${batchNum * batchSize + index} mismatch.`
        );
      }
      // console.log(legacyOwnerOf[index].toText())
      // console.log(ownerOf[index].toText())

      console.log(`owner token id ${batchNum * batchSize + index} matched.`);
    });

  console.log(`chunk ${batchNum} passed.`);
}
