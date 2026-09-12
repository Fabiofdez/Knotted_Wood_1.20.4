import { Dir, Packs } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";
import { Common } from "@methods/Common";
import { SpriteMaker } from "@util/SpriteMaker";
import { Templates } from "@util/Templates";
import { Wood } from "@util/Wood";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

export const Fusion = {
  /** @param {WoodAssetsFusion} wood */
  updateWood(wood) {
    const hasVariants = WoodTypes.hasVariants(wood);
    setUpDirs(wood);

    Dir.makeTemp(`tmp/fusion/${wood.assetPath}`, async (dir) => {
      if (hasVariants) SpriteMaker.Fusion.updateVariantSprites(dir, wood);

      if (!Ctx.NEW_WOODS?.[wood.id]) return;

      await SpriteMaker.Fusion.collectNewAssets(dir, wood);

      if (hasVariants) {
        Templates.Fusion.VARIANTS.defineFor(wood);
      }
    });
  },

  updateAll() {
    const allWoods = [...WoodTypes.VANILLA, ...WoodTypes.REGIONS_UNEXPLORED];
    console.log(`Updating all ${allWoods.length} wood types...`);

    Dir.makeTemp(`${Ctx.WORK_DIR}/tmp/fusion/edges`, async (dir) => {
      await SpriteMaker.Fusion.updateWoodEdgeSprites(dir);
    });

    const woodAssets = allWoods.map((wood) => Wood.assetsFusion(wood));
    for (const wood of woodAssets) {
      Fusion.updateWood(wood);
    }
  },
};

/** @param {WoodAssetsFusion} wood */
function setUpDirs(wood) {
  if (!existsSync(wood.textures(Packs.FUSION))) {
    console.log(`Adding new '${wood.id}' wood type...`);
    execSync(`mkdir -p ${wood.textures(Packs.FUSION)}`);
  }

  Common.markToUpdate(wood);
}
