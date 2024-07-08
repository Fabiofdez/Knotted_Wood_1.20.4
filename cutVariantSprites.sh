#!/bin/bash

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
