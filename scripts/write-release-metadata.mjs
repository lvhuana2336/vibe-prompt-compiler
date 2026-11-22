import fs from "node:fs/promises";
import path from "node:path";
import { measureDirectoryBytes } from "../electron/update-manager.mjs";

const [sourceDirectory, outputPath, version] = process.argv.slice(2);

if (!sourceDirectory || !outputPath || !version) {
  throw new Error(
    "Usage: node scripts/write-release-metadata.mjs <unpacked-dir> <output-json> <version>",
  );
}

const installedBytes = await measureDirectoryBytes(path.resolve(sourceDirectory));
const metadata = {
  schemaVersion: 1,
  version: version.replace(/^v/i, ""),
  installedBytes,
  generatedAt: new Date().toISOString(),
};

await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
await fs.writeFile(path.resolve(outputPath), `${JSON.stringify(metadata, null, 2)}\n`);
console.log(`Wrote ${outputPath}: ${metadata.version}, ${installedBytes} installed bytes`);
