import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { readdir, readFile } from "fs/promises";
import { globSync } from "glob";
import looksSame from "looks-same";
import { extname } from "path";

const PACK_NAME = "Knotted_Wood_1.20.4.zip";

const EXISTING_WOOD_TYPES = [
  "acacia",
  "birch",
  "cherry",
  "dark_oak",
  "jungle",
  "mangrove",
  "oak",
  "spruce",
  "stripped_acacia",
  "stripped_birch",
  "stripped_cherry",
  "stripped_dark_oak",
  "stripped_jungle",
  "stripped_mangrove",
  "stripped_oak",
  "stripped_spruce",
];

const DIR = {
  ctm: "assets/minecraft/optifine/ctm",
  defaultSprites: "log-sprite-defaults",
  variantSprites: "log-spritesheet-variants",
  topSprites: "log-spritesheet-tops",
};

let WORK_DIR = "";
let DOWNLOADS = "";
let TEMPLATES_DIR = "";

function init() {
  WORK_DIR = getShellConst("WORKDIR");
  DOWNLOADS = getShellConst("DOWNLOADS");

  if (!WORK_DIR) {
    err("Shell variable 'WORKDIR' not defined");
    return;
  }
  if (!DOWNLOADS) {
    err("Shell variable 'DOWNLOADS' not defined");
    return;
  }
  const [nodePath, filePath, ...args] = process.argv;
  TEMPLATES_DIR = `${WORK_DIR}/knotted-wood-packer/templates`;
  argParse(args);
}

function err(msg = "") {
  console.error(`ERROR: ${msg}`);
}
function warn(msg = "") {
  console.log(`WARNING: ${msg}`);
}

function getShellConst(varName) {
  return execSync(`echo \$${varName}`).toLocaleString().trim();
}

function argParse(args) {
  const action = args[0];
  const woodType = args[1];

  switch (action) {
    case "add-log":
      if (!woodType) {
        err("Wood type must be provided");
        return;
      }
      addNewLog(woodType);
      break;
    case "update-log":
      if (!woodType) {
        err("Wood type must be provided");
        return;
      }
      console.log(`Updating ${woodType}...`);
      updateLog(woodType);
      break;
    case "update-all":
      updateAll();
      break;
    case "rezip":
      execSync(`cd ${WORK_DIR} && zip -9rq ${PACK_NAME} assets pack.*`);
      break;
    default:
      break;
  }
}

async function getDir(path = "") {
  let dirFound = false;
  let contents = [];

  await readdir(path)
    .then((res) => {
      dirFound = true;
      contents = res;
    })
    .catch((err) => {
      if (!err.path) throw err;
    });

  return {
    exists: dirFound,
    contents,
    path,
  };
}

/**
 * @typedef {ReturnType<getBlock>} Block
 * @param {string} woodType
 */
function getBlock(woodType) {
  const name = `${woodType}_log`;
  return {
    name,
    variantsDir: `${WORK_DIR}/${DIR.ctm}/${name}`,
    topsDir: `${WORK_DIR}/${DIR.ctm}/_overlays/${name}_top`,
  };
}

async function addNewLog(woodType) {
  const block = getBlock(woodType);
  console.log(`Adding new log ${block.name}...`);

  const variants = await getDir(block.variantsDir);
  const tops = await getDir(block.topsDir);

  if (variants.exists || tops.exists) {
    warn(`Wood type '${woodType}' already exists`);
  }
  if (!variants.exists) execSync(`mkdir ${block.variantsDir}`);
  if (!tops.exists) execSync(`mkdir ${block.topsDir}`);

  await updateProperties(block);
  updateAllSprites(block);
}

async function updateLog(woodType) {
  const block = getBlock(woodType);

  const variants = await getDir(block.variantsDir);
  const tops = await getDir(block.topsDir);

  if (!variants.exists || !tops.exists) {
    err(`Unknown wood type '${woodType}'`);
    return;
  }

  await updateProperties(block);
  updateAllSprites(block);
}

/** @param {Block} block */
async function updateProperties(block) {
  const blockProps = `${block.variantsDir}/${block.name}.properties`;
  const blockTopsProps = `${block.topsDir}/ctm.properties`;

  updateCtmOverlay(block);

  execSync(`cp ${TEMPLATES_DIR}/template_log.properties ${blockProps}`);
  execSync(`cp ${TEMPLATES_DIR}/top.ctm.properties ${blockTopsProps}`);

  readFile(blockProps)
    .then((buf) => buf.toLocaleString())
    .then((props) => props.replace(/TEMPLATE_LOG/g, block.name))
    .then((updated) => writeFileSync(blockProps, updated));

  readFile(blockTopsProps)
    .then((buf) => buf.toLocaleString())
    .then((props) => props.replace(/TEMPLATE_LOG/g, block.name))
    .then((updated) => writeFileSync(blockTopsProps, updated));
}

