import {Principal} from "@dfinity/principal10";
import {CapRoot} from "@psychedelic/cap-js";
import test from "ava";

import {TokenMetadata} from "../factory/idl.d";
import {
  aliceActor,
  aliceIdentity,
  bobActor,
  bobIdentity,
  custodianActor,
  custodianIdentity,
  johnActor,
  johnIdentity,
  capRouter,
  nftCanisterId,
  // stringify,
  host
} from "../setup";

const normalActors = [aliceActor, bobActor, johnActor];
const allActors = [...normalActors, custodianActor];

// TODO: The following is temporary and should be removed post removal of the custodian guard
// see related (error on query non-existed information.), which is skipped
test.before(async () => {
  await custodianActor.dip721_set_custodians([
    aliceIdentity.getPrincipal(),
    bobIdentity.getPrincipal(),
    johnIdentity.getPrincipal(),
    custodianIdentity.getPrincipal()
  ]);
});

let capRootBucket: string;
const capRoot = async () => {
  if (capRootBucket) {
    return await CapRoot.init({
      host,
      canisterId: capRootBucket
    });
  } else {
    throw new Error("no cap root bucket");
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const testTxns = async (transactions: any[]): Promise<any[]> => {
  const cap = await capRoot();

  return await Promise.all(
    transactions.map(async ({id, tx}) => {
      const resp = await cap.get_transaction(BigInt(id));
      const transaction = resp.Found[0][0];
      transaction.details = Object.fromEntries(transaction.details);
      return {txResp: transaction, tx};
    })
  );
};

test.serial("simple mint NFT and verify information.", async t => {
  // mint
  t.deepEqual(
    await custodianActor.dip721_mint(aliceIdentity.getPrincipal(), BigInt(1), [["A", {Nat64Content: BigInt(9999)}]]),
    {Ok: BigInt(0)}
  );

  // verify token
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(1))))).forEach(result => {
    t.like(result, {
      Ok: {
        transferred_at: [],
        transferred_by: [],
        owner: [aliceIdentity.getPrincipal()],
        operator: [],
        properties: [["A", {Nat64Content: BigInt(9999)}]],
        is_burned: false,
        token_identifier: BigInt(1),
        minted_by: custodianIdentity.getPrincipal(),
        approved_at: [],
        approved_by: [],
        burned_by: [],
        burned_at: []
      }
    });
  });

  // verify balanceOf
  (await Promise.all(allActors.map(actor => actor.dip721_balance_of(aliceIdentity.getPrincipal())))).forEach(result => {
    t.deepEqual(result, {Ok: BigInt(1)});
  });

  // verify ownerOf
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(1))))).forEach(result => {
    t.deepEqual(result, {Ok: [aliceIdentity.getPrincipal()]});
  });

  // verify ownerTokenIdentifiers
  (
    await Promise.all(allActors.map(actor => actor.dip721_owner_token_identifiers(aliceIdentity.getPrincipal())))
  ).forEach(result => {
    t.deepEqual(result, {Ok: [BigInt(1)]});
  });

  // verify ownerTokenMetadata
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(aliceIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 1);
      t.like((result as {Ok: Array<TokenMetadata>}).Ok[0], {
        transferred_at: [],
        transferred_by: [],
        owner: [aliceIdentity.getPrincipal()],
        operator: [],
        properties: [["A", {Nat64Content: BigInt(9999)}]],
        is_burned: false,
        approved_at: [],
        approved_by: [],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(1),
        minted_by: custodianIdentity.getPrincipal()
      });
    }
  );

  // verify operatorOf
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(1))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });
});

test.serial("verify stats after simple mint.", async t => {
  // verify totalTransactions
  (await Promise.all(allActors.map(actor => actor.dip721_total_transactions()))).forEach(result => {
    t.is(result, BigInt(1));
  });

  // verify totalSupply
  (await Promise.all(allActors.map(actor => actor.dip721_total_supply()))).forEach(result => {
    t.is(result, BigInt(1));
  });

  // verify cycles
  (await Promise.all(allActors.map(actor => actor.dip721_cycles()))).forEach(result => {
    t.truthy(result);
  });

  // verify totalUniqueHolders
  (await Promise.all(allActors.map(actor => actor.dip721_total_unique_holders()))).forEach(result => {
    t.is(result, BigInt(1));
  });

  // verify stats
  (await Promise.all(allActors.map(actor => actor.dip721_stats()))).forEach(result => {
    t.truthy(result.cycles);
    t.is(result.total_transactions, BigInt(1));
    t.is(result.total_supply, BigInt(1));
    t.is(result.total_unique_holders, BigInt(1));
  });
});

test.skip("error on query non-existed information.", async t => {
  // mint error when caller is not an owner
  (
    await Promise.allSettled(
      normalActors.map(actor =>
        actor.dip721_mint(aliceIdentity.getPrincipal(), BigInt(1), [["A", {Nat64Content: BigInt(9999)}]])
      )
    )
  ).forEach(promise => t.is(promise.status, "rejected"));

  // mint error when existed nft
  t.deepEqual(
    await custodianActor.dip721_mint(bobIdentity.getPrincipal(), BigInt(1), [["Z", {Int64Content: BigInt(-1)}]]),
    {
      Err: {
        ExistedNFT: null
      }
    }
  );

  // tokenMetadata error when non-exist token
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(2))))).forEach(result => {
    t.deepEqual(result, {
      Err: {
        TokenNotFound: null
      }
    });
  });

  // balanceOf error when non-exist owner
  (await Promise.all(allActors.map(actor => actor.dip721_balance_of(johnIdentity.getPrincipal())))).forEach(result => {
    t.deepEqual(result, {Err: {OwnerNotFound: null}});
  });

  // ownerOf error when non-exist token
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(2))))).forEach(result => {
    t.deepEqual(result, {Err: {TokenNotFound: null}});
  });

  // ownerTokenIdentifiers error when non-exist owner
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_identifiers(bobIdentity.getPrincipal())))).forEach(
    result => {
      t.deepEqual(result, {Err: {OwnerNotFound: null}});
    }
  );

  // ownerTokenMetadata error when non-exist owner
  (
    await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(custodianIdentity.getPrincipal())))
  ).forEach(result => {
    t.deepEqual(result, {Err: {OwnerNotFound: null}});
  });

  // operatorOf error when non-exist token
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(2))))).forEach(result => {
    t.deepEqual(result, {Err: {TokenNotFound: null}});
  });
});

test.serial("Get cap token contract root bucket", async t => {
  // wait 3s to ensure root bucket is created
  await new Promise(resolve => setTimeout(resolve, 3000));

  const principal = Principal.fromText(nftCanisterId);
  const {canister: bucketResponse} = await capRouter.get_token_contract_root_bucket({
    tokenId: principal,
    witness: false
  });
  capRootBucket = bucketResponse.toString();
  console.log(capRootBucket);
  t.true(capRootBucket.length > 0);
});

test.serial("verify basic mint transaction.", async t => {
  const txns = await testTxns([
    {
      id: "0",
      tx: {
        caller: custodianIdentity.getPrincipal(),
        operation: "mint",
        details: {
          token_identifier: {Text: "1"},
          to: {Principal: aliceIdentity.getPrincipal()}
        }
      }
    }
  ]);

  txns.map(({txResp, tx}) => {
    t.like(txResp, tx);
  });
});

test.serial("mint NFTs.", async t => {
  t.deepEqual(
    await custodianActor.dip721_mint(aliceIdentity.getPrincipal(), BigInt(2), [["B", {Int64Content: BigInt(1234)}]]),
    {Ok: BigInt(1)}
  );
  t.deepEqual(await custodianActor.dip721_mint(bobIdentity.getPrincipal(), BigInt(3), [["C", {Int32Content: 5678}]]), {
    Ok: BigInt(2)
  });
  t.deepEqual(
    await custodianActor.dip721_mint(johnIdentity.getPrincipal(), BigInt(4), [["D", {TextContent: "∆≈ç√∫"}]]),
    {
      Ok: BigInt(3)
    }
  );
});

test.serial("verify transactions after mints", async t => {
  const txns = await testTxns([
    {
      id: "1",
      tx: {
        caller: custodianIdentity.getPrincipal(),
        operation: "mint",
        details: {
          token_identifier: {Text: "2"},
          to: {Principal: aliceIdentity.getPrincipal()}
        }
      }
    },
    {
      id: "2",
      tx: {
        caller: custodianIdentity.getPrincipal(),
        operation: "mint",
        details: {
          token_identifier: {Text: "3"},
          to: {Principal: bobIdentity.getPrincipal()}
        }
      }
    },
    {
      id: "3",
      tx: {
        caller: custodianIdentity.getPrincipal(),
        operation: "mint",
        details: {
          token_identifier: {Text: "4"},
          to: {Principal: johnIdentity.getPrincipal()}
        }
      }
    }
  ]);

  txns.map(({txResp, tx}) => {
    t.like(txResp, tx);
  });
});

