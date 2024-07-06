#!/bin/bash

cd $WORKDIR/assets/minecraft/optifine/ctm/_overlays

for path in $DOWNLOADS/log-spritesheet-tops/*.png; do
  
  file_name="${path#$DOWNLOADS/log-spritesheet-tops/}"
  wood_type="${file_name%.png}"
  
  cd "${wood_type}_top"

  rm *.png
  convert $path -crop 16x16 +repage %d.png
  rm 47.png
  chmod -x *.png

  cd ..

done