/** @param {Block} block */
function updateCtmOverlay(block) {
  const ctmOverlayDirs = globSync(
    `${WORK_DIR}/${DIR.ctm}/_overlays/logs*/ctm.properties`,
  );

  const AXES = {
    logs_x: "x",
    logs_y: "y",
    logs_z_horizontal: "z",
    logs_z_vertical: "z",
  };

  for (const propsPath of ctmOverlayDirs.sort()) {
    const overlayAxis = propsPath.split("/").at(-2);
    const axis = AXES[overlayAxis];

    const [firstLine, ...otherProps] = readFileSync(propsPath)
      .toLocaleString()
      .split("\n");

    const matchBlocks = firstLine.replace("matchBlocks=", "").split(" ");
    matchBlocks.push(`${block.name}:axis=${axis}`);
    matchBlocks.forEach((val, idx) => (matchBlocks[idx] = val.trim()));

    const updatedProps = [
      "matchBlocks=" + [...new Set(matchBlocks)].sort().join(" "),
      ...otherProps,
    ];
    writeFileSync(propsPath, updatedProps.join("\n").trim() + "\n");
  }
}

/** @param {Block} block */
async function updateAllSprites(block) {
  const SpriteTypes = { VARIANT: true, TOPS: false };

  await createTmpDir(block);
  await updateSprites(block, SpriteTypes.VARIANT);
  await updateSprites(block, SpriteTypes.TOPS);
  execSync(`rm -r ${WORK_DIR}/${block.name}_tmp`);

  console.log(`...${block.name} updated`);
}

/**
 * @param {Block} block
 * @param {boolean} isVariantType
 */
async function updateSprites(block, isVariantType = true) {
  const spritesheetDir = isVariantType ? DIR.variantSprites : DIR.topSprites;
  const blockSpriteDir = isVariantType ? block.variantsDir : block.topsDir;
  const type = isVariantType ? "variants" : "tops";
  const sceneStart = isVariantType ? 1 : 0;

  const spritesheets = await readdir(`${DOWNLOADS}/${spritesheetDir}`);
  if (!spritesheets.includes(`${block.name}.png`)) {
    warn(`Spritesheet (${type}) for '${block.name}' not found`);
    return;
  }
  const path = `${DOWNLOADS}/${spritesheetDir}/${block.name}.png`;
  const convertCmd = `convert ${path} -crop 16x16 +repage -scene ${sceneStart} %d.png`;

  execSync(`rm -rf ${WORK_DIR}/${block.name}_tmp/*`);
  execSync(`cd ${WORK_DIR}/${block.name}_tmp && ${convertCmd}`);

  if (isVariantType) {
    const defaultSprite = `${DOWNLOADS}/${DIR.defaultSprites}/${block.name}.png`;
    execSync(`cp ${defaultSprite} ${WORK_DIR}/${block.name}_tmp/0.png`);
  }
  if (!isVariantType) execSync(`rm ${WORK_DIR}/${block.name}_tmp/47.png`);

  const tmpSprites = await readdir(`${WORK_DIR}/${block.name}_tmp`);
  const existingSprites = await readdir(`${blockSpriteDir}`);

  existingSprites
    .filter((file) => extname(file) === ".png")
    .forEach((file) => {
      if (!tmpSprites.includes(file)) {
        execSync(`rm ${blockSpriteDir}/${file}`);
      }
    });

  for (const sprite of tmpSprites) {
    const tmpSpritePath = `${WORK_DIR}/${block.name}_tmp/${sprite}`;
    const existingSpritePath = `${blockSpriteDir}/${sprite}`;
    const replace = () => execSync(`cp ${tmpSpritePath} ${existingSpritePath}`);

    if (!existingSprites.includes(sprite)) {
      replace();
    } else {
      const { equal } = await looksSame(tmpSpritePath, existingSpritePath);
      if (!equal) replace();
    }
  }

  execSync(`optipng -o7 -quiet ${blockSpriteDir}/*.png`);
}

/** @param {Block} block */
async function createTmpDir(block) {
  const tmpDir = await getDir(`${WORK_DIR}/${block.name}_tmp`);
  if (!tmpDir.exists) {
    execSync(`mkdir ${WORK_DIR}/${block.name}_tmp`);
  }
}

async function updateAll() {
  console.log(`Updating all ${EXISTING_WOOD_TYPES.length} logs...`);

  for (const woodType of EXISTING_WOOD_TYPES) {
    await updateLog(woodType);
  }
}

init();
