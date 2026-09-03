import { Dir } from "@const/Directories";

/** @satisfies {{ [k: string]: ZipInfo }} */
export const Zip = /** @type {const} */ ({
  Common: {
    packName: "pack-standalone.zip",
    include: ["assets/*/blockstates", "assets/*/models", "assets/*/textures"],
    exclude: [
      "assets/*/textures/block/*.png.mcmeta",
      `${Dir.models()}/block/wood_edges.json`,
    ],
    mcMeta: "default.pack.mcmeta",
  },

  CTM: {
    packName: "pack-standalone-ctm.zip",
    include: ["assets/minecraft/optifine"],
    mcMeta: "default.pack.mcmeta",
  },

  Fusion: {
    packName: "pack-standalone-fusion.zip",
    include: [
      "assets/*/textures/block/*_log.*",
      `${Dir.textures()}/block/wood_edges.*`,
    ],
    mcMeta: "fusion.pack.mcmeta",
  },
});
