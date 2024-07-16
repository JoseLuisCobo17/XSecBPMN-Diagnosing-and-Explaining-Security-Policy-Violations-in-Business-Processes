var Security = require('../models/security.model.js');

exports.create = function(req, res) {
    // Create and Save a new Security task
    if(!req.body.BoD || !req.body.SoD || !req.body.UoC) {
        return res.status(400).send({message: "Security task can not be empty"});
    }

    var security = new Security({id_model: req.body.id_model, id_bpmn: req.body.id_bpmn || "Untitled security task", 
                                BoD: req.body.BoD, SoD: req.body.SoD, UoC: req.body.UoC, SubTasks: req.body.SubTasks, 
                                Nu: req.body.Nu, Mth: req.body.Mth, P: req.body.P, User: req.body.User, 
                                Log: req.body.Log});

    security.save(function(err, data) {
        if(err) {
            console.log(err);
            res.status(500).send({message: "Some error occurred while creating the Security task."});
        } else {
            res.send(data);
        }
    });
};

//method that recived a json and transform in txt file (modSecurity format)
exports.modSecurity = function(req, res) {

    var ms = ""
    
    for(var i=0; i<req.body.modSecurity.length; i++){

        var st = req.body.modSecurity[i];

        //BoD type
        if(st.BoD == true && st.SoD == false && st.UoC == false){
            for(var j=0; j<st.SubTasks.length; j++){
                if(st.SubTasks[j+1] != null){
                    ms+="SecRule REQUEST_URI 'task/" + st.SubTasks[j] + "/claim' 'id:1001,log,allow,msg:'User who assign this task can assign the next task',tag:'BoD',tag:'Camunda_Rules',chain'\n ";
                    ms+="SecRule ARGS:userId '@streq " + st.User + "'\n";
                    ms+="SecRule REQUEST_URI 'task/" + st.SubTasks[j+1]+ "/claim 'id:1002,log,block,msg:'User tried to assign this task when he did not assign the previous one in BoD',tag:'BoD',tag:'Camunda_Rules',chain'\n ";
                    ms+="SecRule ARGS:userId '!@streq " + st.User + "'\n\n";
                }
            }
        }

        //SoD type
        if(st.BoD == false && st.SoD == true && st.UoC == false){
            for(var j=0; j<st.SubTasks.length; j++){
                if(st.SubTasks[j+1] != null){
                    ms+="SecRule REQUEST_URI 'task/" +st.SubTasks[j] + "/claim' 'id:1003,log,allow,msg:'User who assign this task can not assign the next task',tag:'SoD',tag:'Camunda_Rules',chain'\n";
                    ms+="SecRule ARGS:userId '@streq " + st.User + "'\n";
                    ms+="SecRule REQUEST_URI 'task/" + st.SubTasks[j+1] + "/claim' 'id:1004,log,block,msg:'User tried to assign consecutive task in SoD',tag:'SoD',tag:'Camunda_Rules',chain'\n";
                    ms+="SecRule ARGS:userId '@streq " + st.User + "'\n\n";
                }
            }
        }

        //UoC1 type
        if(st.BoD == false && st.SoD == false && st.UoC == true && st.Mth!=0 && st.Nu == 0 && st.P == 0){
            ms+="SecRule REQUEST_URI 'task/" + st.SubTasks[0] + "/claim' 'id:1006,log,msg:'User tried to execute a task more times than he could do it',tag:'C1',tag:'Camunda_Rules',setvar:ip.counter_c1_1=+1,chain'\n";
            ms+="SecRule ARGS:userId '@streq " + st.User + "' 'chain'\n";
            ms+="SecRule ip:counter_c1_1 '@gt 4' 't:none,log,setvar:user.to_block_c1_1=1'\n";
            ms+="SecRule user:to_block_c1 '@gt 0' 'id:1007,block'\n\n";
        }

        //UoC2 type
        if(st.BoD == false && st.SoD == false && st.UoC == true && st.P != 0){
            ms+="SecRule REQUEST_URI 'task/create' 'id:1008,log,pass,msg:'Admin created a task with C2 restriction',tag:'C2',tag:'Camunda_Rules',chain'\n";
            ms+="SecRule ARGS:description '@streq C2' 'exec:/usr/share/modsecurity-crs/scripts/createTime.lua'\n";
            ms+="SecRule REQUEST_URI 'task/" + st.SubTasks[0] + "' 'id:1009,log,block,msg:'User tried to execute a task when he was out of time/date',tag:'C2',tag:'Camunda_Rules',chain'\n";
            ms+="SecRule ARGS:userId '@streq "+ st.User +"' 'chain'\n";
            ms+="SecRuleScript '/usr/share/modsecurity-crs/scripts/dates.lua'\n";
            ms+="SecRule REQUEST_URI 'task/" + st.SubTasks[0] + "/claim' 'id:1010,log,msg:'User tried to execute a task more times than he could do it',tag:'C2',tag:'Camunda_Rules',setvar:ip.counter_c2_1=+1,chain'\n";
            ms+="SecRule ARGS:userId '@streq " + st.User + "' 'chain'\n";
            ms+="SecRule ip:counter_c2_1 '@gt 5' 't:none,setvar:user.to_block_c2_1=1'\n";
            ms+="SecRule user:to_block_c2_1 '@gt 0' 'id:1011,block'\n\n";
        
        }

        //UoC3 type
        if(st.BoD == false && st.SoD == false && st.UoC == true && st.User!=""){
            ms+="SecRule REQUEST_URI 'task/" + st.SubTasks[0] + "/identity-links' 'id:1005,log,block,msg:'Admin tried to assign a task to the wrong group/role',tag:'C3',tag:'Camunda_Rules',chain'\n";
            ms+="SecRule ARGS:groupId '!@streq Advisor'\n\n";
        }

        //SoD & UoC2 type
        if(st.BoD == false && st.SoD == true && st.UoC == true && st.P != 0 && st.User!=""){
            ms+="SecRule REQUEST_URI 'task/create' 'id:1012,log,pass,msg:'Admin created a task with C2 restriction',tag:'C2',tag:'Camunda_Rules',chain'\n";
            ms+="SecRule ARGS:description '@streq C2' 'exec:/usr/share/modsecurity-crs/scripts/createTime.lua'\n";
            ms+="SecRule REQUEST_URI 'task/" + st.SubTasks[0] + "/claim' 'id:1013,log,block,msg:'User tried to execute a task when he was out of time/date',tag:'C2',tag:'Camunda_Rules',chain'\n";
            ms+="SecRule ARGS:userId '@streq " + st.User + "' 'chain'\n";
            ms+="SecRuleScript '/usr/share/modsecurity-crs/scripts/dates.lua'\n";
            ms+="SecRule REQUEST_URI 'task/" + st.SubTasks[0] + "/claim' 'id:1014,log,msg:'User tried to execute a task more times than he could do it',tag:'C2',tag:'Camunda_Rules',setvar:ip.counter_c2_1=+1,chain'\n";
            ms+="SecRule ARGS:userId '@streq " + st.User + "' 'chain'\n";
            ms+="SecRule ip:counter_c2_1 '@gt 3' 't:none,setvar:user.to_block_c2_1=1'\n";
            ms+="SecRule user:to_block_c2_1 '@gt 0' 'id:1015,block'\n";
            ms+="SecRule REQUEST_URI 'task/create' 'id:1012,log,pass,msg:'Admin created a task with C2 restriction',tag:'C2',tag:'Camunda_Rules',chain'\n";
            ms+="SecRule ARGS:description '@streq C2' 'exec:/usr/share/modsecurity-crs/scripts/createTime.lua'\n";
            ms+="SecRule REQUEST_URI 'task/" + st.SubTasks[0] + "/claim' 'id:1013,log,block,msg:'User tried to execute a task when he was out of time/date',tag:'C2',tag:'Camunda_Rules',chain'\n";
            ms+="SecRule ARGS:userId '!@streq " + st.User + "' 'chain'\n";
            ms+="SecRuleScript '/usr/share/modsecurity-crs/scripts/dates.lua'\n";
            ms+="SecRule REQUEST_URI 'task/" + st.SubTasks[0] + "/claim' 'id:1014,log,msg:'User tried to execute a task more times than he could do it',tag:'C2',tag:'Camunda_Rules',setvar:ip.counter_c2_1=+1,chain'\n";
            ms+="SecRule ARGS:userId '!@streq " + st.User + "' 'chain'\n";
            ms+="SecRule ip:counter_c2_1 '@gt 3' 't:none,setvar:user.to_block_c2_1=1'\n";
            ms+="SecRule user:to_block_c2_1 '@gt 0' 'id:1015,block'\n\n";

        }

    }
    // console.log(ms);
    res.send(req.body.status);
    fs = require('fs');
    fs.writeFile('/Users/anapareciendo/Desktop/Spypro-transformer/Spypro-editor/downloads/modSecurity.txt', ms, function (err) {
        if (err) {
            console.log(err);
        }else{
            console.log('Wrote json in file modSecurity.txt, just check it');
        }
    });
};

