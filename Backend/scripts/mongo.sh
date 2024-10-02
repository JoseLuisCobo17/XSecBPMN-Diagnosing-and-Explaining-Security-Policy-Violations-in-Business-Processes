#!/bin/bash

# Detener cualquier instancia en ejecución de mongod
sudo killall -9 mongod

# Iniciar mongod con sudo para asegurar permisos correctos
sudo mongod --dbpath /var/lib/mongodb --logpath /var/log/mongodb/mongod.log --fork

# Abrir una nueva terminal y ejecutar api.sh
gnome-terminal -- bash -c "/home/jose_luis/Escritorio/Investigacion/ModelingSecurityEngine/Backend/scripts/api.sh; exec bash"
