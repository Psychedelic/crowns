import test, {Assertions} from "ava";

import {aliceActor, bobActor, custodianActor, custodianIdentity, johnActor} from "../setup";

const normalActors = [aliceActor, bobActor, johnActor];
const allActors = [...normalActors, custodianActor];

const testName = async (t: Assertions) => {
  (await Promise.all(allActors.map(actor => actor.dip721Name()))).forEach(result => t.deepEqual(result, []));
  await t.notThrowsAsync(custodianActor.dip721SetName("nft"));
  (await Promise.all(allActors.map(actor => actor.dip721Name()))).forEach(result => t.deepEqual(result, ["nft"]));
};

const testLogo = async (t: Assertions) => {
  (await Promise.all(allActors.map(actor => actor.dip721Logo()))).forEach(result => t.deepEqual(result, []));
  await t.notThrowsAsync(custodianActor.dip721SetLogo("nftLogo"));
  (await Promise.all(allActors.map(actor => actor.dip721Logo()))).forEach(result => t.deepEqual(result, ["nftLogo"]));
};

const testSymbol = async (t: Assertions) => {
  (await Promise.all(allActors.map(actor => actor.dip721Symbol()))).forEach(result => t.deepEqual(result, []));
  await t.notThrowsAsync(custodianActor.dip721SetSymbol("nftSymbol"));
  (await Promise.all(allActors.map(actor => actor.dip721Symbol()))).forEach(result => t.deepEqual(result, ["nftSymbol"]));
};

const testCustodians = async (t: Assertions) => {
  (await Promise.all(allActors.map(actor => actor.dip721Custodians()))).forEach(result =>
    t.is(result.filter(custodians => custodians.toText() === custodianIdentity.getPrincipal().toText()).length, 1)
  );
  await t.notThrowsAsync(
    custodianActor.dip721SetCustodians([custodianIdentity.getPrincipal(), custodianIdentity.getPrincipal()])
  );
  (await Promise.all(allActors.map(actor => actor.dip721Custodians()))).forEach(result =>
    t.deepEqual(result, [custodianIdentity.getPrincipal()])
  );
};

test("simple CRUD metadata.", async t => {
  await Promise.all([testName(t), testLogo(t), testSymbol(t), testCustodians(t)]);
  (await Promise.all(allActors.map(actor => actor.dip721Metadata()))).forEach(result => {
    t.deepEqual(result.name, ["nft"]);
    t.deepEqual(result.logo, ["nftLogo"]);
    t.deepEqual(result.symbol, ["nftSymbol"]);
    t.deepEqual(result.custodians, [custodianIdentity.getPrincipal()]);
  });
  (await Promise.all(allActors.map(actor => actor.dip721SupportedInterfaces()))).forEach(result => {
    t.deepEqual(result, [{Approval: null}, {Mint: null}]);
  });
});

test("error on unauthorize updating metadata.", async t => {
  // setName error when caller is not an custodian
  (await Promise.allSettled(normalActors.map(actor => actor.dip721SetName("nft")))).forEach(promise =>
    t.is(promise.status, "rejected")
  );
  // setLogo error when caller is not an custodian
  (await Promise.allSettled(normalActors.map(actor => actor.dip721SetLogo("nftLogo")))).forEach(promise =>
    t.is(promise.status, "rejected")
  );
  // setSymbol error when caller is not an custodian
  (await Promise.allSettled(normalActors.map(actor => actor.dip721SetSymbol("nftSymbol")))).forEach(promise =>
    t.is(promise.status, "rejected")
  );
  // setCustodians error when caller is not an custodian
  (await Promise.allSettled(normalActors.map(actor => actor.dip721SetCustodians([])))).forEach(promise =>
    t.is(promise.status, "rejected")
  );
});
