### 0. Prepare Tools

Install dependencies

```bash
$ cd migrate
$ npm i
```

### 1. Backup Metadata

Result output as `01_backup_metadata.json` file

```bash
$ node 01_backup_metadata.js
```

### 2. Backup Owner

Result output as `02_backup_owner.json` file

```bash
$ node 02_backup_owner.js
```

### 3. Aggregate data and convert to v2 standard formatting

Result output as `03_aggregate.json` file

```bash
$ node 03_aggregate.js
```

### 4. Migrate to v2 standard

Pushing data to the canister

```bash
$ SECRET=<CONTROLLER_PRIVATE_KEY> node 04_migrate.js
```
