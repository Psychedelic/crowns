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
  const legacyMetadataPromise = Array(batchSize)
    .fill(undefined)
    .map((_, index) =>
      legacyActor
        .getMetadataDip721(BigInt(batchNum * batchSize + index))
        .then((result) => result.Ok[0].key_val_data)
    );

  const metadataPromise = Array(batchSize)
    .fill(undefined)
    .map((_, index) =>
      crownTestActor
        .tokenMetadata(BigInt(batchNum * batchSize + index))
        .then((result) => result.Ok.properties)
    );

  const legacyMetadata = await Promise.all(legacyMetadataPromise);
  const metadata = await Promise.all(metadataPromise);

  Array(batchSize)
    .fill(undefined)
    .forEach((_, index) => {
      for (let traits = 0; traits < 5; traits++) {
        if (
          legacyMetadata[index][traits].key !== metadata[index][traits][0] ||
          legacyMetadata[index][traits].val.TextContent !==
            metadata[index][traits][1].TextContent
        ) {
          throw new Error(`token id ${batchNum * batchSize + index} mismatch.`);
        }
        // console.log(legacyMetadata[index][traits].key)
        // console.log(metadata[index][traits][0])
        // console.log(legacyMetadata[index][traits].val.TextContent)
        // console.log(metadata[index][traits][1].TextContent)
      }

      // verify thumbnail
      if (
        metadata[index][5][1].TextContent !==
        legacyMetadata[index][4].val.TextContent.replace(
          /(.+.app\/)(.+\.).+/g,
          "$1thumbnails/$2png"
        )
      ) {
        throw new Error(
          `token id ${batchNum * batchSize + index} thumbnail is incorrect.`
        );
      }
      // console.log(legacyMetadata[index][4].val.TextContent);
      // console.log(metadata[index][5][1].TextContent);

      console.log(`token id ${batchNum * batchSize + index} matched.`);
    });

  console.log(`chunk ${batchNum} passed.`);
}
