module.exports = function(app) {

    var securities = require('../controllers/security.controller.js');

    // Create a new Security task
    app.post('/securities', securities.create);

    //Create a modSecurity txt file
    app.post('/modsecurity', securities.modSecurity);

    //Automatic synchronization with mongoDB
    app.post('/syndb', securities.synDB);

    // Retrieve all Security tasks
    app.get('/securities', securities.findAll);

    // Retrieve and return the security tasks belonging to a specific model from the database
    app.get('/securities/model/:id_model', securities.findModel)

    // Retrieve a single Security task with securityId
    app.get('/securities/:securityId', securities.findOne);

    // Update a Security task with securityId
    app.put('/securities/:securityId', securities.update);

    // Delete a Security with securityId
    app.delete('/securities/:securityId', securities.delete);
}