test.serial("verify stats after mint.", async t => {
  // verify totalTransactions
  (await Promise.all(allActors.map(actor => actor.dip721_total_transactions()))).forEach(result => {
    t.is(result, BigInt(4));
  });

  // verify totalSupply
  (await Promise.all(allActors.map(actor => actor.dip721_total_supply()))).forEach(result => {
    t.is(result, BigInt(4));
  });

  // verify cycles
  (await Promise.all(allActors.map(actor => actor.dip721_cycles()))).forEach(result => {
    t.truthy(result);
  });

  // verify totalUniqueHolders
  (await Promise.all(allActors.map(actor => actor.dip721_total_unique_holders()))).forEach(result => {
    t.is(result, BigInt(3));
  });

  // verify stats
  (await Promise.all(allActors.map(actor => actor.dip721_stats()))).forEach(result => {
    t.truthy(result.cycles);
    t.is(result.total_transactions, BigInt(4));
    t.is(result.total_supply, BigInt(4));
    t.is(result.total_unique_holders, BigInt(3));
  });
});

test.serial("verify mint information.", async t => {
  // verify token
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(2))))).forEach(result => {
    t.like(result, {
      Ok: {
        transferred_at: [],
        transferred_by: [],
        owner: [aliceIdentity.getPrincipal()],
        operator: [],
        properties: [["B", {Int64Content: BigInt(1234)}]],
        is_burned: false,
        approved_at: [],
        approved_by: [],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(2),
        minted_by: custodianIdentity.getPrincipal()
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(3))))).forEach(result => {
    t.like(result, {
      Ok: {
        transferred_at: [],
        transferred_by: [],
        owner: [bobIdentity.getPrincipal()],
        operator: [],
        properties: [["C", {Int32Content: 5678}]],
        is_burned: false,
        approved_at: [],
        approved_by: [],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(3),
        minted_by: custodianIdentity.getPrincipal()
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(4))))).forEach(result => {
    t.like(result, {
      Ok: {
        transferred_at: [],
        transferred_by: [],
        owner: [johnIdentity.getPrincipal()],
        operator: [],
        properties: [["D", {TextContent: "∆≈ç√∫"}]],
        is_burned: false,
        approved_at: [],
        approved_by: [],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(4),
        minted_by: custodianIdentity.getPrincipal()
      }
    });
  });

  // verify balanceOf
  (await Promise.all(allActors.map(actor => actor.dip721_balance_of(aliceIdentity.getPrincipal())))).forEach(result => {
    t.deepEqual(result, {Ok: BigInt(2)});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_balance_of(bobIdentity.getPrincipal())))).forEach(result => {
    t.deepEqual(result, {Ok: BigInt(1)});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_balance_of(johnIdentity.getPrincipal())))).forEach(result => {
    t.deepEqual(result, {Ok: BigInt(1)});
  });

  // verify ownerOf
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(2))))).forEach(result => {
    t.deepEqual(result, {Ok: [aliceIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(3))))).forEach(result => {
    t.deepEqual(result, {Ok: [bobIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(4))))).forEach(result => {
    t.deepEqual(result, {Ok: [johnIdentity.getPrincipal()]});
  });

  // verify ownerTokenIdentifiers
  (
    await Promise.all(allActors.map(actor => actor.dip721_owner_token_identifiers(aliceIdentity.getPrincipal())))
  ).forEach(result => {
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(1)));
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(2)));
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_identifiers(bobIdentity.getPrincipal())))).forEach(
    result => {
      t.deepEqual(result, {Ok: [BigInt(3)]});
    }
  );
  (
    await Promise.all(allActors.map(actor => actor.dip721_owner_token_identifiers(johnIdentity.getPrincipal())))
  ).forEach(result => {
    t.deepEqual(result, {Ok: [BigInt(4)]});
  });

  // verify ownerTokenMetadata
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(aliceIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 2);
      t.like(
        (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(1)),
        {
          transferred_at: [],
          transferred_by: [],
          owner: [aliceIdentity.getPrincipal()],
          operator: [],
          properties: [["A", {Nat64Content: BigInt(9999)}]],
          is_burned: false,
          approved_at: [],
          approved_by: [],
          burned_by: [],
          burned_at: [],
          token_identifier: BigInt(1),
          minted_by: custodianIdentity.getPrincipal()
        }
      );
      t.like(
        (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(2)),
        {
          transferred_at: [],
          transferred_by: [],
          owner: [aliceIdentity.getPrincipal()],
          operator: [],
          properties: [["B", {Int64Content: BigInt(1234)}]],
          is_burned: false,
          approved_at: [],
          approved_by: [],
          burned_by: [],
          burned_at: [],
          token_identifier: BigInt(2),
          minted_by: custodianIdentity.getPrincipal()
        }
      );
    }
  );
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(bobIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 1);
      t.like((result as {Ok: Array<TokenMetadata>}).Ok[0], {
        transferred_at: [],
        transferred_by: [],
        owner: [bobIdentity.getPrincipal()],
        operator: [],
        properties: [["C", {Int32Content: 5678}]],
        is_burned: false,
        approved_at: [],
        approved_by: [],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(3),
        minted_by: custodianIdentity.getPrincipal()
      });
    }
  );
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(johnIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 1);
      t.like((result as {Ok: Array<TokenMetadata>}).Ok[0], {
        transferred_at: [],
        transferred_by: [],
        owner: [johnIdentity.getPrincipal()],
        operator: [],
        properties: [["D", {TextContent: "∆≈ç√∫"}]],
        is_burned: false,
        approved_at: [],
        approved_by: [],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(4),
        minted_by: custodianIdentity.getPrincipal()
      });
    }
  );

  // verify operatorOf
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(1))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(2))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(3))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(4))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });
});

test.serial("approve NFTs.", async t => {
  t.deepEqual(await bobActor.dip721_approve(aliceIdentity.getPrincipal(), BigInt(3)), {Ok: BigInt(4)});
  t.deepEqual(await johnActor.dip721_approve(aliceIdentity.getPrincipal(), BigInt(4)), {Ok: BigInt(5)});
  t.deepEqual(await aliceActor.dip721_approve(bobIdentity.getPrincipal(), BigInt(1)), {Ok: BigInt(6)});
  t.deepEqual(await aliceActor.dip721_approve(johnIdentity.getPrincipal(), BigInt(2)), {Ok: BigInt(7)});

  // verify isApprovedForAll
  (
    await Promise.all([
      ...allActors.map(actor =>
        actor.dip721_is_approved_for_all(bobIdentity.getPrincipal(), aliceIdentity.getPrincipal())
      ),
      ...allActors.map(actor =>
        actor.dip721_is_approved_for_all(johnIdentity.getPrincipal(), aliceIdentity.getPrincipal())
      )
    ])
  ).forEach(result => t.deepEqual(result, {Ok: true}));
  (
    await Promise.all([
      ...allActors.map(actor =>
        actor.dip721_is_approved_for_all(aliceIdentity.getPrincipal(), bobIdentity.getPrincipal())
      ),
      ...allActors.map(actor =>
        actor.dip721_is_approved_for_all(aliceIdentity.getPrincipal(), johnIdentity.getPrincipal())
      )
    ])
  ).forEach(result => t.deepEqual(result, {Ok: false}));
});

test.serial("verify transactions after approval.", async t => {
  const txns = await testTxns([
    {
      id: "4",
      tx: {
        caller: bobIdentity.getPrincipal(),
        operation: "approve",
        details: {
          operator: {Principal: aliceIdentity.getPrincipal()},
          token_identifier: {Text: "3"}
        }
      }
    },
    {
      id: "5",
      tx: {
        caller: johnIdentity.getPrincipal(),
        operation: "approve",
        details: {
          operator: {Principal: aliceIdentity.getPrincipal()},
          token_identifier: {Text: "4"}
        }
      }
    },
    {
      id: "6",
      tx: {
        caller: aliceIdentity.getPrincipal(),
        operation: "approve",
        details: {
          operator: {Principal: bobIdentity.getPrincipal()},
          token_identifier: {Text: "1"}
        }
      }
    },
    {
      id: "7",
      tx: {
        caller: aliceIdentity.getPrincipal(),
        operation: "approve",
        details: {
          operator: {Principal: johnIdentity.getPrincipal()},
          token_identifier: {Text: "2"}
        }
      }
    }
  ]);

  txns.map(({txResp, tx}) => {
    t.like(txResp, tx);
  });
});

test.serial("verify stats after approve.", async t => {
  // verify totalTransactions
  (await Promise.all(allActors.map(actor => actor.dip721_total_transactions()))).forEach(result => {
    t.is(result, BigInt(8));
  });

  // verify totalSupply
  (await Promise.all(allActors.map(actor => actor.dip721_total_supply()))).forEach(result => {
    t.is(result, BigInt(4));
  });

  // verify cycles
  (await Promise.all(allActors.map(actor => actor.dip721_cycles()))).forEach(result => {
    t.truthy(result);
  });

  // verify totalUniqueHolders
  (await Promise.all(allActors.map(actor => actor.dip721_total_unique_holders()))).forEach(result => {
    t.is(result, BigInt(3));
  });

  // verify stats
  (await Promise.all(allActors.map(actor => actor.dip721_stats()))).forEach(result => {
    t.truthy(result.cycles);
    t.is(result.total_transactions, BigInt(8));
    t.is(result.total_supply, BigInt(4));
    t.is(result.total_unique_holders, BigInt(3));
  });
});

