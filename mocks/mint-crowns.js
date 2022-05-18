import { Actor, HttpAgent } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity";
import { idlFactory } from "../migrate/factory/idl.js";
import fetch from "isomorphic-fetch";
import { readFileSync } from "fs";
import { Principal } from "@dfinity/principal";
import { fleekPrincipals, systemPrincipal } from './principals.js';
import settings from './settings.js';

(async () => {
  const {
    localCrownsCanisterId,
    host,
    aggrCrownsJsonPath,
    chunkSize,
  } = settings;

  const { identity } = systemPrincipal;

  const agent = new HttpAgent({ host, fetch, identity });
 
  try {
    await agent.fetchRootKey();
  } catch (err) {
    console.warn('Oops! Unable to fetch root key, is the local replica running?');
    console.error(err);
  }

  const actor = Actor.createActor(idlFactory, {
    canisterId: localCrownsCanisterId,
    agent,
  });
  
  const data = JSON.parse(readFileSync(aggrCrownsJsonPath, "utf-8"));
  
  const chunks = data.reduce((all, one, i) => {
    const chIdx = Math.floor(i / chunkSize);
    all[chIdx] = (all[chIdx] || []).concat(one);
    return all;
  }, []);
  
  const hasFleekPrincipalAtIndex = (parentId, idx, defaultPrincipal) => {
    if (parentId > 1) return defaultPrincipal;
  
    return fleekPrincipals[idx] || defaultPrincipal;
  };

  const maxChunks = process.env.MAX_CHUNKS || chunks.length;
  
  for (let i = 0; i < maxChunks; i++) {
    console.log("processing chunk:", i);
  
    try {
      await Promise.all(
        chunks[i].map((c, idx) => {
          const principal = hasFleekPrincipalAtIndex(i, idx, c.to);
          actor.mint(Principal.fromText(principal), BigInt(c.id), c.properties);
        })
      );
    } catch (e) {
      throw e;
    }
  }
})();