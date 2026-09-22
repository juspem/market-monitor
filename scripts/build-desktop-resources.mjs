import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import { createThirdPartyNotices } from "./third-party-notices.mjs";

const svg = await readFile(new URL("../public/market-monitor.svg", import.meta.url), "utf8");
const png = new Resvg(svg, { fitTo: { mode: "width", value: 256 } }).render().asPng();
// Windows ICO supports an embedded 256px PNG image.
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);
await mkdir(new URL("../build/", import.meta.url), { recursive: true });
await writeFile(new URL("../build/icon.png", import.meta.url), png);
await writeFile(new URL("../build/icon.ico", import.meta.url), Buffer.concat([header, png]));

await writeFile(new URL("../build/THIRD-PARTY-NOTICES.txt", import.meta.url), await createThirdPartyNotices());