exports.synDB = function(req, res){
    
    var sts = req.body.modSecurity;
    for(var i=0; i<sts.length; i++){
        var security = new Security({id_model: sts[i].id_model, id_bpmn: sts[i].id_bpmn, 
            BoD: sts[i].BoD, SoD: sts[i].SoD, UoC: sts[i].UoC, SubTasks: sts[i].SubTasks, 
            Nu: sts[i].Nu, Mth: sts[i].Mth, P: sts[i].P, User: sts[i].User, 
            Log: sts[i].Log});
        Security.findOneAndRemove({id_bpmn:security.id_bpmn}, function(err, securities){
        })
        security.save(function(err,data){
            if(err){
                console.log("Some error occurred while creating the Security task.");
            }
        })
    }

    res.send(req.body.status);

};

exports.findAll = function(req, res) {
    // Retrieve and return all security task from the database.
    Security.find(function(err, securities){
        if(err) {
            console.log(err);
            res.status(500).send({message: "Some error occurred while retrieving security tasks."});
        } else {
            res.send(securities);
        }
    });
};

exports.findModel = function(req, res) {
    // Retrieve and return the security tasks belonging to a specific model from the database.
    Security.find({id_model: req.params.id_model}, function(err, securities){
        if(err) {
            console.log(err);
            res.status(500).send({message: "Some error occurred while retrieving security tasks."});
        } else {
            res.send(securities);
        }
    });
};

