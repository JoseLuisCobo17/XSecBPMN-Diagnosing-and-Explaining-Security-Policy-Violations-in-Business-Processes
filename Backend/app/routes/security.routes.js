module.exports = function(app) {

    var securities = require('../controllers/security.controller.js');

    // Create a new Security task
    app.post('/securities', securities.create);

    // Create a EsperRules txt file
    app.post('/esperrules', securities.esperRules);

    // Save the Esper file to the project directory
    app.post('/save-esper-file', securities.saveEsperFile);

    // Retrieve all Security tasks
    app.get('/securities', securities.findAll);

    // Retrieve and return the security tasks belonging to a specific model from the database
    app.get('/securities/model/:id_model', securities.findModel);

    // Retrieve a single Security task with securityId
    app.get('/securities/:securityId', securities.findOne);

    // Update a Security task with securityId
    app.put('/securities/:securityId', securities.update);

    // Delete a Security with securityId
    app.delete('/securities/:securityId', securities.delete);

    // Ruta para obtener el contenido de violations.txt
    //app.get('/get-violations', securities.getViolations);

};
