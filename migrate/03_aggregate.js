import { readFileSync, writeFileSync } from "fs";

const metadataList = JSON.parse(readFileSync("./01_backup_metadata.json"));
const ownerList = JSON.parse(readFileSync("./02_backup_owner.json"));

const aggregate = metadataList.map((metadata, i) => ({
  id: String(metadata.tokenId),
  to: ownerList[i].ownerId,
  properties: metadata.properties.map((p) => [p.key, p.val]),
}));

for (let i = 0; i < aggregate.length; i++) {
  aggregate[i].properties.push([
    "thumbnail",
    {
      TextContent: aggregate[i].properties[4][1].TextContent.replace(
        /(.+.app\/)(.+\.).+/g,
        "$1thumbnails/$2png"
      ),
    },
  ]);
}

writeFileSync("03_aggregate.json", JSON.stringify(aggregate, null, 2));
