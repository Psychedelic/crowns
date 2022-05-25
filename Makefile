.PHONY: init candid build local stop-replica test format lint clean

LOCAL_CUSTODIAN_PRINCIPAL=$(shell dfx identity get-principal)
TEST_CUSTODIAN_PRINCIPAL=$(shell cat test/custodian-test-principal)
CAP_CANISTER_ID=rrkah-fqaaa-aaaaa-aaaaq-cai
export CARGO_NET_GIT_FETCH_WITH_CLI=true

init:
	npm --prefix test i
	cargo check

candid:
	cargo run > crowns.did
	didc bind -t ts crowns.did > test/factory/idl.d.ts
	echo "// @ts-nocheck" > test/factory/idl.ts
	didc bind -t js crowns.did >> test/factory/idl.ts

build: candid
	dfx ping local || dfx start --clean --background
	dfx canister create crowns
	dfx build crowns

local: build
	dfx deploy crowns --argument '(opt record{custodians=opt vec{principal"$(LOCAL_CUSTODIAN_PRINCIPAL)"; cap=opt principal"$(CAP_CANISTER_ID)"}})'

stop-replica:
	dfx stop

test: stop-replica build
	dfx canister install crowns --argument '(opt record{custodians=opt vec{principal"$(TEST_CUSTODIAN_PRINCIPAL)"; principal"$(LOCAL_CUSTODIAN_PRINCIPAL)"}; cap=opt principal"$(CAP_CANISTER_ID)"})'
	npm --prefix test t
	dfx stop

format:
	npm --prefix test run prettier
	npm --prefix test run lint
	cargo fmt --all

lint:
	npm --prefix test run prebuild
	cargo fmt --all -- --check
	cargo clippy --all-targets --all-features -- -D warnings -D clippy::all

clean:
	cargo clean
	npm --prefix test run clean