test.serial("verify approve information.", async t => {
  // verify balanceOf
  (await Promise.all(allActors.map(actor => actor.dip721_balance_of(aliceIdentity.getPrincipal())))).forEach(result => {
    t.deepEqual(result, {Ok: BigInt(2)});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_balance_of(bobIdentity.getPrincipal())))).forEach(result => {
    t.deepEqual(result, {Ok: BigInt(1)});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_balance_of(johnIdentity.getPrincipal())))).forEach(result => {
    t.deepEqual(result, {Ok: BigInt(1)});
  });

  // verify ownerOf
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(1))))).forEach(result => {
    t.deepEqual(result, {Ok: [aliceIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(2))))).forEach(result => {
    t.deepEqual(result, {Ok: [aliceIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(3))))).forEach(result => {
    t.deepEqual(result, {Ok: [bobIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(4))))).forEach(result => {
    t.deepEqual(result, {Ok: [johnIdentity.getPrincipal()]});
  });

  // verify operatorOf
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(1))))).forEach(result => {
    t.deepEqual(result, {Ok: [bobIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(2))))).forEach(result => {
    t.deepEqual(result, {Ok: [johnIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(3))))).forEach(result => {
    t.deepEqual(result, {Ok: [aliceIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(4))))).forEach(result => {
    t.deepEqual(result, {Ok: [aliceIdentity.getPrincipal()]});
  });

  // verify token
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(1))))).forEach(result => {
    t.like(result, {
      Ok: {
        transferred_at: [],
        transferred_by: [],
        owner: [aliceIdentity.getPrincipal()],
        operator: [bobIdentity.getPrincipal()],
        properties: [["A", {Nat64Content: BigInt(9999)}]],
        is_burned: false,
        approved_by: [aliceIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(1),
        minted_by: custodianIdentity.getPrincipal()
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(2))))).forEach(result => {
    t.like(result, {
      Ok: {
        transferred_at: [],
        transferred_by: [],
        owner: [aliceIdentity.getPrincipal()],
        operator: [johnIdentity.getPrincipal()],
        properties: [["B", {Int64Content: BigInt(1234)}]],
        is_burned: false,
        approved_by: [aliceIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(2),
        minted_by: custodianIdentity.getPrincipal()
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(3))))).forEach(result => {
    t.like(result, {
      Ok: {
        transferred_at: [],
        transferred_by: [],
        owner: [bobIdentity.getPrincipal()],
        operator: [aliceIdentity.getPrincipal()],
        properties: [["C", {Int32Content: 5678}]],
        is_burned: false,
        approved_by: [bobIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(3),
        minted_by: custodianIdentity.getPrincipal()
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(4))))).forEach(result => {
    t.like(result, {
      Ok: {
        transferred_at: [],
        transferred_by: [],
        owner: [johnIdentity.getPrincipal()],
        operator: [aliceIdentity.getPrincipal()],
        properties: [["D", {TextContent: "∆≈ç√∫"}]],
        is_burned: false,
        approved_by: [johnIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(4),
        minted_by: custodianIdentity.getPrincipal()
      }
    });
  });

  // verify ownerTokenMetadata
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(aliceIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 2);
      t.like(
        (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(1)),
        {
          transferred_at: [],
          transferred_by: [],
          owner: [aliceIdentity.getPrincipal()],
          operator: [bobIdentity.getPrincipal()],
          properties: [["A", {Nat64Content: BigInt(9999)}]],
          is_burned: false,
          approved_by: [aliceIdentity.getPrincipal()],
          burned_by: [],
          burned_at: [],
          token_identifier: BigInt(1),
          minted_by: custodianIdentity.getPrincipal()
        }
      );
      t.like(
        (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(2)),
        {
          transferred_at: [],
          transferred_by: [],
          owner: [aliceIdentity.getPrincipal()],
          operator: [johnIdentity.getPrincipal()],
          properties: [["B", {Int64Content: BigInt(1234)}]],
          is_burned: false,
          approved_by: [aliceIdentity.getPrincipal()],
          burned_by: [],
          burned_at: [],
          token_identifier: BigInt(2),
          minted_by: custodianIdentity.getPrincipal()
        }
      );
    }
  );
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(bobIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 1);
      t.like((result as {Ok: Array<TokenMetadata>}).Ok[0], {
        transferred_at: [],
        transferred_by: [],
        owner: [bobIdentity.getPrincipal()],
        operator: [aliceIdentity.getPrincipal()],
        properties: [["C", {Int32Content: 5678}]],
        is_burned: false,
        approved_by: [bobIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(3),
        minted_by: custodianIdentity.getPrincipal()
      });
    }
  );
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(johnIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 1);
      t.like((result as {Ok: Array<TokenMetadata>}).Ok[0], {
        transferred_at: [],
        transferred_by: [],
        owner: [johnIdentity.getPrincipal()],
        operator: [aliceIdentity.getPrincipal()],
        properties: [["D", {TextContent: "∆≈ç√∫"}]],
        is_burned: false,
        approved_by: [johnIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(4),
        minted_by: custodianIdentity.getPrincipal()
      });
    }
  );

  // verify operatorTokenMetadata
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_metadata(aliceIdentity.getPrincipal())))
  ).forEach(result => {
    t.true("Ok" in result);
    t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 2);
    t.like(
      (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(3)),
      {
        transferred_at: [],
        transferred_by: [],
        owner: [bobIdentity.getPrincipal()],
        operator: [aliceIdentity.getPrincipal()],
        properties: [["C", {Int32Content: 5678}]],
        is_burned: false,
        approved_by: [bobIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(3),
        minted_by: custodianIdentity.getPrincipal()
      }
    );
    t.like(
      (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(4)),
      {
        transferred_at: [],
        transferred_by: [],
        owner: [johnIdentity.getPrincipal()],
        operator: [aliceIdentity.getPrincipal()],
        properties: [["D", {TextContent: "∆≈ç√∫"}]],
        is_burned: false,
        approved_by: [johnIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(4),
        minted_by: custodianIdentity.getPrincipal()
      }
    );
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_token_metadata(bobIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 1);
      t.like((result as {Ok: Array<TokenMetadata>}).Ok[0], {
        transferred_at: [],
        transferred_by: [],
        owner: [aliceIdentity.getPrincipal()],
        operator: [bobIdentity.getPrincipal()],
        properties: [["A", {Nat64Content: BigInt(9999)}]],
        is_burned: false,
        approved_by: [aliceIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(1),
        minted_by: custodianIdentity.getPrincipal()
      });
    }
  );
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_metadata(johnIdentity.getPrincipal())))
  ).forEach(result => {
    t.true("Ok" in result);
    t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 1);
    t.like((result as {Ok: Array<TokenMetadata>}).Ok[0], {
      transferred_at: [],
      transferred_by: [],
      owner: [aliceIdentity.getPrincipal()],
      operator: [johnIdentity.getPrincipal()],
      properties: [["B", {Int64Content: BigInt(1234)}]],
      is_burned: false,
      approved_by: [aliceIdentity.getPrincipal()],
      burned_by: [],
      burned_at: [],
      token_identifier: BigInt(2),
      minted_by: custodianIdentity.getPrincipal()
    });
  });

  // verify operatorTokenIdentifiers
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_identifiers(aliceIdentity.getPrincipal())))
  ).forEach(result => {
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(3)));
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(4)));
  });
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_identifiers(bobIdentity.getPrincipal())))
  ).forEach(result => {
    t.deepEqual(result, {Ok: [BigInt(1)]});
  });
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_identifiers(johnIdentity.getPrincipal())))
  ).forEach(result => {
    t.deepEqual(result, {Ok: [BigInt(2)]});
  });
});

test.serial("error on self approve or approve non-existed operator.", async t => {
  t.deepEqual(await aliceActor.dip721_approve(aliceIdentity.getPrincipal(), BigInt(1)), {Err: {SelfApprove: null}});
  t.deepEqual(await aliceActor.dip721_approve(aliceIdentity.getPrincipal(), BigInt(2)), {Err: {SelfApprove: null}});
  t.deepEqual(await bobActor.dip721_approve(bobIdentity.getPrincipal(), BigInt(3)), {Err: {SelfApprove: null}});
  t.deepEqual(await johnActor.dip721_approve(johnIdentity.getPrincipal(), BigInt(4)), {Err: {SelfApprove: null}});

  // operatorTokenMetadata error when non-existed operator
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_metadata(custodianIdentity.getPrincipal())))
  ).forEach(result => {
    t.deepEqual(result, {Err: {OperatorNotFound: null}});
  });

  // operatorTokenIdentifiers error when non-existed operator
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_identifiers(custodianIdentity.getPrincipal())))
  ).forEach(result => {
    t.deepEqual(result, {Err: {OperatorNotFound: null}});
  });
});

