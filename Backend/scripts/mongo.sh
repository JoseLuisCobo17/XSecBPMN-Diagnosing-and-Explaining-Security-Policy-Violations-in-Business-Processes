#!/bin/bash

# Detener cualquier instancia en ejecución de mongod
taskkill //IM mongod.exe //F

# Iniciar mongod sin necesidad de la ruta completa
mongod --dbpath "../data/db" --logpath "../data/log/mongod.log" --logappend & sleep 5

# Ejecutar api.sh
bash -c "../Backend/scripts/api.sh"
