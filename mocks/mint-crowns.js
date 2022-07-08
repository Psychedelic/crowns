import { Actor, HttpAgent } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity";
import { idlFactory as crownsIdlFactory } from "./factory/idl.js";
import wicpIdlFactory from './factory/wicp.js';
import fetch from "isomorphic-fetch";
import { readFileSync } from "fs";
import { Principal } from "@dfinity/principal";
import { userPrincipals, systemPrincipal } from './principals.js';
import settings from './settings.js';
import { delay } from './utils.js';
import 'dotenv/config';

// 100 WICP (10_000_000_000 / 10^8 )
const amountE8sPerUser = 10_000_000_000;

(async () => {
  const {
    host,
    aggrCrownsJsonPath,
    chunkSize,
    chunkPromiseDelayMs,
  } = settings;

  const localCrownsCanisterId = process.env.CROWNS_ID;
  const localWicpCanisterId = process.env.WICP_ID;

  const { identity } = systemPrincipal;

  const agent = new HttpAgent({ host, fetch, identity });

  try {
    await agent.fetchRootKey();
  } catch (err) {
    console.warn('Oops! Unable to fetch root key, is the local replica running?');
    console.error(err);
  }

  const actorMkp = Actor.createActor(crownsIdlFactory, {
    canisterId: localCrownsCanisterId,
    agent,
  });

  const actorWicp = Actor.createActor(wicpIdlFactory, {
    canisterId: localWicpCanisterId,
    agent,
  });

  const data = JSON.parse(readFileSync(aggrCrownsJsonPath, "utf-8"));

  const chunks = data.reduce((all, one, i) => {
    const chIdx = Math.floor(i / chunkSize);
    all[chIdx] = (all[chIdx] || []).concat(one);
    return all;
  }, []);

  const hasUserPrincipalAtIndex = (parentId, idx, defaultPrincipal) => {
    if (parentId > 1) return defaultPrincipal;

    return userPrincipals[idx] || defaultPrincipal;
  };

  const maxChunks = process.env.MAX_CHUNKS || chunks.length;

  for (let i = 0; i < maxChunks; i++) {
    console.log("Currently processing chunk nr ", i);

    try {
      await delay(chunkPromiseDelayMs);
      await Promise.all(
        chunks[i].map((c, idx) => {
          const principal = hasUserPrincipalAtIndex(i, idx, c.to);
          actorMkp.mint(Principal.fromText(principal), BigInt(c.id), c.properties);
        })
      );
    } catch (e) {
      throw e;
    }
  }

  let promisesForWicpTopup = [];

  for (let i = 0; i < userPrincipals.length; i++) {
    promisesForWicpTopup.push(
      actorWicp.transfer(
        Principal.fromText(userPrincipals[i]),
        BigInt(amountE8sPerUser),
      ),
    );
  }

  await Promise.all(promisesForWicpTopup);
})();