test.serial("error on unauthorize owner when approve.", async t => {
  t.deepEqual(await custodianActor.dip721_approve(aliceIdentity.getPrincipal(), BigInt(1)), {
    Err: {UnauthorizedOwner: null}
  });
  t.deepEqual(await custodianActor.dip721_approve(aliceIdentity.getPrincipal(), BigInt(2)), {
    Err: {UnauthorizedOwner: null}
  });
  t.deepEqual(await custodianActor.dip721_approve(aliceIdentity.getPrincipal(), BigInt(3)), {
    Err: {UnauthorizedOwner: null}
  });
  t.deepEqual(await custodianActor.dip721_approve(aliceIdentity.getPrincipal(), BigInt(4)), {
    Err: {UnauthorizedOwner: null}
  });
});

test.serial("approve NFTs (new operator).", async t => {
  t.deepEqual(await aliceActor.dip721_approve(custodianIdentity.getPrincipal(), BigInt(1)), {Ok: BigInt(8)});
  t.deepEqual(await aliceActor.dip721_approve(custodianIdentity.getPrincipal(), BigInt(2)), {Ok: BigInt(9)});
  t.deepEqual(await bobActor.dip721_approve(custodianIdentity.getPrincipal(), BigInt(3)), {Ok: BigInt(10)});
  t.deepEqual(await johnActor.dip721_approve(custodianIdentity.getPrincipal(), BigInt(4)), {Ok: BigInt(11)});
});

test.serial("verify stats after approve (new operator).", async t => {
  // verify totalTransactions
  (await Promise.all(allActors.map(actor => actor.dip721_total_transactions()))).forEach(result => {
    t.is(result, BigInt(12));
  });

  // verify totalSupply
  (await Promise.all(allActors.map(actor => actor.dip721_total_supply()))).forEach(result => {
    t.is(result, BigInt(4));
  });

  // verify cycles
  (await Promise.all(allActors.map(actor => actor.dip721_cycles()))).forEach(result => {
    t.truthy(result);
  });

  // verify totalUniqueHolders
  (await Promise.all(allActors.map(actor => actor.dip721_total_unique_holders()))).forEach(result => {
    t.is(result, BigInt(3));
  });

  // verify stats
  (await Promise.all(allActors.map(actor => actor.dip721_stats()))).forEach(result => {
    t.truthy(result.cycles);
    t.is(result.total_transactions, BigInt(12));
    t.is(result.total_supply, BigInt(4));
    t.is(result.total_unique_holders, BigInt(3));
  });
});

test.serial("verify approve information after updated to new operator.", async t => {
  // verify operatorOf
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(1))))).forEach(result => {
    t.deepEqual(result, {Ok: [custodianIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(2))))).forEach(result => {
    t.deepEqual(result, {Ok: [custodianIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(3))))).forEach(result => {
    t.deepEqual(result, {Ok: [custodianIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(4))))).forEach(result => {
    t.deepEqual(result, {Ok: [custodianIdentity.getPrincipal()]});
  });

  // verify token
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(1))))).forEach(result => {
    t.like(result, {
      Ok: {
        transferred_at: [],
        transferred_by: [],
        owner: [aliceIdentity.getPrincipal()],
        operator: [custodianIdentity.getPrincipal()],
        properties: [["A", {Nat64Content: BigInt(9999)}]],
        is_burned: false,
        approved_by: [aliceIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(1),
        minted_by: custodianIdentity.getPrincipal()
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(2))))).forEach(result => {
    t.like(result, {
      Ok: {
        transferred_at: [],
        transferred_by: [],
        owner: [aliceIdentity.getPrincipal()],
        operator: [custodianIdentity.getPrincipal()],
        properties: [["B", {Int64Content: BigInt(1234)}]],
        is_burned: false,
        approved_by: [aliceIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(2),
        minted_by: custodianIdentity.getPrincipal()
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(3))))).forEach(result => {
    t.like(result, {
      Ok: {
        transferred_at: [],
        transferred_by: [],
        owner: [bobIdentity.getPrincipal()],
        operator: [custodianIdentity.getPrincipal()],
        properties: [["C", {Int32Content: 5678}]],
        is_burned: false,
        approved_by: [bobIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(3),
        minted_by: custodianIdentity.getPrincipal()
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(4))))).forEach(result => {
    t.like(result, {
      Ok: {
        transferred_at: [],
        transferred_by: [],
        owner: [johnIdentity.getPrincipal()],
        operator: [custodianIdentity.getPrincipal()],
        properties: [["D", {TextContent: "∆≈ç√∫"}]],
        is_burned: false,
        approved_by: [johnIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(4),
        minted_by: custodianIdentity.getPrincipal()
      }
    });
  });

  // verify ownerTokenMetadata
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(aliceIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 2);
      t.like(
        (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(1)),
        {
          transferred_at: [],
          transferred_by: [],
          owner: [aliceIdentity.getPrincipal()],
          operator: [custodianIdentity.getPrincipal()],
          properties: [["A", {Nat64Content: BigInt(9999)}]],
          is_burned: false,
          approved_by: [aliceIdentity.getPrincipal()],
          burned_by: [],
          burned_at: [],
          token_identifier: BigInt(1),
          minted_by: custodianIdentity.getPrincipal()
        }
      );
      t.like(
        (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(2)),
        {
          transferred_at: [],
          transferred_by: [],
          owner: [aliceIdentity.getPrincipal()],
          operator: [custodianIdentity.getPrincipal()],
          properties: [["B", {Int64Content: BigInt(1234)}]],
          is_burned: false,
          approved_by: [aliceIdentity.getPrincipal()],
          burned_by: [],
          burned_at: [],
          token_identifier: BigInt(2),
          minted_by: custodianIdentity.getPrincipal()
        }
      );
    }
  );
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(bobIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 1);
      t.like((result as {Ok: Array<TokenMetadata>}).Ok[0], {
        transferred_at: [],
        transferred_by: [],
        owner: [bobIdentity.getPrincipal()],
        operator: [custodianIdentity.getPrincipal()],
        properties: [["C", {Int32Content: 5678}]],
        is_burned: false,
        approved_by: [bobIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(3),
        minted_by: custodianIdentity.getPrincipal()
      });
    }
  );
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(johnIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 1);
      t.like((result as {Ok: Array<TokenMetadata>}).Ok[0], {
        transferred_at: [],
        transferred_by: [],
        owner: [johnIdentity.getPrincipal()],
        operator: [custodianIdentity.getPrincipal()],
        properties: [["D", {TextContent: "∆≈ç√∫"}]],
        is_burned: false,
        approved_by: [johnIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(4),
        minted_by: custodianIdentity.getPrincipal()
      });
    }
  );

  // verify operatorTokenMetadata
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_metadata(custodianIdentity.getPrincipal())))
  ).forEach(result => {
    t.true("Ok" in result);
    t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 4);
    t.like(
      (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(1)),
      {
        transferred_at: [],
        transferred_by: [],
        owner: [aliceIdentity.getPrincipal()],
        operator: [custodianIdentity.getPrincipal()],
        properties: [["A", {Nat64Content: BigInt(9999)}]],
        is_burned: false,
        approved_by: [aliceIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(1),
        minted_by: custodianIdentity.getPrincipal()
      }
    );
    t.like(
      (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(2)),
      {
        transferred_at: [],
        transferred_by: [],
        owner: [aliceIdentity.getPrincipal()],
        operator: [custodianIdentity.getPrincipal()],
        properties: [["B", {Int64Content: BigInt(1234)}]],
        is_burned: false,
        approved_by: [aliceIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(2),
        minted_by: custodianIdentity.getPrincipal()
      }
    );
    t.like(
      (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(3)),
      {
        transferred_at: [],
        transferred_by: [],
        owner: [bobIdentity.getPrincipal()],
        operator: [custodianIdentity.getPrincipal()],
        properties: [["C", {Int32Content: 5678}]],
        is_burned: false,
        approved_by: [bobIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(3),
        minted_by: custodianIdentity.getPrincipal()
      }
    );
    t.like(
      (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(4)),
      {
        transferred_at: [],
        transferred_by: [],
        owner: [johnIdentity.getPrincipal()],
        operator: [custodianIdentity.getPrincipal()],
        properties: [["D", {TextContent: "∆≈ç√∫"}]],
        is_burned: false,
        approved_by: [johnIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(4),
        minted_by: custodianIdentity.getPrincipal()
      }
    );
  });

  // verify operatorTokenIdentifiers
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_identifiers(custodianIdentity.getPrincipal())))
  ).forEach(result => {
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(1)));
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(2)));
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(3)));
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(4)));
  });
});

test.serial("error on querying old operator information.", async t => {
  // operatorTokenMetadata error when non-existed operator
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_metadata(aliceIdentity.getPrincipal())))
  ).forEach(result => {
    t.deepEqual(result, {Err: {OperatorNotFound: null}});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_token_metadata(bobIdentity.getPrincipal())))).forEach(
    result => {
      t.deepEqual(result, {Err: {OperatorNotFound: null}});
    }
  );
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_metadata(johnIdentity.getPrincipal())))
  ).forEach(result => {
    t.deepEqual(result, {Err: {OperatorNotFound: null}});
  });

  // operatorTokenIdentifiers error when non-existed operator
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_identifiers(aliceIdentity.getPrincipal())))
  ).forEach(result => {
    t.deepEqual(result, {Err: {OperatorNotFound: null}});
  });
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_identifiers(bobIdentity.getPrincipal())))
  ).forEach(result => {
    t.deepEqual(result, {Err: {OperatorNotFound: null}});
  });
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_identifiers(johnIdentity.getPrincipal())))
  ).forEach(result => {
    t.deepEqual(result, {Err: {OperatorNotFound: null}});
  });
});