exports.findOne = function(req, res) {
    // Find a single security task with a securitytaskId.
    Security.findById(req.params.securityId, function(err, security) {
        if(err) {
            console.log(err);
            if(err.kind === 'ObjectId') {
                return res.status(404).send({message: "Security task not found with id " + req.params.securityId});                
            }
            return res.status(500).send({message: "Error retrieving security task with id " + req.params.securityId});
        } 

        if(!security) {
            return res.status(404).send({message: "Security task not found with id " + req.params.securityId});            
        }

        res.send(security);
    });
};

exports.update = function(req, res) {
    // Update a security task identified by the securityId in the request
    Security.findById(req.params.securityId, function(err, security) {
        if(err) {
            console.log(err);
            if(err.kind === 'ObjectId') {
                return res.status(404).send({message: "Security task not found with id " + req.params.securityId});                
            }
            return res.status(500).send({message: "Error finding security task with id " + req.params.securityId});
        }

        if(!security) {
            return res.status(404).send({message: "Security task not found with id " + req.params.securityId});            
        }

        security.id_model = req.body.id_model;
        security.id_bpmn = req.body.id_bpmn;
        security.BoD = req.body.BoD;
        security.SoD = req.body.SoD;
        security.UoC = req.body.UoC;
        security.SubTasks = req.body.SubTasks;
        security.Nu = req.body.Nu;
        security.Mth = req.body.Mth;
        security.P = req.body.P;
        security.User = req.body.User;
        security.Log = req.body.Log;

        security.save(function(err, data){
            if(err) {
                res.status(500).send({message: "Could not update security task with id " + req.params.securityId});
            } else {
                res.send(data);
            }
        });
    });
};

exports.delete = function(req, res) {
    // Delete a security task with the specified securityId in the request
    Security.findByIdAndRemove(req.params.securityId, function(err, security) {
        if(err) {
            console.log(err);
            if(err.kind === 'ObjectId') {
                return res.status(404).send({message: "Security task not found with id " + req.params.securityId});                
            }
            return res.status(500).send({message: "Could not delete security task with id " + req.params.securityId});
        }

        if(!security) {
            return res.status(404).send({message: "Security task not found with id " + req.params.securityId});
        }

        res.send({message: "Security task deleted successfully!"})
    });
};
