# Tokens

**WIP**

The current implementation supports both the EXT and the DIP-721 standards, however the
EXT standard support is only partial:
1. The current EXT standard only allows 1 asset per NFT. For this reason the mint, get metadata
functions of the EXT interface had to be disabled. The mint, get metadata features can only be
accessed using the DIP-721 interface which supports multiple assets per NFT.
2. The EXT standard allows transfering NFTs into subaccounts, which is intentionally not supported
by DIP-721. To avoid problems, the subaccount feature of EXT is permanently disabled.

---
**Roadmap**

priority #1 items are mandatory before we go live, all other items are optional

priority #1
1. add history support, either local history or cap

priority #2
1. write unit tests and javascript based tests (logic is heavily based on rollback, so don't use ic-kit)
2. follow up with ToniqLabs about https://github.com/Toniq-Labs/extendable-token/issues/9 and try
to convince them to include multiple asset support
3. ~~rename interface methods with attributes follow coding guidelines~~

priority #3
1. add support for ICP based fees
2. support allowances
3. ~~clean up warnings instead of surpressing them~~
4. group use declarations (also follow the style guide regarding imports)
5. remove explicit trapping in the code and support proper return values for errors
6. change get_mut to thread local variables according to latest dFinity suggestions


Please don't touch the files in the common's directory, they have been moved from the ic blockchain code with small modifications.