test.serial("error on self transferFrom.", async t => {
  t.deepEqual(
    await custodianActor.dip721_transfer_from(
      custodianIdentity.getPrincipal(),
      custodianIdentity.getPrincipal(),
      BigInt(1)
    ),
    {
      Err: {SelfTransfer: null}
    }
  );
  t.deepEqual(
    await aliceActor.dip721_transfer_from(aliceIdentity.getPrincipal(), aliceIdentity.getPrincipal(), BigInt(2)),
    {
      Err: {SelfTransfer: null}
    }
  );
  t.deepEqual(await bobActor.dip721_transfer_from(bobIdentity.getPrincipal(), bobIdentity.getPrincipal(), BigInt(3)), {
    Err: {SelfTransfer: null}
  });
  t.deepEqual(
    await johnActor.dip721_transfer_from(johnIdentity.getPrincipal(), johnIdentity.getPrincipal(), BigInt(4)),
    {
      Err: {SelfTransfer: null}
    }
  );
});

// invalid owner
test.serial("error on unauthorized owner when calling transferFrom.", async t => {
  t.deepEqual(
    await custodianActor.dip721_transfer_from(
      custodianIdentity.getPrincipal(),
      aliceIdentity.getPrincipal(),
      BigInt(1)
    ),
    {
      Err: {UnauthorizedOwner: null}
    }
  );
  t.deepEqual(
    await aliceActor.dip721_transfer_from(custodianIdentity.getPrincipal(), aliceIdentity.getPrincipal(), BigInt(2)),
    {
      Err: {UnauthorizedOwner: null}
    }
  );
  t.deepEqual(
    await bobActor.dip721_transfer_from(custodianIdentity.getPrincipal(), bobIdentity.getPrincipal(), BigInt(3)),
    {
      Err: {UnauthorizedOwner: null}
    }
  );
  t.deepEqual(
    await johnActor.dip721_transfer_from(custodianIdentity.getPrincipal(), johnIdentity.getPrincipal(), BigInt(4)),
    {
      Err: {UnauthorizedOwner: null}
    }
  );
});

// invalid operator
test.serial("error on unauthorized operator when calling transferFrom.", async t => {
  t.deepEqual(
    await bobActor.dip721_transfer_from(aliceIdentity.getPrincipal(), custodianIdentity.getPrincipal(), BigInt(1)),
    {
      Err: {UnauthorizedOperator: null}
    }
  );
  t.deepEqual(
    await bobActor.dip721_transfer_from(aliceIdentity.getPrincipal(), custodianIdentity.getPrincipal(), BigInt(2)),
    {
      Err: {UnauthorizedOperator: null}
    }
  );
  t.deepEqual(
    await johnActor.dip721_transfer_from(bobIdentity.getPrincipal(), custodianIdentity.getPrincipal(), BigInt(3)),
    {
      Err: {UnauthorizedOperator: null}
    }
  );
  t.deepEqual(
    await aliceActor.dip721_transfer_from(johnIdentity.getPrincipal(), custodianIdentity.getPrincipal(), BigInt(4)),
    {
      Err: {UnauthorizedOperator: null}
    }
  );
});

test.serial("transferFrom.", async t => {
  t.deepEqual(
    await custodianActor.dip721_transfer_from(
      aliceIdentity.getPrincipal(),
      custodianIdentity.getPrincipal(),
      BigInt(1)
    ),
    {
      Ok: BigInt(12)
    }
  );
  t.deepEqual(
    await custodianActor.dip721_transfer_from(
      aliceIdentity.getPrincipal(),
      custodianIdentity.getPrincipal(),
      BigInt(2)
    ),
    {
      Ok: BigInt(13)
    }
  );
  t.deepEqual(
    await custodianActor.dip721_transfer_from(bobIdentity.getPrincipal(), custodianIdentity.getPrincipal(), BigInt(3)),
    {
      Ok: BigInt(14)
    }
  );
  t.deepEqual(
    await custodianActor.dip721_transfer_from(johnIdentity.getPrincipal(), aliceIdentity.getPrincipal(), BigInt(4)),
    {
      Ok: BigInt(15)
    }
  );
});

test.serial("verify transactions after transferFrom.", async t => {
  const txns = await testTxns([
    {
      id: "12",
      tx: {
        caller: custodianIdentity.getPrincipal(),
        operation: "transferFrom",
        details: {
          owner: {Principal: aliceIdentity.getPrincipal()},
          to: {Principal: custodianIdentity.getPrincipal()},
          token_identifier: {Text: "1"}
        }
      }
    },
    {
      id: "13",
      tx: {
        caller: custodianIdentity.getPrincipal(),
        operation: "transferFrom",
        details: {
          owner: {Principal: aliceIdentity.getPrincipal()},
          to: {Principal: custodianIdentity.getPrincipal()},
          token_identifier: {Text: "2"}
        }
      }
    },
    {
      id: "14",
      tx: {
        caller: custodianIdentity.getPrincipal(),
        operation: "transferFrom",
        details: {
          owner: {Principal: bobIdentity.getPrincipal()},
          to: {Principal: custodianIdentity.getPrincipal()},
          token_identifier: {Text: "3"}
        }
      }
    },
    {
      id: "15",
      tx: {
        caller: custodianIdentity.getPrincipal(),
        operation: "transferFrom",
        details: {
          owner: {Principal: johnIdentity.getPrincipal()},
          to: {Principal: aliceIdentity.getPrincipal()},
          token_identifier: {Text: "4"}
        }
      }
    }
  ]);

  txns.map(({txResp, tx}) => {
    t.like(txResp, tx);
  });
});

test.serial("verify stats after transferFrom.", async t => {
  // verify totalTransactions
  (await Promise.all(allActors.map(actor => actor.dip721_total_transactions()))).forEach(result => {
    t.is(result, BigInt(16));
  });

  // verify totalSupply
  (await Promise.all(allActors.map(actor => actor.dip721_total_supply()))).forEach(result => {
    t.is(result, BigInt(4));
  });

  // verify cycles
  (await Promise.all(allActors.map(actor => actor.dip721_cycles()))).forEach(result => {
    t.truthy(result);
  });

  // verify totalUniqueHolders
  (await Promise.all(allActors.map(actor => actor.dip721_total_unique_holders()))).forEach(result => {
    t.is(result, BigInt(2));
  });

  // verify stats
  (await Promise.all(allActors.map(actor => actor.dip721_stats()))).forEach(result => {
    t.truthy(result.cycles);
    t.is(result.total_transactions, BigInt(16));
    t.is(result.total_supply, BigInt(4));
    t.is(result.total_unique_holders, BigInt(2));
  });
});

test.serial("verify transferFrom information.", async t => {
  // verify balanceOf
  (await Promise.all(allActors.map(actor => actor.dip721_balance_of(aliceIdentity.getPrincipal())))).forEach(result => {
    t.deepEqual(result, {Ok: BigInt(1)});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_balance_of(custodianIdentity.getPrincipal())))).forEach(
    result => {
      t.deepEqual(result, {Ok: BigInt(3)});
    }
  );

  // verify ownerOf
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(1))))).forEach(result => {
    t.deepEqual(result, {Ok: [custodianIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(2))))).forEach(result => {
    t.deepEqual(result, {Ok: [custodianIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(3))))).forEach(result => {
    t.deepEqual(result, {Ok: [custodianIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(4))))).forEach(result => {
    t.deepEqual(result, {Ok: [aliceIdentity.getPrincipal()]});
  });

  // verify operatorOf
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(1))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(2))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(3))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(4))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });

  // verify token
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(1))))).forEach(result => {
    t.like(result, {
      Ok: {
        owner: [custodianIdentity.getPrincipal()],
        operator: [],
        properties: [["A", {Nat64Content: BigInt(9999)}]],
        is_burned: false,
        approved_by: [aliceIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(1),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [custodianIdentity.getPrincipal()]
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(2))))).forEach(result => {
    t.like(result, {
      Ok: {
        owner: [custodianIdentity.getPrincipal()],
        operator: [],
        properties: [["B", {Int64Content: BigInt(1234)}]],
        is_burned: false,
        approved_by: [aliceIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(2),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [custodianIdentity.getPrincipal()]
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(3))))).forEach(result => {
    t.like(result, {
      Ok: {
        owner: [custodianIdentity.getPrincipal()],
        operator: [],
        properties: [["C", {Int32Content: 5678}]],
        is_burned: false,
        approved_by: [bobIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(3),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [custodianIdentity.getPrincipal()]
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(4))))).forEach(result => {
    t.like(result, {
      Ok: {
        owner: [aliceIdentity.getPrincipal()],
        operator: [],
        properties: [["D", {TextContent: "∆≈ç√∫"}]],
        is_burned: false,
        approved_by: [johnIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(4),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [custodianIdentity.getPrincipal()]
      }
    });
  });

  // verify ownerTokenMetadata
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(aliceIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 1);
      t.like((result as {Ok: Array<TokenMetadata>}).Ok[0], {
        owner: [aliceIdentity.getPrincipal()],
        operator: [],
        properties: [["D", {TextContent: "∆≈ç√∫"}]],
        is_burned: false,
        approved_by: [johnIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(4),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [custodianIdentity.getPrincipal()]
      });
    }
  );
  (
    await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(custodianIdentity.getPrincipal())))
  ).forEach(result => {
    t.true("Ok" in result);
    t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 3);
    t.like(
      (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(1)),
      {
        owner: [custodianIdentity.getPrincipal()],
        operator: [],
        properties: [["A", {Nat64Content: BigInt(9999)}]],
        is_burned: false,
        approved_by: [aliceIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(1),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [custodianIdentity.getPrincipal()]
      }
    );
    t.like(
      (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(2)),
      {
        owner: [custodianIdentity.getPrincipal()],
        operator: [],
        properties: [["B", {Int64Content: BigInt(1234)}]],
        is_burned: false,
        approved_by: [aliceIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(2),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [custodianIdentity.getPrincipal()]
      }
    );
    t.like(
      (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(3)),
      {
        owner: [custodianIdentity.getPrincipal()],
        operator: [],
        properties: [["C", {Int32Content: 5678}]],
        is_burned: false,
        approved_by: [bobIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(3),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [custodianIdentity.getPrincipal()]
      }
    );
  });

  // verify ownerTokenIdentifiers
  (
    await Promise.all(allActors.map(actor => actor.dip721_owner_token_identifiers(aliceIdentity.getPrincipal())))
  ).forEach(result => {
    t.deepEqual(result, {Ok: [BigInt(4)]});
  });
  (
    await Promise.all(allActors.map(actor => actor.dip721_owner_token_identifiers(custodianIdentity.getPrincipal())))
  ).forEach(result => {
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(1)));
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(2)));
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(3)));
  });
});

