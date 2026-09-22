import { copyFile, writeFile } from "node:fs/promises";
import { createThirdPartyNotices } from "./third-party-notices.mjs";

await copyFile(new URL("../LICENSE", import.meta.url), new URL("../dist/LICENSE.txt", import.meta.url));
await writeFile(new URL("../dist/THIRD-PARTY-NOTICES.txt", import.meta.url), await createThirdPartyNotices());
