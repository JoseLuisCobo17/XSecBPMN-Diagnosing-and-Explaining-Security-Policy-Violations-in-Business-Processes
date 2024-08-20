const Security = require('../models/security.model.js');
const fs = require('fs');
const path = require('path');

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
        P: Number(req.body.P),
        User: req.body.User || '',
        Log: req.body.Log || ''    
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

    if (!req.body.modSecurity) {
        return res.status(400).send({ message: "No modSecurity data provided" });
    }

    console.log('modSecurity data received:', req.body.modSecurity);

    for (let i = 0; i < req.body.modSecurity.length; i++) {
        const st = req.body.modSecurity[i];

        console.log('Processing task:', st);

        // BoD type
        if (st.Bod && !st.Sod && !st.Uoc) {
            console.log('Generating BoD rules...');
            for (let j = 0; j < st.SubTasks.length; j++) {
                if (st.SubTasks[j + 1] != null) {
                    ms += `SecRule REQUEST_URI 'task/${st.SubTasks[j]}/claim' 'id:1001,log,allow,msg:"User who assign this task can assign the next task",tag:"BoD",tag:"Camunda_Rules",chain'\n`;
                    ms += `SecRule ARGS:userId '@streq ${st.User}'\n`;
                    ms += `SecRule REQUEST_URI 'task/${st.SubTasks[j + 1]}/claim' 'id:1002,log,block,msg:"User tried to assign this task when he did not assign the previous one in BoD",tag:"BoD",tag:"Camunda_Rules",chain'\n`;
                    ms += `SecRule ARGS:userId '!@streq ${st.User}'\n\n`;
                }
            }
        }

        // SoD type
        if (!st.Bod && st.Sod && !st.Uoc) {
            console.log('Generating SoD rules...');
            for (let j = 0; j < st.SubTasks.length; j++) {
                if (st.SubTasks[j + 1] != null) {
                    ms += `SecRule REQUEST_URI 'task/${st.SubTasks[j]}/claim' 'id:1003,log,allow,msg:"User who assign this task cannot assign the next task",tag:"SoD",tag:"Camunda_Rules",chain'\n`;
                    ms += `SecRule ARGS:userId '@streq ${st.User}'\n`;
                    ms += `SecRule REQUEST_URI 'task/${st.SubTasks[j + 1]}/claim' 'id:1004,log,block,msg:"User tried to assign consecutive task in SoD",tag:"SoD",tag:"Camunda_Rules",chain'\n`;
                    ms += `SecRule ARGS:userId '@streq ${st.User}'\n\n`;
                }
            }
        }

        // UoC1 type
        if (!st.Bod && !st.Sod && st.Uoc && st.Mth != 0 && st.Nu == 0 && st.P == 0) {
            console.log('Generating UoC1 rules...');
            ms += `SecRule REQUEST_URI 'task/${st.SubTasks[0]}/claim' 'id:1006,log,msg:"User tried to execute a task more times than he could do it",tag:"C1",tag:"Camunda_Rules",setvar:ip.counter_c1_1=+1,chain'\n`;
            ms += `SecRule ARGS:userId '@streq ${st.User}' 'chain'\n`;
            ms += `SecRule ip:counter_c1_1 '@gt 4' 't:none,log,setvar:user.to_block_c1_1=1'\n`;
            ms += `SecRule user:to_block_c1 '@gt 0' 'id:1007,block'\n\n`;
        }

        // UoC2 type
        if (!st.Bod && !st.Sod && st.Uoc && st.P != 0) {
            console.log('Generating UoC2 rules...');
            ms += `SecRule REQUEST_URI 'task/create' 'id:1008,log,pass,msg:"Admin created a task with C2 restriction",tag:"C2",tag:"Camunda_Rules",chain'\n`;
            ms += `SecRule ARGS:description '@streq C2' 'exec:/usr/share/modsecurity-crs/scripts/createTime.lua'\n`;
            ms += `SecRule REQUEST_URI 'task/${st.SubTasks[0]}' 'id:1009,log,block,msg:"User tried to execute a task when he was out of time/date",tag:"C2",tag:"Camunda_Rules",chain'\n`;
            ms += `SecRule ARGS:userId '@streq ${st.User}' 'chain'\n`;
            ms += `SecRuleScript '/usr/share/modsecurity-crs/scripts/dates.lua'\n`;
            ms += `SecRule REQUEST_URI 'task/${st.SubTasks[0]}/claim' 'id:1010,log,msg:"User tried to execute a task more times than he could do it",tag:"C2",tag:"Camunda_Rules",setvar:ip.counter_c2_1=+1,chain'\n`;
            ms += `SecRule ARGS:userId '@streq ${st.User}' 'chain'\n`;
            ms += `SecRule ip:counter_c2_1 '@gt 5' 't:none,setvar:user.to_block_c2_1=1'\n`;
            ms += `SecRule user:to_block_c2_1 '@gt 0' 'id:1011,block'\n\n`;
        }

        // UoC3 type
        if (!st.Bod && !st.Sod && st.Uoc && st.User != "") {
            console.log('Generating UoC3 rules...');
            ms += `SecRule REQUEST_URI 'task/${st.SubTasks[0]}/identity-links' 'id:1005,log,block,msg:"Admin tried to assign a task to the wrong group/role",tag:"C3",tag:"Camunda_Rules",chain'\n`;
            ms += `SecRule ARGS:groupId '!@streq Advisor'\n\n`;
        }

        // SoD & UoC2 type
        if (!st.Bod && st.Sod && st.Uoc && st.P != 0 && st.User != "") {
            console.log('Generating SoD & UoC2 rules...');
            ms += `SecRule REQUEST_URI 'task/create' 'id:1012,log,pass,msg:"Admin created a task with C2 restriction",tag:"C2",tag:"Camunda_Rules",chain'\n`;
            ms += `SecRule ARGS:description '@streq C2' 'exec:/usr/share/modsecurity-crs/scripts/createTime.lua'\n`;
            ms += `SecRule REQUEST_URI 'task/${st.SubTasks[0]}/claim' 'id:1013,log,block,msg:"User tried to execute a task when he was out of time/date",tag:"C2",tag:"Camunda_Rules",chain'\n`;
            ms += `SecRule ARGS:userId '@streq ${st.User}' 'chain'\n`;
            ms += `SecRuleScript '/usr/share/modsecurity-crs/scripts/dates.lua'\n`;
            ms += `SecRule REQUEST_URI 'task/${st.SubTasks[0]}/claim' 'id:1014,log,msg:"User tried to execute a task more times than he could do it",tag:"C2",tag:"Camunda_Rules",setvar:ip.counter_c2_1=+1,chain'\n`;
            ms += `SecRule ARGS:userId '@streq ${st.User}' 'chain'\n`;
            ms += `SecRule ip:counter_c2_1 '@gt 3' 't:none,setvar:user.to_block_c2_1=1'\n`;
            ms += `SecRule user:to_block_c2_1 '@gt 0' 'id:1015,block'\n`;
            ms += `SecRule REQUEST_URI 'task/create' 'id:1012,log,pass,msg:"Admin created a task with C2 restriction",tag:"C2",tag:"Camunda_Rules",chain'\n`;
            ms += `SecRule ARGS:description '@streq C2' 'exec:/usr/share/modsecurity-crs/scripts/createTime.lua'\n`;
            ms += `SecRule REQUEST_URI 'task/${st.SubTasks[0]}/claim' 'id:1013,log,block,msg:"User tried to execute a task when he was out of time/date",tag:"C2",tag:"Camunda_Rules",chain'\n`;
            ms += `SecRule ARGS:userId '!@streq ${st.User}' 'chain'\n`;
            ms += `SecRuleScript '/usr/share/modsecurity-crs/scripts/dates.lua'\n`;
            ms += `SecRule REQUEST_URI 'task/${st.SubTasks[0]}/claim' 'id:1014,log,msg:"User tried to execute a task more times than he could do it",tag:"C2",tag:"Camunda_Rules",setvar:ip.counter_c2_1=+1,chain'\n`;
            ms += `SecRule ARGS:userId '!@streq ${st.User}' 'chain'\n`;
            ms += `SecRule ip:counter_c2_1 '@gt 3' 't:none,setvar:user.to_block_c2_1=1'\n`;
            ms += `SecRule user:to_block_c2_1 '@gt 0' 'id:1015,block'\n\n`;
        }
    }

    console.log('Generated ModSecurity rules:', ms);

    // Write to file
    const filePath = path.join(__dirname, '..', 'downloads', 'modSecurity.txt');

    fs.mkdir(path.dirname(filePath), { recursive: true }, (err) => {
        if (err) {
            console.log('Error creating directory:', err);
            return res.status(500).send({ message: "Error creating directory for ModSecurity file." });
        }

        fs.writeFile(filePath, ms, function (err) {
            if (err) {
                console.log('Error writing file:', err);
                return res.status(500).send({ message: "Error writing ModSecurity rules to file." });
            } else {
                console.log('Successfully wrote json to file modSecurity.txt');
                res.send({ status: 'ModSecurity rules generated and file written successfully' });
            }
        });
    });
};
exports.esperRules = function (req, res) {
    let ms = "";

    // StringBuilder emulación en JavaScript
    class StringBuilder {
        constructor() {
            this._buffer = [];
        }

        append(str) {
            this._buffer.push(str);
            return this;
        }

        toString() {
            return this._buffer.join("");
        }
    }

    if (!req.body.modSecurity) {
        return res.status(400).send({ message: "No esperRules data provided" });
    }

    console.log('esperRules data received:', req.body.modSecurity);

    for (let i = 0; i < req.body.modSecurity.length; i++) {
        const st = req.body.modSecurity[i];
        console.log('Processing task:', st);

        // BoD type
        if (st.Bod && !st.Sod && !st.Uoc) {
            console.log('Generating BoD rules...');

            ms += `# EPL Rules for Binding of Duty (BoD)\n`;
            ms += `create schema Task(userId string, taskId string, timestamp long, Nu integer, Mth integer, P integer, Log string, SubTask string);\n\n`;

            for (let j = 0; j < st.SubTasks.length - 1; j++) {
                ms += `insert into BoDViolationEvent\n`;
                ms += `select t1.userId as userId, t1.taskId as task1Id, t2.taskId as task2Id, t2.timestamp as violationTime\n`;
                ms += `from pattern [\n`;
                ms += `    every t1=Task(userId = '${st.User}', taskId = '${st.SubTasks[j]}') -> \n`;
                ms += `    t2=Task(userId != t1.userId and taskId = '${st.SubTasks[j + 1]}')\n`;
                ms += `    where timer:within(10 seconds)\n`;
                ms += `];\n\n`;
            }

            ms += `# Output the detected BoD violations\n`;
            ms += `select * from BoDViolationEvent;\n\n`;

            // Logging with similar format to LOG.debug
            let logMessage = `
            ---------------------------------
            - [BOD MONITOR] BoD rules generated:
            ${ms.split('\n').map(line => `    ${line}`).join('\n')}
            ---------------------------------`;

            console.log('BoD rules added:', ms); // Original debugging log
            console.log(logMessage); // Additional log in the style of LOG.debug
        }

        // SoD type
        if (!st.Bod && st.Sod && !st.Uoc) {
            console.log('Generating SoD rules...');

            ms += `# EPL Rules for Separation of Duty (SoD)\n`;
            ms += `create schema Task(userId string, taskId string, timestamp long, Nu integer, Mth integer, P integer, Log string, SubTask string);\n\n`;

            for (let j = 0; j < st.SubTasks.length - 1; j++) {
                ms += `insert into SoDViolationEvent\n`;
                ms += `select t1.taskId as task1Id, t2.taskId as task2Id, t1.userId as user1Id, t2.userId as user2Id, t2.timestamp as violationTime\n`;
                ms += `from pattern [\n`;
                ms += `    every t1=Task(taskId = '${st.SubTasks[j]}') -> \n`;
                ms += `    t2=Task(userId = t1.userId and taskId = '${st.SubTasks[j + 1]}')\n`;
                ms += `    where timer:within(10 seconds)\n`;
                ms += `];\n\n`;
            }

            ms += `# Output the detected SoD violations\n`;
            ms += `select * from SoDViolationEvent;\n\n`;

            // Logging with a similar format to LOG.debug
            let task1Id = st.SubTasks[0];
            let task2Id = st.SubTasks[1];
            let user1Id = st.User;
            let user2Id = st.User;  

            let sb = new StringBuilder();
            sb.append("---------------------------------\n");
            sb.append("- [SOD MONITOR] Segregation of Duties enforced:\n");
            sb.append("- Task 1 ID: ").append(task1Id).append("\n");
            sb.append("- Task 2 ID: ").append(task2Id).append("\n");
            sb.append("- User 1 ID: ").append(user1Id).append("\n");
            sb.append("- User 2 ID: ").append(user2Id).append("\n");
            sb.append("---------------------------------\n");

            console.log('SoD rules added:', ms); // Original debugging log
            console.log(sb.toString()); // Log en el estilo de LOG.debug
        }

        // UoC type - limiting number of times a task can be executed
        if (!st.Bod && !st.Sod && st.Uoc) {
            console.log('Generating UoC rules...');

            ms += `# EPL Rules for Usage of Control (UoC)\n`;
            ms += `create schema Task(userId string, taskId string, timestamp long, Nu integer, Mth integer, P integer, Log string, SubTask string);\n\n`;

            ms += `insert into UoCViolationEvent\n`;
            ms += `select e.userId as userId, e.taskId as taskId, count(*) as taskCount, max(e.timestamp) as lastExecutionTime\n`;
            ms += `from Task.win:time_batch(1 hour) as e\n`;
            ms += `where e.taskId = '${st.SubTasks[0]}' and e.userId = '${st.User}'\n`;
            ms += `group by e.userId, e.taskId\n`;
            ms += `having count(*) > ${st.Mth};\n\n`;

            ms += `# Output the detected UoC violations\n`;
            ms += `select * from UoCViolationEvent;\n\n`;

            // Logging with similar format to LOG.debug
            let userId = st.User;
            let taskCount = `${st.Mth}`;

            let sb = new StringBuilder();
            sb.append("---------------------------------\n");
            sb.append("- [UOC MONITOR] Usage of Control violation detected:\n");
            sb.append("- User ID: ").append(userId).append("\n");
            sb.append("- Number of executions: ").append(taskCount).append("\n");
            sb.append("---------------------------------\n");

            console.log('UoC rules added:', ms); // Original debugging log
            console.log(sb.toString()); // Log en el estilo de LOG.debug
        }

        // UoC2 type
        if (!st.Bod && !st.Sod && st.Uoc && st.P != 0) {
            console.log('Generating UoC2 rules...');

            ms += `# EPL Rules for UoC2 Type\n`;
            ms += `create schema Task(userId string, taskId string, timestamp long, Nu integer, Mth integer, P integer, Log string, SubTask string);\n\n`;

            ms += `insert into UoC2ViolationEvent\n`;
            ms += `select e.userId as userId, e.taskId as taskId, max(e.timestamp) as violationTime\n`;
            ms += `from Task.win:time_batch(1 hour) as e\n`;
            ms += `where e.taskId = '${st.SubTasks[0]}' and e.userId = '${st.User}'\n`;
            ms += `group by e.userId, e.taskId\n`;
            ms += `having count(*) > ${st.Mth};\n\n`;

            ms += `# Output the detected UoC2 violations\n`;
            ms += `select * from UoC2ViolationEvent;\n\n`;

            // Logging with similar format to LOG.debug
            let userId = st.User;
            let taskId = st.SubTasks[0];
            let violationTime = new Date().toISOString(); // Assuming current time

            let sb = new StringBuilder();
            sb.append("---------------------------------\n");
            sb.append("- [UOC2 MONITOR] Usage of Control 2 violation detected:\n");
            sb.append("- User ID: ").append(userId).append("\n");
            sb.append("- Task ID: ").append(taskId).append("\n");
            sb.append("- Violation Time: ").append(violationTime).append("\n");
            sb.append("---------------------------------\n");

            console.log('UoC2 rules added:', ms); // Original debugging log
            console.log(sb.toString()); // Log en el estilo de LOG.debug
        }

        // UoC3 type
        if (!st.Bod && !st.Sod && st.Uoc && st.User != "") {
            console.log('Generating UoC3 rules...');

            ms += `# EPL Rules for UoC3 Type\n`;
            ms += `create schema Task(userId string, groupId string, taskId string, timestamp long, Nu integer, Mth integer, P integer, Log string, SubTask string);\n\n`;

            ms += `insert into UoC3ViolationEvent\n`;
            ms += `select e.userId as userId, e.groupId as groupId, e.taskId as taskId, max(e.timestamp) as violationTime\n`;
            ms += `from Task as e\n`;
            ms += `where e.taskId = '${st.SubTasks[0]}' and e.groupId != 'Advisor';\n\n`;

            ms += `# Output the detected UoC3 violations\n`;
            ms += `select * from UoC3ViolationEvent;\n\n`;

            // Logging with similar format to LOG.debug
            let userId = st.User;
            let groupId = 'Unknown'; // Assuming the group ID is 'Unknown' for non-advisor groups
            let taskId = st.SubTasks[0];
            let violationTime = new Date().toISOString(); // Assuming current time

            let sb = new StringBuilder();
            sb.append("---------------------------------\n");
            sb.append("- [UOC3 MONITOR] Usage of Control 3 violation detected:\n");
            sb.append("- User ID: ").append(userId).append("\n");
            sb.append("- Group ID: ").append(groupId).append("\n");
            sb.append("- Task ID: ").append(taskId).append("\n");
            sb.append("- Violation Time: ").append(violationTime).append("\n");
            sb.append("---------------------------------\n");

            console.log('UoC3 rules added:', ms); // Original debugging log
            console.log(sb.toString()); // Log en el estilo de LOG.debug
        }

        // SoD & UoC2 type
        if (!st.Bod && st.Sod && st.Uoc && st.P != 0 && st.User != "") {
            console.log('Generating SoD & UoC2 rules...');
            ms += `# EPL Rules for SoD & UoC2 Combination\n`;
            ms += `create schema Task(userId string, taskId string, timestamp long, Nu integer, Mth integer, P integer, Log string, SubTask string);\n\n`;

            ms += `insert into SoDUoC2ViolationEvent\n`;
            ms += `select e.userId as violatingUser, e.taskId, e.timestamp as violationTime\n`;
            ms += `from Task as e\n`;
            ms += `where e.taskId = '${st.SubTasks[0]}' and e.userId = '${st.User}' and e.timestamp > current_timestamp - 3600;\n\n`;

            ms += `insert into SoDUoC2OverExecutionEvent\n`;
            ms += `select e.userId as violatingUser, e.taskId, count(*) as executionCount, e.timestamp as violationTime\n`;
            ms += `from Task.win:time_batch(1 hour) as e\n`;
            ms += `where e.taskId = '${st.SubTasks[0]}' and e.userId = '${st.User}'\n`;
            ms += `group by e.userId, e.taskId\n`;
            ms += `having count(*) > 3;\n\n`;

            ms += `insert into SoDUoC2BlockEvent\n`;
            ms += `select o.violatingUser, o.taskId, o.violationTime\n`;
            ms += `from SoDUoC2OverExecutionEvent as o;\n\n`;

            ms += `# Output the detected SoD & UoC2 violations and blocks\n`;
            ms += `select * from SoDUoC2ViolationEvent;\n`;
            ms += `select * from SoDUoC2OverExecutionEvent;\n`;
            ms += `select * from SoDUoC2BlockEvent;\n\n`;
        }
    }

    console.log('Final generated esperRules:', ms);

    // Write to file
    const filePath = path.join(__dirname, '..', 'esperRules', 'esperRules.txt');

    fs.mkdir(path.dirname(filePath), { recursive: true }, (err) => {
        if (err) {
            console.log('Error creating directory:', err);
            return res.status(500).send({ message: "Error creating directory for esperRules file." });
        }

        fs.writeFile(filePath, ms, function (err) {
            if (err) {
                console.log('Error writing file:', err);
                return res.status(500).send({ message: "Error writing esperRules rules to file." });
            } else {
                console.log('Successfully wrote rules to file esperRules.txt');
                res.send({ status: 'esperRules rules generated and file written successfully' });
            }
        });
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
        if (req.body.User !== undefined) security.User = req.body.User;
        if (req.body.Log !== undefined) security.Log = req.body.Log;
        if (req.body.SubTasks !== undefined) security.SubTasks = req.body.SubTasks;
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