test.serial("error on self transfer.", async t => {
  t.deepEqual(await custodianActor.dip721_transfer(custodianIdentity.getPrincipal(), BigInt(1)), {
    Err: {SelfTransfer: null}
  });
  t.deepEqual(await aliceActor.dip721_transfer(aliceIdentity.getPrincipal(), BigInt(2)), {
    Err: {SelfTransfer: null}
  });
  t.deepEqual(await bobActor.dip721_transfer(bobIdentity.getPrincipal(), BigInt(3)), {
    Err: {SelfTransfer: null}
  });
  t.deepEqual(await johnActor.dip721_transfer(johnIdentity.getPrincipal(), BigInt(4)), {
    Err: {SelfTransfer: null}
  });
});

// invalid owner
test.serial("error on unauthorized owner when calling transfer.", async t => {
  t.deepEqual(await aliceActor.dip721_transfer(custodianIdentity.getPrincipal(), BigInt(1)), {
    Err: {UnauthorizedOwner: null}
  });
  t.deepEqual(await aliceActor.dip721_transfer(custodianIdentity.getPrincipal(), BigInt(2)), {
    Err: {UnauthorizedOwner: null}
  });
  t.deepEqual(await bobActor.dip721_transfer(custodianIdentity.getPrincipal(), BigInt(3)), {
    Err: {UnauthorizedOwner: null}
  });
  t.deepEqual(await johnActor.dip721_transfer(custodianIdentity.getPrincipal(), BigInt(4)), {
    Err: {UnauthorizedOwner: null}
  });
});

test.serial("transfer.", async t => {
  t.deepEqual(await custodianActor.dip721_transfer(johnIdentity.getPrincipal(), BigInt(1)), {
    Ok: BigInt(16)
  });
  t.deepEqual(await custodianActor.dip721_transfer(johnIdentity.getPrincipal(), BigInt(2)), {
    Ok: BigInt(17)
  });
  t.deepEqual(await custodianActor.dip721_transfer(bobIdentity.getPrincipal(), BigInt(3)), {
    Ok: BigInt(18)
  });
  t.deepEqual(await aliceActor.dip721_transfer(bobIdentity.getPrincipal(), BigInt(4)), {
    Ok: BigInt(19)
  });
});

test.serial("verify transactions after transfer.", async t => {
  const txns = await testTxns([
    {
      id: "16",
      tx: {
        caller: custodianIdentity.getPrincipal(),
        operation: "transfer",
        details: {
          to: {Principal: johnIdentity.getPrincipal()},
          token_identifier: {Text: "1"}
        }
      }
    },
    {
      id: "17",
      tx: {
        caller: custodianIdentity.getPrincipal(),
        operation: "transfer",
        details: {
          to: {Principal: johnIdentity.getPrincipal()},
          token_identifier: {Text: "2"}
        }
      }
    },
    {
      id: "18",
      tx: {
        caller: custodianIdentity.getPrincipal(),
        operation: "transfer",
        details: {
          to: {Principal: bobIdentity.getPrincipal()},
          token_identifier: {Text: "3"}
        }
      }
    },
    {
      id: "19",
      tx: {
        caller: aliceIdentity.getPrincipal(),
        operation: "transfer",
        details: {
          to: {Principal: bobIdentity.getPrincipal()},
          token_identifier: {Text: "4"}
        }
      }
    }
  ]);

  txns.map(({txResp, tx}) => {
    t.like(txResp, tx);
  });
});

test.serial("verify stats after transfer.", async t => {
  // verify totalTransactions
  (await Promise.all(allActors.map(actor => actor.dip721_total_transactions()))).forEach(result => {
    t.is(result, BigInt(20));
  });

  // verify totalSupply
  (await Promise.all(allActors.map(actor => actor.dip721_total_supply()))).forEach(result => {
    t.is(result, BigInt(4));
  });

  // verify cycles
  (await Promise.all(allActors.map(actor => actor.dip721_cycles()))).forEach(result => {
    t.truthy(result);
  });

  // verify totalUniqueHolders
  (await Promise.all(allActors.map(actor => actor.dip721_total_unique_holders()))).forEach(result => {
    t.is(result, BigInt(2));
  });

  // verify stats
  (await Promise.all(allActors.map(actor => actor.dip721_stats()))).forEach(result => {
    t.truthy(result.cycles);
    t.is(result.total_transactions, BigInt(20));
    t.is(result.total_supply, BigInt(4));
    t.is(result.total_unique_holders, BigInt(2));
  });
});

test.serial("verify transfer information.", async t => {
  // verify balanceOf
  (await Promise.all(allActors.map(actor => actor.dip721_balance_of(bobIdentity.getPrincipal())))).forEach(result => {
    t.deepEqual(result, {Ok: BigInt(2)});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_balance_of(johnIdentity.getPrincipal())))).forEach(result => {
    t.deepEqual(result, {Ok: BigInt(2)});
  });

  // verify ownerOf
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(1))))).forEach(result => {
    t.deepEqual(result, {Ok: [johnIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(2))))).forEach(result => {
    t.deepEqual(result, {Ok: [johnIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(3))))).forEach(result => {
    t.deepEqual(result, {Ok: [bobIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(4))))).forEach(result => {
    t.deepEqual(result, {Ok: [bobIdentity.getPrincipal()]});
  });

  // verify operatorOf
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(1))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(2))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(3))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(4))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });

  // verify token
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(1))))).forEach(result => {
    t.like(result, {
      Ok: {
        owner: [johnIdentity.getPrincipal()],
        operator: [],
        properties: [["A", {Nat64Content: BigInt(9999)}]],
        is_burned: false,
        approved_by: [aliceIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(1),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [custodianIdentity.getPrincipal()]
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(2))))).forEach(result => {
    t.like(result, {
      Ok: {
        owner: [johnIdentity.getPrincipal()],
        operator: [],
        properties: [["B", {Int64Content: BigInt(1234)}]],
        is_burned: false,
        approved_by: [aliceIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(2),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [custodianIdentity.getPrincipal()]
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(3))))).forEach(result => {
    t.like(result, {
      Ok: {
        owner: [bobIdentity.getPrincipal()],
        operator: [],
        properties: [["C", {Int32Content: 5678}]],
        is_burned: false,
        approved_by: [bobIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(3),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [custodianIdentity.getPrincipal()]
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(4))))).forEach(result => {
    t.like(result, {
      Ok: {
        owner: [bobIdentity.getPrincipal()],
        operator: [],
        properties: [["D", {TextContent: "∆≈ç√∫"}]],
        is_burned: false,
        approved_by: [johnIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(4),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [aliceIdentity.getPrincipal()]
      }
    });
  });

  // verify ownerTokenMetadata
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(johnIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 2);
      t.like(
        (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(1)),
        {
          owner: [johnIdentity.getPrincipal()],
          operator: [],
          properties: [["A", {Nat64Content: BigInt(9999)}]],
          is_burned: false,
          approved_by: [aliceIdentity.getPrincipal()],
          burned_by: [],
          burned_at: [],
          token_identifier: BigInt(1),
          minted_by: custodianIdentity.getPrincipal(),
          transferred_by: [custodianIdentity.getPrincipal()]
        }
      );
      t.like(
        (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(2)),
        {
          owner: [johnIdentity.getPrincipal()],
          operator: [],
          properties: [["B", {Int64Content: BigInt(1234)}]],
          is_burned: false,
          approved_by: [aliceIdentity.getPrincipal()],
          burned_by: [],
          burned_at: [],
          token_identifier: BigInt(2),
          minted_by: custodianIdentity.getPrincipal(),
          transferred_by: [custodianIdentity.getPrincipal()]
        }
      );
    }
  );
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(bobIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 2);
      t.like(
        (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(3)),
        {
          owner: [bobIdentity.getPrincipal()],
          operator: [],
          properties: [["C", {Int32Content: 5678}]],
          is_burned: false,
          approved_by: [bobIdentity.getPrincipal()],
          burned_by: [],
          burned_at: [],
          token_identifier: BigInt(3),
          minted_by: custodianIdentity.getPrincipal(),
          transferred_by: [custodianIdentity.getPrincipal()]
        }
      );
      t.like(
        (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(4)),
        {
          owner: [bobIdentity.getPrincipal()],
          operator: [],
          properties: [["D", {TextContent: "∆≈ç√∫"}]],
          is_burned: false,
          approved_by: [johnIdentity.getPrincipal()],
          burned_by: [],
          burned_at: [],
          token_identifier: BigInt(4),
          minted_by: custodianIdentity.getPrincipal(),
          transferred_by: [aliceIdentity.getPrincipal()]
        }
      );
    }
  );

  // verify ownerTokenIdentifiers
  (
    await Promise.all(allActors.map(actor => actor.dip721_owner_token_identifiers(johnIdentity.getPrincipal())))
  ).forEach(result => {
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(1)));
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(2)));
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_identifiers(bobIdentity.getPrincipal())))).forEach(
    result => {
      t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(3)));
      t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(4)));
    }
  );
});

