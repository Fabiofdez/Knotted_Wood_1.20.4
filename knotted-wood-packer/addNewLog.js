import { execSync } from "child_process";
import { readdir } from "fs/promises";

const DIR = {
  ctm: "assets/minecraft/optifine/ctm",
  variantSprites: "log-spritesheet-variants",
  topSprites: "log-spritesheet-tops",
};

let WORK_DIR;
let DOWNLOADS;
let WOOD_TYPE;

function getShellConst(varName) {
  return execSync(`echo \$${varName}`).toLocaleString().trim();
}

function parse() {
  WORK_DIR = getShellConst("WORKDIR");
  DOWNLOADS = getShellConst("DOWNLOADS");

  if (!WORK_DIR) {
    console.error("ERR: shell variable 'WORKDIR' not defined");
    return;
  }
  if (!DOWNLOADS) {
    console.error("ERR: shell variable 'DOWNLOADS' not defined");
    return;
  }
  const [nodePath, thisPath, ...args] = process.argv;

  WOOD_TYPE = args[0];
  if (!WOOD_TYPE) {
    console.error("ERR: log wood type must be provided");
    return;
  }
}

function doStuff() {
  let dirFound = false;
  readdir(`${WORK_DIR}/${DIR.ctm}/${WOOD_TYPE}_log`)
    .then((res) => {
      dirFound = true;
      console.log(res);
    })
    .catch((err) => {
      if (!err.path) throw err;
      const dirPath = `${err.path}`.replace(WORK_DIR, "");
      console.error(`ERR: invalid directory '${dirPath}'`);
    })
    .finally(() => {});
}

parse();
doStuff();
