#!/bin/sh

DIR="/etc/mysql"

FILE=$(fgrep -Rl datadir "$DIR")
if [ -n "$FILE" ]
then
    # mkdir /data/mysql
    sed -i -e '/^datadir/s/\/var\/lib\//\/data\//' $FILE
    fgrep -R datadir "$DIR"
fi
