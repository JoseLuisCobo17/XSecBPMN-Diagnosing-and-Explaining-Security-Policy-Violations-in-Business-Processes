var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');

// create express app
var app = express();

// Lista de orígenes permitidos para CORS
var allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:9000'
];

// Configuración de CORS
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            var msg = 'El CORS policy para este sitio no permite acceso desde el origen especificado.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true
}));

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// parse requests of content-type - application/json
app.use(bodyParser.json());

// Configuración de la base de datos
var dbConfig = require('./config/database.config.js');
var mongoose = require('mongoose');

mongoose.Promise = global.Promise;

mongoose.connect(dbConfig.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Successfully connected to the database");
}).catch(err => {
    console.log('Could not connect to the database. Exiting now...', err);
    process.exit();
});

// define a simple route
app.get('/', function (req, res) {
    res.json({"message": "Welcome to Spypro API. BPMN security tasks"});
});

// Require Security tasks routes
require('./app/routes/security.routes.js')(app);

// listen for requests
app.listen(3000, function () {
    console.log("Server is listening on port 3000");
});
