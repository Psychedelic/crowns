### 0. Prepare Tools

Install dependencies

```bash
$ cd migrate
$ npm i
```

### 1. Backup Metadata

Result output as `01_backup_metadata.json` file

```bash
$ cd migrate
$ node 01_backup_metadata.js
```

### 2. Backup Owner

Result output as `02_backup_owner.json` file

```bash
$ cd migrate
$ node 02_backup_owner.js
```

### 3. Aggregate data and convert to v2 standard formatting

Result output as `03_aggregate.json` file

```bash
$ cd migrate
$ node 03_aggregate.js
```

### 4. Build & Upgrade the canister

Result as the canister with empty state

```bash
$ cd <ROOT_DIR>

# Recommended using docker to build the wasm
# Later it will help us easily to submit verification to `COVER`
$ docker build -t crown-container -f tools/dockerfile .
$ docker run --mount "type=bind,source=$(pwd),target=/canister" -it --rm crown-container

# inside docker
$docker <perform build stuff>

# upgrade
$ dfx canister --network ic install crowns --argument '(null)' -m reinstall
```

### 5. Migrate to v2 standard

Pushing data to the canister

```bash
$ cd migrate
$ SECRET=<CONTROLLER_PRIVATE_KEY> node 04_migrate.js
```

### 6. Verify metadata migration (Optional for testing)

Compare metadata between legacy canister with crown test canister

```bash
$ cd migrate
$ node 05_verify_metadata.js
```

### 7. Verify owner migration (Optional for testing)

Compare owner between legacy canister with crown test canister

```bash
$ cd migrate
$ node 06_verify_owner.js
```
