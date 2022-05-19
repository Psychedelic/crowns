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

You can provide a list of user principals that will get an NFT.

```sh
USER_PRINCIPALS=["abcde-b64dz-nh6nr-7iqjo-z54h3-teeb3-7gzbn-6g6le-jmbok-a7b2f-lit", "zycz-iacec-blwhn-qymcu-i6zmt-c3ds5-hwqqs-g2j5u-ekp5m-3m26i-dif"] node mint-crowns.js
```

👆 Alternatively, create a .env and assign the list to a USER_PRINCIPALS environment variable (should be provided in a single line, no line breaks)

```sh
touch .env
```

The .env file content:

```sh
USER_PRINCIPALS='["abcde-b64dz-nh6nr-7iqjo-z54h3-teeb3-7gzbn-6g6le-jmbok-a7b2f-lit", "zycz-iacec-blwhn-qymcu-i6zmt-c3ds5-hwqqs-g2j5u-ekp5m-3m26i-dif"]'
```

# Troublehooting

## Failed to mint?

Make sure that the local replica is running, or if you have changed the host, and verify the Crowns canister id is correct by tweaking the settings file.

## Server returns "Too Many Requests" error?

The local replica can get overloaded, to prevent that from occurring you can tweak and increase the value of `chunkPromiseDelayMs` setting. By providing a longer delay between batch calls, will lessen the chances of getting the error.

## Failure when I provide the user principal list?

Make sure that the user principals are provided in a single line, so no line breaks and use a single quote to wrap it, e.g. '["aaaa-zzzz", "bbbb-cae", "fsdfsd-dssdds-cae"]'.