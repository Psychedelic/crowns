import test from "ava";

import {aliceActor, bobActor, custodianActor, johnActor} from "../setup";

const normalActors = [aliceActor, bobActor, johnActor];
const allActors = [...normalActors, custodianActor];

test("COVER metadata.", async t => {
  (await Promise.all(allActors.map(actor => actor.dip721GitCommitHash()))).forEach(result =>
    t.true(typeof result === "string" && result !== "")
  );
  (await Promise.all(allActors.map(actor => actor.dip721RustToolchainInfo()))).forEach(result =>
    t.true(typeof result === "string" && result !== "")
  );
  (await Promise.all(allActors.map(actor => actor.dip721DfxInfo()))).forEach(result =>
    t.true(typeof result === "string" && result !== "")
  );
});
