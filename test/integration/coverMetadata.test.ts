import test from "ava";

import {aliceActor, bobActor, custodianActor, johnActor} from "../setup";

const normalActors = [aliceActor, bobActor, johnActor];
const allActors = [...normalActors, custodianActor];

test("COVER metadata.", async t => {
  (await Promise.all(allActors.map(actor => actor.coverMetadata()))).forEach(coverMetadata => {
    t.true(coverMetadata.canister_name.includes("crowns"));
    t.regex(coverMetadata.commit_hash, /^(?:[A-Fa-f0-9]{2})+$/u);
    t.is(coverMetadata.dfx_version, "0.11.2");
    t.is(coverMetadata.optimize_count, 0);
    t.is(coverMetadata.repo_url, "psychedelic/crowns");
    t.deepEqual(coverMetadata.rust_version, ["1.63.0"]);
  });
});