test.serial("setApprovalForAll(true).", async t => {
  t.deepEqual(await bobActor.dip721_set_approval_for_all(johnIdentity.getPrincipal(), true), {Ok: BigInt(20)});
  t.deepEqual(await johnActor.dip721_set_approval_for_all(bobIdentity.getPrincipal(), true), {Ok: BigInt(21)});

  // verify isApprovedForAll
  (
    await Promise.all([
      ...allActors.map(actor =>
        actor.dip721_is_approved_for_all(bobIdentity.getPrincipal(), johnIdentity.getPrincipal())
      ),
      ...allActors.map(actor =>
        actor.dip721_is_approved_for_all(johnIdentity.getPrincipal(), bobIdentity.getPrincipal())
      )
    ])
  ).forEach(result => t.deepEqual(result, {Ok: true}));
});

test.serial("verify transactions after SetApprovalForAll(true).", async t => {
  const txns = await testTxns([
    {
      id: "20",
      tx: {
        caller: bobIdentity.getPrincipal(),
        operation: "setApprovalForAll",
        details: {
          operator: {Principal: johnIdentity.getPrincipal()},
          is_approved: {True: null}
        }
      }
    },
    {
      id: "21",
      tx: {
        caller: johnIdentity.getPrincipal(),
        operation: "setApprovalForAll",
        details: {
          operator: {Principal: bobIdentity.getPrincipal()},
          is_approved: {True: null}
        }
      }
    }
  ]);

  txns.map(({txResp, tx}) => {
    t.like(txResp, tx);
  });
});

test.serial("verify stats after setApprovalForAll(true).", async t => {
  // verify totalTransactions
  (await Promise.all(allActors.map(actor => actor.dip721_total_transactions()))).forEach(result => {
    t.is(result, BigInt(22));
  });

  // verify totalSupply
  (await Promise.all(allActors.map(actor => actor.dip721_total_supply()))).forEach(result => {
    t.is(result, BigInt(4));
  });

  // verify cycles
  (await Promise.all(allActors.map(actor => actor.dip721_cycles()))).forEach(result => {
    t.truthy(result);
  });

  // verify totalUniqueHolders
  (await Promise.all(allActors.map(actor => actor.dip721_total_unique_holders()))).forEach(result => {
    t.is(result, BigInt(2));
  });

  // verify stats
  (await Promise.all(allActors.map(actor => actor.dip721_stats()))).forEach(result => {
    t.truthy(result.cycles);
    t.is(result.total_transactions, BigInt(22));
    t.is(result.total_supply, BigInt(4));
    t.is(result.total_unique_holders, BigInt(2));
  });
});

test.serial("verify setApprovalForAll(true) information.", async t => {
  // verify balanceOf
  (await Promise.all(allActors.map(actor => actor.dip721_balance_of(bobIdentity.getPrincipal())))).forEach(result => {
    t.deepEqual(result, {Ok: BigInt(2)});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_balance_of(johnIdentity.getPrincipal())))).forEach(result => {
    t.deepEqual(result, {Ok: BigInt(2)});
  });

  // verify ownerOf
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(1))))).forEach(result => {
    t.deepEqual(result, {Ok: [johnIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(2))))).forEach(result => {
    t.deepEqual(result, {Ok: [johnIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(3))))).forEach(result => {
    t.deepEqual(result, {Ok: [bobIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(4))))).forEach(result => {
    t.deepEqual(result, {Ok: [bobIdentity.getPrincipal()]});
  });

  // verify operatorOf
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(1))))).forEach(result => {
    t.deepEqual(result, {Ok: [bobIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(2))))).forEach(result => {
    t.deepEqual(result, {Ok: [bobIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(3))))).forEach(result => {
    t.deepEqual(result, {Ok: [johnIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(4))))).forEach(result => {
    t.deepEqual(result, {Ok: [johnIdentity.getPrincipal()]});
  });

  // verify token
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(1))))).forEach(result => {
    t.like(result, {
      Ok: {
        owner: [johnIdentity.getPrincipal()],
        operator: [bobIdentity.getPrincipal()],
        properties: [["A", {Nat64Content: BigInt(9999)}]],
        is_burned: false,
        approved_by: [johnIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(1),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [custodianIdentity.getPrincipal()]
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(2))))).forEach(result => {
    t.like(result, {
      Ok: {
        owner: [johnIdentity.getPrincipal()],
        operator: [bobIdentity.getPrincipal()],
        properties: [["B", {Int64Content: BigInt(1234)}]],
        is_burned: false,
        approved_by: [johnIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(2),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [custodianIdentity.getPrincipal()]
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(3))))).forEach(result => {
    t.like(result, {
      Ok: {
        owner: [bobIdentity.getPrincipal()],
        operator: [johnIdentity.getPrincipal()],
        properties: [["C", {Int32Content: 5678}]],
        is_burned: false,
        approved_by: [bobIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(3),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [custodianIdentity.getPrincipal()]
      }
    });
  });
  (await Promise.all(allActors.map(actor => actor.dip721_token_metadata(BigInt(4))))).forEach(result => {
    t.like(result, {
      Ok: {
        owner: [bobIdentity.getPrincipal()],
        operator: [johnIdentity.getPrincipal()],
        properties: [["D", {TextContent: "∆≈ç√∫"}]],
        is_burned: false,
        approved_by: [bobIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(4),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [aliceIdentity.getPrincipal()]
      }
    });
  });

  // verify ownerTokenMetadata
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(johnIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 2);
      t.like(
        (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(1)),
        {
          owner: [johnIdentity.getPrincipal()],
          operator: [bobIdentity.getPrincipal()],
          properties: [["A", {Nat64Content: BigInt(9999)}]],
          is_burned: false,
          approved_by: [johnIdentity.getPrincipal()],
          burned_by: [],
          burned_at: [],
          token_identifier: BigInt(1),
          minted_by: custodianIdentity.getPrincipal(),
          transferred_by: [custodianIdentity.getPrincipal()]
        }
      );
      t.like(
        (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(2)),
        {
          owner: [johnIdentity.getPrincipal()],
          operator: [bobIdentity.getPrincipal()],
          properties: [["B", {Int64Content: BigInt(1234)}]],
          is_burned: false,
          approved_by: [johnIdentity.getPrincipal()],
          burned_by: [],
          burned_at: [],
          token_identifier: BigInt(2),
          minted_by: custodianIdentity.getPrincipal(),
          transferred_by: [custodianIdentity.getPrincipal()]
        }
      );
    }
  );
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_metadata(bobIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 2);
      t.like(
        (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(3)),
        {
          owner: [bobIdentity.getPrincipal()],
          operator: [johnIdentity.getPrincipal()],
          properties: [["C", {Int32Content: 5678}]],
          is_burned: false,
          approved_by: [bobIdentity.getPrincipal()],
          burned_by: [],
          burned_at: [],
          token_identifier: BigInt(3),
          minted_by: custodianIdentity.getPrincipal(),
          transferred_by: [custodianIdentity.getPrincipal()]
        }
      );
      t.like(
        (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(4)),
        {
          owner: [bobIdentity.getPrincipal()],
          operator: [johnIdentity.getPrincipal()],
          properties: [["D", {TextContent: "∆≈ç√∫"}]],
          is_burned: false,
          approved_by: [bobIdentity.getPrincipal()],
          burned_by: [],
          burned_at: [],
          token_identifier: BigInt(4),
          minted_by: custodianIdentity.getPrincipal(),
          transferred_by: [aliceIdentity.getPrincipal()]
        }
      );
    }
  );

  // verify ownerTokenIdentifiers
  (
    await Promise.all(allActors.map(actor => actor.dip721_owner_token_identifiers(johnIdentity.getPrincipal())))
  ).forEach(result => {
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(1)));
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(2)));
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_identifiers(bobIdentity.getPrincipal())))).forEach(
    result => {
      t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(3)));
      t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(4)));
    }
  );

  // verify operatorTokenMetadata
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_metadata(johnIdentity.getPrincipal())))
  ).forEach(result => {
    t.true("Ok" in result);
    t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 2);
    t.like(
      (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(4)),
      {
        owner: [bobIdentity.getPrincipal()],
        operator: [johnIdentity.getPrincipal()],
        properties: [["D", {TextContent: "∆≈ç√∫"}]],
        is_burned: false,
        approved_by: [bobIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(4),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [aliceIdentity.getPrincipal()]
      }
    );
    t.like(
      (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(3)),
      {
        owner: [bobIdentity.getPrincipal()],
        operator: [johnIdentity.getPrincipal()],
        properties: [["C", {Int32Content: 5678}]],
        is_burned: false,
        approved_by: [bobIdentity.getPrincipal()],
        burned_by: [],
        burned_at: [],
        token_identifier: BigInt(3),
        minted_by: custodianIdentity.getPrincipal(),
        transferred_by: [custodianIdentity.getPrincipal()]
      }
    );
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_token_metadata(bobIdentity.getPrincipal())))).forEach(
    result => {
      t.true("Ok" in result);
      t.is((result as {Ok: Array<TokenMetadata>}).Ok.length, 2);
      t.like(
        (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(2)),
        {
          owner: [johnIdentity.getPrincipal()],
          operator: [bobIdentity.getPrincipal()],
          properties: [["B", {Int64Content: BigInt(1234)}]],
          is_burned: false,
          approved_by: [johnIdentity.getPrincipal()],
          burned_by: [],
          burned_at: [],
          token_identifier: BigInt(2),
          minted_by: custodianIdentity.getPrincipal(),
          transferred_by: [custodianIdentity.getPrincipal()]
        }
      );
      t.like(
        (result as {Ok: Array<TokenMetadata>}).Ok.find(tokenMetadata => tokenMetadata.token_identifier === BigInt(1)),
        {
          owner: [johnIdentity.getPrincipal()],
          operator: [bobIdentity.getPrincipal()],
          properties: [["A", {Nat64Content: BigInt(9999)}]],
          is_burned: false,
          approved_by: [johnIdentity.getPrincipal()],
          burned_by: [],
          burned_at: [],
          token_identifier: BigInt(1),
          minted_by: custodianIdentity.getPrincipal(),
          transferred_by: [custodianIdentity.getPrincipal()]
        }
      );
    }
  );

  // verify operatorTokenIdentifiers
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_identifiers(johnIdentity.getPrincipal())))
  ).forEach(result => {
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(3)));
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(4)));
  });
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_identifiers(bobIdentity.getPrincipal())))
  ).forEach(result => {
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(1)));
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(2)));
  });
});

