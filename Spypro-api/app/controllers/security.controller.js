const Security = require('../models/security.model.js');

// Create and Save a new Security task
exports.create = function (req, res) {
    if (req.body.Bod === undefined || req.body.Sod === undefined || req.body.Uoc === undefined) {
        return res.status(400).send({ message: "Security task can not be empty" });
    }

    const security = new Security({
        id_model: req.body.id_model,
        id_bpmn: req.body.id_bpmn || "Untitled security task",
        Bod: req.body.Bod === true,
        Sod: req.body.Sod === true, 
        Uoc: req.body.Uoc === true,
        Nu: Number(req.body.Nu),
        Mth: Number(req.body.Mth),
        P: Number(req.body.P)   
    });

    security.save(function (err, data) {
        if (err) {
            console.log(err);
            res.status(500).send({ message: "Some error occurred while creating the Security task." });
        } else {
            res.send(data);
        }
    });
};

// Method that receives a JSON and transforms it into a txt file (modSecurity format)
exports.modSecurity = function (req, res) {
    let ms = "";

    for (let i = 0; i < req.body.modSecurity.length; i++) {
        const st = req.body.modSecurity[i];

        // BoD type
        if (st.Bod && !st.Sod && !st.Uoc) {
            for (let j = 0; j < st.SubTasks.length; j++) {
                if (st.SubTasks[j + 1] != null) {
                    ms += `SecRule REQUEST_URI 'task/${st.SubTasks[j]}/claim' 'id:1001,log,allow,msg:'User who assign this task can assign the next task',tag:'BoD',tag:'Camunda_Rules',chain'\n`;
                    ms += `SecRule ARGS:userId '@streq ${st.User}'\n`;
                    ms += `SecRule REQUEST_URI 'task/${st.SubTasks[j + 1]}/claim 'id:1002,log,block,msg:'User tried to assign this task when he did not assign the previous one in BoD',tag:'BoD',tag:'Camunda_Rules',chain'\n`;
                    ms += `SecRule ARGS:userId '!@streq ${st.User}'\n\n`;
                }
            }
        }
        //SoD type
        if(st.Bod == false && st.Sod == true && st.Uoc == false){
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

    res.send(req.body.status);

    const fs = require('fs');
    fs.writeFile('/Users/anapareciendo/Desktop/Spypro-transformer/Spypro-editor/downloads/modSecurity.txt', ms, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Wrote json in file modSecurity.txt, just check it');
        }
    });
};

// Sincronización de la base de datos
exports.synDB = async function (req, res) {
    try {
      const sts = req.body.modSecurity;
      console.log('Received tasks for synchronization:', sts); // Log para depuración
  
      for (const st of sts) {
        const existingSecurity = await Security.findOne({ id_bpmn: st.id_bpmn });
        if (existingSecurity) {
          existingSecurity.Bod = st.Bod === true; 
          existingSecurity.Sod = st.Sod === true; 
          existingSecurity.Uoc = st.Uoc === true; 
          existingSecurity.SubTasks = st.SubTasks;
          existingSecurity.Nu = st.Nu;
          existingSecurity.Mth = st.Mth;
          existingSecurity.P = st.P;
          existingSecurity.User = st.User;
          existingSecurity.Log = st.Log;
          await existingSecurity.save();
          console.log('Updated security task:', existingSecurity); // Log para depuración
        } else {
          const newSecurity = new Security({
            id_model: st.id_model,
            id_bpmn: st.id_bpmn,
            Bod: st.Bod === true, 
            Sod: st.Sod === true, 
            Uoc: st.Uoc === true, 
            SubTasks: st.SubTasks,
            Nu: st.Nu,
            Mth: st.Mth,
            P: st.P,
            User: st.User,
            Log: st.Log
          });
          await newSecurity.save();
          console.log('Created new security task:', newSecurity); // Log para depuración
        }
      }
      res.send({ status: 'Synchronization successful' });
    } catch (error) {
      console.log("Some error occurred while synchronizing the Security tasks.", error);
      res.status(500).send({ message: "Some error occurred while synchronizing the Security tasks." });
    }
  };
// Retrieve and return all security tasks from the database.
exports.findAll = async function (req, res) {
    try {
        const securities = await Security.find();
        res.send(securities);
    } catch (err) {
        console.log(err);
        res.status(500).send({ message: "Some error occurred while retrieving security tasks." });
    }
};

// Retrieve and return the security tasks belonging to a specific model from the database.
exports.findModel = function (req, res) {
    Security.find({ id_model: req.params.id_model }, function (err, securities) {
        if (err) {
            console.log(err);
            res.status(500).send({ message: "Some error occurred while retrieving security tasks." });
        } else {
            res.send(securities);
        }
    });
};

// Find a single security task with a securitytaskId.
exports.findOne = function (req, res) {
    Security.findById(req.params.securityId, function (err, security) {
        if (err) {
            console.log(err);
            if (err.kind === 'ObjectId') {
                return res.status(404).send({ message: "Security task not found with id " + req.params.securityId });
            }
            return res.status(500).send({ message: "Error retrieving security task with id " + req.params.securityId });
        }

        if (!security) {
            return res.status(404).send({ message: "Security task not found with id " + req.params.securityId });
        }

        res.send(security);
    });
};

// Update a security task identified by the securityId in the request
exports.update = async function (req, res) {
    try {
        console.log('Update request received for id:', req.params.securityId);
        console.log('Request body:', req.body);

        const security = await Security.findById(req.params.securityId);
        if (!security) {
            return res.status(404).send({ message: "Security task not found with id " + req.params.securityId });
        }

        // Actualizar solo los campos que se pasan en el cuerpo de la solicitud
        if (req.body.id_model !== undefined) security.id_model = req.body.id_model;
        if (req.body.id_bpmn !== undefined) security.id_bpmn = req.body.id_bpmn;
        if (req.body.Bod !== undefined) security.Bod = req.body.Bod;
        if (req.body.Sod !== undefined) security.Sod = req.body.Sod;
        if (req.body.Uoc !== undefined) security.Uoc = req.body.Uoc;
        if (req.body.Nu !== undefined) security.Nu = req.body.Nu;
        if (req.body.Mth !== undefined) security.Mth = req.body.Mth;
        if (req.body.P !== undefined) security.P = req.body.P;
        console.log('Updated security task:', security);

        const updatedSecurity = await security.save();
        res.send(updatedSecurity);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Could not update security task with id " + req.params.securityId });
    }
};

// Delete a security task with the specified securityId in the request
exports.delete = function (req, res) {
    Security.findByIdAndRemove(req.params.securityId, function (err, security) {
        if (err) {
            console.log(err);
            if (err.kind === 'ObjectId') {
                return res.status(404).send({ message: "Security task not found with id " + req.params.securityId });
            }
            return res.status(500).send({ message: "Could not delete security task with id " + req.params.securityId });
        }

        if (!security) {
            return res.status(404).send({ message: "Security task not found with id " + req.params.securityId });
        }

        res.send({ message: "Security task deleted successfully!" });
    });
};
