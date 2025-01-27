#!/bin/bash

cd ../Backend

taskkill //IM node.exe //F

npm install

node ./server.js
