var mongoose = require('mongoose');

var SecuritySchema = mongoose.Schema({
    id_model: { type: String, required: true },
    id_bpmn: { type: String, required: true, unique:true },
    Bod: {type: Boolean, default: false},
    Sod: {type: Boolean, default: false},
    Uoc: {type: Boolean, default: false},
    SubTasks: [String],
    Nu: Number,
    Mth: Number,
    P: Number,
    User: String,
    Log: String

});

module.exports = mongoose.model('Security', SecuritySchema);
