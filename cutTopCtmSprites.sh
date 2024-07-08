#!/bin/bash

cd $WORKDIR/assets/minecraft/optifine/ctm/_overlays

for path in $DOWNLOADS/log-spritesheet-tops/*.png; do

  file_name="${path#$DOWNLOADS/log-spritesheet-tops/}"
  wood_type="${file_name%.png}"

  if ! [ -d "${wood_type}_top" ]; then
    mkdir "${wood_type}_top"
    echo "${wood_type}_top needs ctm.properties"
  fi

  cd "${wood_type}_top"

  if ! [ -f "ctm.properties" ]; then
    echo "${wood_type}_top needs ctm.properties"
  fi

  rm *.png
  convert $path -crop 16x16 +repage %d.png
  rm 47.png
  chmod -x *.png
  optipng -o5 -quiet *.png

  cd ..

done
