module.exports = function(app) {

    var securities = require('../controllers/security.controller.js');

    app.post('/securities', securities.create);

    app.post('/esperrules', securities.esperRules);

    app.post('/save-esper-file', securities.saveEsperFile);

    app.get('/securities', securities.findAll);

    app.get('/securities/model/:id_model', securities.findModel);

    app.get('/securities/:securityId', securities.findOne);

    app.put('/securities/:securityId', securities.update);

    app.delete('/securities/:securityId', securities.delete);
};
