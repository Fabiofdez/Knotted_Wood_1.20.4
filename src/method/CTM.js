import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";
import { Common } from "@methods/Common";
import { SpriteMaker } from "@util/SpriteMaker";
import { Templates } from "@util/Templates";
import { Wood, WoodFacts } from "@util/Wood";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

export const CTM = {
  /** @param {WoodAssetsCTM} wood */
  updateWood(wood) {
    const isStripped = WoodFacts.isStripped(wood);
    const hasVariants = WoodTypes.hasVariants(wood);
    setUpDirs(wood, isStripped, hasVariants);

    Dir.makeTemp(`tmp/ctm/${wood.assetPath}`, async (dir) => {
      if (hasVariants) await SpriteMaker.CTM.updateVariantSprites(dir, wood);

      if (!Ctx.NEW_WOODS?.[wood.id]) return removeDirs(wood);

      if (hasVariants) Templates.CTM.VARIANTS.defineFor(wood);
    });
  },

  updateAll() {
    const allWoods = [...WoodTypes.VANILLA, ...WoodTypes.REGIONS_UNEXPLORED];
    console.log(`Updating all ${allWoods.length} wood types...`);

    const woodAssets = allWoods.map((wood) => Wood.assetsCTM(wood));
    for (const wood of woodAssets) {
      CTM.updateWood(wood);
    }
  },
};

/**
 * @param {WoodAssetsCTM} wood
 * @param {boolean} isStripped
 * @param {boolean} makeVariants
 */
function setUpDirs(wood, isStripped, makeVariants) {
  const existingVariants = existsSync(wood.variantsDir);
  const existingTops = existsSync(wood.topsDir);

  if (makeVariants && !existingVariants && (isStripped || !existingTops)) {
    console.log(`Adding new '${wood.id}' wood type...`);
  }

  if (!existingVariants) {
    if (makeVariants) execSync(`mkdir -p ${wood.variantsDir}`);
  } else {
    if (!makeVariants && isStripped) execSync(`rm -rf ${wood.variantsDir}`);
  }

  if (!existingTops) {
    if (!isStripped) execSync(`mkdir -p ${wood.topsDir}`);
  } else {
    if (isStripped) execSync(`rm -rf ${wood.topsDir}`);
  }

  Common.markToUpdate(wood);
}

/** @param {WoodAssetsCTM} wood */
function removeDirs(wood) {
  if (existsSync(wood.variantsDir)) execSync(`rm -rf ${wood.variantsDir}`);
  if (existsSync(wood.topsDir)) execSync(`rm -rf ${wood.topsDir}`);
}
