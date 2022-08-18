import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export type GenericValue = { 'Nat64Content' : bigint } |
  { 'Nat32Content' : number } |
  { 'BoolContent' : boolean } |
  { 'Nat8Content' : number } |
  { 'Int64Content' : bigint } |
  { 'IntContent' : bigint } |
  { 'NatContent' : bigint } |
  { 'Nat16Content' : number } |
  { 'Int32Content' : number } |
  { 'Int8Content' : number } |
  { 'FloatContent' : number } |
  { 'Int16Content' : number } |
  { 'BlobContent' : Array<number> } |
  { 'NestedContent' : Vec } |
  { 'Principal' : Principal } |
  { 'TextContent' : string };
export interface InitArgs {
  'cap' : [] | [Principal],
  'logo' : [] | [string],
  'name' : [] | [string],
  'custodians' : [] | [Array<Principal>],
  'symbol' : [] | [string],
}
export interface ManualReply {
  'logo' : [] | [string],
  'name' : [] | [string],
  'created_at' : bigint,
  'upgraded_at' : bigint,
  'custodians' : Array<Principal>,
  'symbol' : [] | [string],
}
export type ManualReply_1 = { 'Ok' : Array<bigint> } |
  { 'Err' : NftError };
export type ManualReply_2 = { 'Ok' : Array<TokenMetadata> } |
  { 'Err' : NftError };
export type ManualReply_3 = { 'Ok' : TokenMetadata } |
  { 'Err' : NftError };
export type NftError = { 'UnauthorizedOperator' : null } |
  { 'SelfTransfer' : null } |
  { 'TokenNotFound' : null } |
  { 'UnauthorizedOwner' : null } |
  { 'SelfApprove' : null } |
  { 'OperatorNotFound' : null } |
  { 'ExistedNFT' : null } |
  { 'OwnerNotFound' : null };
export type Result = { 'Ok' : bigint } |
  { 'Err' : NftError };
export type Result_1 = { 'Ok' : boolean } |
  { 'Err' : NftError };
export type Result_2 = { 'Ok' : [] | [Principal] } |
  { 'Err' : NftError };
export interface Stats {
  'cycles' : bigint,
  'total_transactions' : bigint,
  'total_unique_holders' : bigint,
  'total_supply' : bigint,
}
export type SupportedInterface = { 'Mint' : null } |
  { 'Approval' : null };
export interface TokenMetadata {
  'transferred_at' : [] | [bigint],
  'transferred_by' : [] | [Principal],
  'owner' : [] | [Principal],
  'operator' : [] | [Principal],
  'approved_at' : [] | [bigint],
  'approved_by' : [] | [Principal],
  'properties' : Array<[string, GenericValue]>,
  'is_burned' : boolean,
  'token_identifier' : bigint,
  'burned_at' : [] | [bigint],
  'burned_by' : [] | [Principal],
  'minted_at' : bigint,
  'minted_by' : Principal,
}
export type Vec = Array<
  [
    string,
    { 'Nat64Content' : bigint } |
      { 'Nat32Content' : number } |
      { 'BoolContent' : boolean } |
      { 'Nat8Content' : number } |
      { 'Int64Content' : bigint } |
      { 'IntContent' : bigint } |
      { 'NatContent' : bigint } |
      { 'Nat16Content' : number } |
      { 'Int32Content' : number } |
      { 'Int8Content' : number } |
      { 'FloatContent' : number } |
      { 'Int16Content' : number } |
      { 'BlobContent' : Array<number> } |
      { 'NestedContent' : Vec } |
      { 'Principal' : Principal } |
      { 'TextContent' : string },
  ]
>;
export interface _SERVICE {
  'dfxInfo' : ActorMethod<[], string>,
  'dip721Approve' : ActorMethod<[Principal, bigint], Result>,
  'dip721BalanceOf' : ActorMethod<[Principal], Result>,
  'dip721Custodians' : ActorMethod<[], Array<Principal>>,
  'dip721Cycles' : ActorMethod<[], bigint>,
  'dip721IsApprovedForAll' : ActorMethod<[Principal, Principal], Result_1>,
  'dip721Logo' : ActorMethod<[], [] | [string]>,
  'dip721Metadata' : ActorMethod<[], ManualReply>,
  'dip721Mint' : ActorMethod<
    [Principal, bigint, Array<[string, GenericValue]>],
    Result,
  >,
  'dip721Name' : ActorMethod<[], [] | [string]>,
  'dip721OperatorOf' : ActorMethod<[bigint], Result_2>,
  'dip721OperatorTokenIdentifiers' : ActorMethod<[Principal], ManualReply_1>,
  'dip721OperatorTokenMetadata' : ActorMethod<[Principal], ManualReply_2>,
  'dip721OwnerOf' : ActorMethod<[bigint], Result_2>,
  'dip721OwnerTokenIdentifiers' : ActorMethod<[Principal], ManualReply_1>,
  'dip721OwnerTokenMetadata' : ActorMethod<[Principal], ManualReply_2>,
  'dip721SetApprovalForAll' : ActorMethod<[Principal, boolean], Result>,
  'dip721SetCustodians' : ActorMethod<[Array<Principal>], undefined>,
  'dip721SetLogo' : ActorMethod<[string], undefined>,
  'dip721SetName' : ActorMethod<[string], undefined>,
  'dip721SetSymbol' : ActorMethod<[string], undefined>,
  'dip721Stats' : ActorMethod<[], Stats>,
  'dip721SupportedInterfaces' : ActorMethod<[], Array<SupportedInterface>>,
  'dip721Symbol' : ActorMethod<[], [] | [string]>,
  'dip721TokenMetadata' : ActorMethod<[bigint], ManualReply_3>,
  'dip721TotalSupply' : ActorMethod<[], bigint>,
  'dip721TotalTransactions' : ActorMethod<[], bigint>,
  'dip721TotalUniqueHolders' : ActorMethod<[], bigint>,
  'dip721Transfer' : ActorMethod<[Principal, bigint], Result>,
  'dip721TransferFrom' : ActorMethod<[Principal, Principal, bigint], Result>,
  'gitCommitHash' : ActorMethod<[], string>,
  'rustToolchainInfo' : ActorMethod<[], string>,
}
