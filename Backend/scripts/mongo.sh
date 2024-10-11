#!/bin/bash

# Detener cualquier instancia en ejecución de mongod
taskkill //IM mongod.exe //F

# Iniciar mongod (ajusta las rutas según tu instalación)
"C:/Program Files/MongoDB/Server/6.0/bin/mongod.exe" --dbpath C:/data/db --logpath C:/data/log/mongod.log --logappend --fork

# Abrir una nueva terminal de Bash y ejecutar api.sh
bash -c "../Backend/scripts/api.sh"
