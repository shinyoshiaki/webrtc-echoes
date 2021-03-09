#!/bin/bash
apt-get -y update &&
    apt-get -y upgrade &&
    apt-get -y install ffmpeg
npm run client $1
