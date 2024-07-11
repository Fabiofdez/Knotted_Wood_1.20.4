import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { readdir, readFile } from "fs/promises";
import { globSync } from "glob";

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
    err("shell variable 'WORKDIR' not defined");
    return;
  }
  if (!DOWNLOADS) {
    err("shell variable 'DOWNLOADS' not defined");
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
        err("log wood type must be provided");
        return;
      }
      addNewLog(woodType);
      break;
    case "update-log":
      if (!woodType) {
        err("log wood type must be provided");
        return;
      }
      updateLog(woodType);
      break;
    case "update-all":
      updateAll();
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

  const variants = await getDir(block.variantsDir);
  const tops = await getDir(block.topsDir);

  if (variants.exists || tops.exists) {
    warn(`Wood type '${woodType}' already exists`);
  }
  if (!variants.exists) execSync(`mkdir ${block.variantsDir}`);
  if (!tops.exists) execSync(`mkdir ${block.topsDir}`);

  updateProperties(block);
  updateSprites(block);
}

async function updateLog(woodType) {
  const block = getBlock(woodType);

  const variants = await getDir(block.variantsDir);
  const tops = await getDir(block.topsDir);

  if (!variants.exists || !tops.exists) {
    err(`unknown wood type '${woodType}'`);
    return;
  }

  updateProperties(block);
  updateSprites(block);
}

/** @param {Block} block */
async function updateProperties(block) {
  const blockProps = `${block.variantsDir}/${block.name}.properties`;
  const blockTopsProps = `${block.topsDir}/ctm.properties`;

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

  updateCtmOverlay(block);
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

    const updatedProps = [
      "matchBlocks=" + [...new Set(matchBlocks)].sort().join(" "),
      ...otherProps,
    ];
    writeFileSync(propsPath, updatedProps.join("\n").trim() + "\n");
  }
}

/** @param {Block} block */
function updateSprites(block) {
  updateVariantSprites(block);
  updateTopsSprites(block);
}

/** @param {Block} block */
async function updateVariantSprites(block) {
  const contents = await readdir(`${DOWNLOADS}/${DIR.variantSprites}`);

  if (!contents.includes(`${block.name}.png`)) {
    warn(`Spritesheet (variants) for '${block.name}' not found`);
    return;
  }
  const convertCmd = `convert $path -crop 16x16 +repage -scene 1 %d.png`;
  // execSync(`cd ${block.variantsDir}`);
  // execSync(`mkdir ${WORK_DIR}/tmp`);
  // execSync(`cd ${WORK_DIR}/tmp && ${convertCmd}`);
}

/** @param {Block} block */
async function updateTopsSprites(block) {
  const contents = await readdir(`${DOWNLOADS}/${DIR.topSprites}`);

  if (!contents.includes(`${block.name}.png`)) {
    warn(`Spritesheet (variants) for '${block.name}' not found`);
    return;
  }
  execSync(`cd ${block.topsDir}`);
}

function updateAll() {
  for (const woodType of EXISTING_WOOD_TYPES) {
    updateLog(woodType);
  }
}

/*
cd $WORKDIR/assets/minecraft/optifine/ctm

for path in $DOWNLOADS/log-spritesheet-variants/*.png; do

  file_name="${path#$DOWNLOADS/log-spritesheet-variants/}"
  wood_type="${file_name%.png}"

  if ! [ -d $wood_type ]; then
    mkdir $wood_type
  fi

  cd $wood_type

  if ! [ -f "${wood_type}.properties" ]; then
    echo "${wood_type} needs ${wood_type}.properties"
  fi

  rm *.png
  convert $path -crop 16x16 +repage -scene 1 %d.png
  cp $DOWNLOADS/log-sprite-defaults/$wood_type.png 0.png
  chmod -x *.png
  optipng -o5 -quiet *.png

  cd ..

done
*/

init();