test.serial("error on self approve when setApprovalForAll.", async t => {
  t.deepEqual(await johnActor.dip721_set_approval_for_all(johnIdentity.getPrincipal(), true), {
    Err: {SelfApprove: null}
  });
  t.deepEqual(await bobActor.dip721_set_approval_for_all(bobIdentity.getPrincipal(), true), {Err: {SelfApprove: null}});
  t.deepEqual(await johnActor.dip721_set_approval_for_all(johnIdentity.getPrincipal(), false), {
    Err: {SelfApprove: null}
  });
  t.deepEqual(await bobActor.dip721_set_approval_for_all(bobIdentity.getPrincipal(), false), {
    Err: {SelfApprove: null}
  });
});

test.serial("setApprovalForAll(false).", async t => {
  t.deepEqual(await bobActor.dip721_set_approval_for_all(johnIdentity.getPrincipal(), false), {Ok: BigInt(22)});
  t.deepEqual(await johnActor.dip721_set_approval_for_all(bobIdentity.getPrincipal(), false), {Ok: BigInt(23)});

  // verify isApprovedForAll
  (
    await Promise.all([
      ...allActors.map(actor =>
        actor.dip721_is_approved_for_all(bobIdentity.getPrincipal(), johnIdentity.getPrincipal())
      ),
      ...allActors.map(actor =>
        actor.dip721_is_approved_for_all(johnIdentity.getPrincipal(), bobIdentity.getPrincipal())
      )
    ])
  ).forEach(result => t.deepEqual(result, {Ok: false}));
});

test.serial("verify transactions after SetApprovalForAll(false).", async t => {
  const txns = await testTxns([
    {
      id: "22",
      tx: {
        caller: bobIdentity.getPrincipal(),
        operation: "setApprovalForAll",
        details: {
          operator: {Principal: johnIdentity.getPrincipal()},
          is_approved: {False: null}
        }
      }
    },
    {
      id: "23",
      tx: {
        caller: johnIdentity.getPrincipal(),
        operation: "setApprovalForAll",
        details: {
          operator: {Principal: bobIdentity.getPrincipal()},
          is_approved: {False: null}
        }
      }
    }
  ]);

  txns.map(({txResp, tx}) => {
    t.like(txResp, tx);
  });
});

test.serial("verify stats after setApprovalForAll(false).", async t => {
  // verify totalTransactions
  (await Promise.all(allActors.map(actor => actor.dip721_total_transactions()))).forEach(result => {
    t.is(result, BigInt(24));
  });

  // verify totalSupply
  (await Promise.all(allActors.map(actor => actor.dip721_total_supply()))).forEach(result => {
    t.is(result, BigInt(4));
  });

  // verify cycles
  (await Promise.all(allActors.map(actor => actor.dip721_cycles()))).forEach(result => {
    t.truthy(result);
  });

  // verify totalUniqueHolders
  (await Promise.all(allActors.map(actor => actor.dip721_total_unique_holders()))).forEach(result => {
    t.is(result, BigInt(2));
  });

  // verify stats
  (await Promise.all(allActors.map(actor => actor.dip721_stats()))).forEach(result => {
    t.truthy(result.cycles);
    t.is(result.total_transactions, BigInt(24));
    t.is(result.total_supply, BigInt(4));
    t.is(result.total_unique_holders, BigInt(2));
  });
});

test.serial("verify setApprovalForAll(false) information.", async t => {
  // verify balanceOf
  (await Promise.all(allActors.map(actor => actor.dip721_balance_of(bobIdentity.getPrincipal())))).forEach(result => {
    t.deepEqual(result, {Ok: BigInt(2)});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_balance_of(johnIdentity.getPrincipal())))).forEach(result => {
    t.deepEqual(result, {Ok: BigInt(2)});
  });

  // verify ownerOf
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(1))))).forEach(result => {
    t.deepEqual(result, {Ok: [johnIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(2))))).forEach(result => {
    t.deepEqual(result, {Ok: [johnIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(3))))).forEach(result => {
    t.deepEqual(result, {Ok: [bobIdentity.getPrincipal()]});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_of(BigInt(4))))).forEach(result => {
    t.deepEqual(result, {Ok: [bobIdentity.getPrincipal()]});
  });

  // verify operatorOf
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(1))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(2))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(3))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });
  (await Promise.all(allActors.map(actor => actor.dip721_operator_of(BigInt(4))))).forEach(result => {
    t.deepEqual(result, {Ok: []});
  });

  // verify ownerTokenIdentifiers
  (
    await Promise.all(allActors.map(actor => actor.dip721_owner_token_identifiers(johnIdentity.getPrincipal())))
  ).forEach(result => {
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(1)));
    t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(2)));
  });
  (await Promise.all(allActors.map(actor => actor.dip721_owner_token_identifiers(bobIdentity.getPrincipal())))).forEach(
    result => {
      t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(3)));
      t.true((result as {Ok: Array<bigint>}).Ok.includes(BigInt(4)));
    }
  );
});

test.serial("error on query non-existed operator (operator removed from tokenMetadata).", async t => {
  // verify operatorTokenMetadata
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_metadata(johnIdentity.getPrincipal())))
  ).forEach(result => t.deepEqual(result, {Err: {OperatorNotFound: null}}));
  (await Promise.all(allActors.map(actor => actor.dip721_operator_token_metadata(bobIdentity.getPrincipal())))).forEach(
    result => t.deepEqual(result, {Err: {OperatorNotFound: null}})
  );

  // verify operatorTokenIdentifiers
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_identifiers(johnIdentity.getPrincipal())))
  ).forEach(result => t.deepEqual(result, {Err: {OperatorNotFound: null}}));
  (
    await Promise.all(allActors.map(actor => actor.dip721_operator_token_identifiers(bobIdentity.getPrincipal())))
  ).forEach(result => t.deepEqual(result, {Err: {OperatorNotFound: null}}));
});
