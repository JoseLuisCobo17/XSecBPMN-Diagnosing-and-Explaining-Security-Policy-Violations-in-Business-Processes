#!/bin/bash

# Cambiar al directorio del proyecto
cd ../Backend

# Detener cualquier instancia en ejecución de Node.js
killall -9 node

# Instalar dependencias del proyecto
npm install

# Iniciar el servidor
node server.js
