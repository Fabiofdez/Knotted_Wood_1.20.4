#!/bin/bash

cd $WORKDIR/assets/minecraft/optifine/ctm

for path in $DOWNLOADS/log-spritesheet-variants/*.png; do
  
  file_name="${path#$DOWNLOADS/log-spritesheet-variants/}"
  wood_type="${file_name%.png}"
  
  cd $wood_type

  rm *.png
  convert $path -crop 16x16 +repage -scene 1 %d.png
  cp $DOWNLOADS/log-sprite-defaults/$wood_type.png 0.png
  chmod -x *.png

  cd ..

done