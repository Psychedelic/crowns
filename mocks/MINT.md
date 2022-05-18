# 👑 Mint Crowns (mocks)

A script is provided to mint crowns for the local replica, follow the guide bellow to understand how use it.

Go to the `/crowns/mocks` path and install the npm dependencies (we'll use yarn for this guide but feel free to replace it with npm):

```sh
yarn install
```

Once ready, you can generate the mocks by running the script:

```sh
node mint-crown.js
```

The script will go through the aggregated data in Crowns v2 format (backup) and deploy it to your local replica, Crowns canister. There should be an attempt to mint 10k tokens.

If you'd like to limit the number of tokens, you can control the maximum number of chunks:

```sh
MAX_CHUNKS=1 node mint-crowns.js
```

# Troublehooting

## Failed to mint?

Make sure that the local replica is running, or if you have changed the host, and verify the Crowns canister id is correct by tweaking the settings file.