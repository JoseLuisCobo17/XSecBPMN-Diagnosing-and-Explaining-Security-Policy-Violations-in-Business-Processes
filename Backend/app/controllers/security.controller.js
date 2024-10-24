const Security = require('../models/security.model.js');
const fs = require('fs');
const path = require('path');

exports.getViolations = (req, res) => {
    const filePath = path.join(__dirname, '..', '..', '..', 'Modeler', 'example', 'src', 'files', 'violations.txt');
    console.log('Ruta completa del archivo:', filePath);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error al leer violations.txt:', err);
            return res.status(500).send({ message: 'Error al leer violations.txt' });
        }
        res.send({ content: data });
    });
};

// Create and Save a new Security task
exports.create = function (req, res) {
    console.log('Received create request with body:', req.body);  // Depuración

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
        Log: req.body.Log || '',
        NumberOfExecutions: req.body.NumberOfExecutions || 0,
        AverageTimeEstimate: req.body.AverageTimeEstimate || 0,
        Instance: req.body.Instance || ''
    });

    console.log('Created Security object:', security);  // Verificación del objeto creado

    security.save(function (err, data) {
        if (err) {
            console.log(err);
            res.status(500).send({ message: "Some error occurred while creating the Security task." });
        } else {
            res.send(data);
        }
    });
};

exports.esperRules = function (req, res) {
    let ms = "";

    if (!req.body.esperRules) {
        return res.status(400).send({ message: "No esperRules data provided" });
    }

    console.log('esperRules data received:', JSON.stringify(req.body.esperRules, null, 2));

    for (let i = 0; i < req.body.esperRules.length; i++) {
        const st = req.body.esperRules[i];

        // Asegúrate de que las SubTasks y sus UserTask existan
        const subTasks = st.SubTasks || [];

        // Obtener los UserTask que no sean null, vacíos o "Unknown"
        const validUserTasks = subTasks.map(subTask => subTask.UserTask)
                                       .filter(userTask => userTask && userTask.trim() !== "" && userTask !== "Unknown");

        console.log('Valid UserTasks:', validUserTasks);

        const areUserTasksDifferent = new Set(validUserTasks).size > 1;
        console.log('areUserTasksDifferent:', areUserTasksDifferent);  // Verifica si se detectan tareas diferentes

        const isBoD = st.Bod === true && !areUserTasksDifferent;
        const isSoD = st.Sod === true && areUserTasksDifferent && validUserTasks.length === subTasks.length;
        const isUoC = st.Uoc === true && st.Mth >= 4 && validUserTasks.length > 0;  // Solo activa si Mth >= 4 y hay usuarios válidos

        console.log(`Processing task ${st.id_bpmn}: BoD=${isBoD}, SoD=${isSoD}, UoC=${isUoC}`);

        // Generar reglas BoD
        if (isBoD) {
            if (subTasks.length >= 2) {
                const subTask1Id = subTasks[0].taskId;
                const subTask2Id = subTasks[1].taskId;
                const user = subTasks[1].UserTask;

                // Agregar el mensaje de monitoreo en el formato solicitado
                ms += "---------------------------------\n";
                ms += "- [BOD MONITOR] Binding of Duty detected:\n";
                ms += "- Parent Task ID: " + st.id_bpmn + "\n";
                ms += "- SubTask 1 ID: " + subTask1Id + "\n";
                ms += "- SubTask 2 ID: " + subTask2Id + "\n";
                ms += "- User ID: " + user + "\n";
                ms += "---------------------------------\n\n";
            }
        }

        // Generar reglas SoD
        if (isSoD) {
            if (subTasks.length >= 2) {
                const subTask1Id = subTasks[0].taskId;
                const subTask2Id = subTasks[1].taskId;
                const user1 = subTasks[0].UserTask;
                const user2 = subTasks[1].UserTask;

                // Agregar el mensaje de monitoreo en el formato solicitado
                ms += "---------------------------------\n";
                ms += "- [SOD MONITOR] Separation of Duties detected:\n";
                ms += "- Parent Task ID: " + st.id_bpmn + "\n";
                ms += "- SubTask 1 ID: " + subTask1Id + " - User ID: " + user1 + "\n";
                ms += "- SubTask 2 ID: " + subTask2Id + " - User ID: " + user2 + "\n";
                ms += "---------------------------------\n\n";
            }
        }

        // Generar reglas UoC
        if (isUoC) {
            // Contar cuántas veces ha ejecutado cada usuario
            const userTaskCount = validUserTasks.reduce((acc, userTask) => {
                acc[userTask] = (acc[userTask] || 0) + 1;
                return acc;
            }, {});

            // Verificar si alguno de los usuarios ha excedido el número de ejecuciones permitido (st.Mth)
            let ruleTriggered = false;
            for (const [user, count] of Object.entries(userTaskCount)) {
                if (count >= st.Mth) {
                    const taskIds = subTasks.map(subTask => subTask.taskId).join(", ");
                    ms += "---------------------------------\n";
                    ms += "- [UOC MONITOR] Usage of Control detected:\n";
                    ms += "- Parent Task ID: " + st.id_bpmn + "\n";
                    ms += "- SubTasks IDs: " + taskIds + "\n";
                    ms += "- User ID: " + user + "\n";
                    ms += "- Maximum allowed executions (Mth >= 4): " + st.Mth + "\n";
                    ms += "---------------------------------\n\n";
                    ruleTriggered = true;
                }
            }

            if (!ruleTriggered) {
                console.log('No UoC violations detected.');
            }
        }
    }

    // Escribir las reglas a un archivo
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

const { exec } = require('child_process');

const FILES_DIRECTORY = path.resolve(__dirname, '../../../Simulator/files/');
const SIMULATOR_DIRECTORY = path.resolve(__dirname, '../../../Simulator');
const ENGINE_DIRECTORY = path.resolve(__dirname, '../../../Engine');

exports.saveEsperFile = (req, res) => {
    const { content, filename } = req.body;

    if (!content || !filename) {
        return res.status(400).send({ message: 'El contenido o el nombre del archivo faltan' });
    }

    // Ruta completa del archivo
    const filePath = path.join(FILES_DIRECTORY, filename);

    // Guardar el archivo
    fs.writeFile(filePath, content, 'utf8', (err) => {
        if (err) {
            console.error('Error al guardar el archivo:', err);
            return res.status(500).send({ message: 'Error al guardar el archivo' });
        }

        console.log('Archivo guardado exitosamente en:', filePath);

        // Ejecutar el simulador con el directorio de trabajo correcto
        exec(`python main.py`, { cwd: SIMULATOR_DIRECTORY }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error al ejecutar el simulador: ${error.message}`);
                return res.status(500).send({ message: 'Error al ejecutar el simulador' });
            }
            if (stderr) {
                console.error(`Error en el simulador: ${stderr}`);
            }
            console.log(`Resultado del simulador: ${stdout}`);

            // Ejecutar el comando mvn exec:java
            exec('mvn exec:java', { cwd: ENGINE_DIRECTORY }, (mvnError, mvnStdout, mvnStderr) => {
                if (mvnError) {
                    console.error(`Error al ejecutar mvn exec:java: ${mvnError.message}`);
                    return res.status(500).send({ message: 'Error al ejecutar mvn exec:java' });
                }
                if (mvnStderr) {
                    console.error(`Error en mvn exec:java: ${mvnStderr}`);
                }
                console.log(`Resultado de mvn exec:java: ${mvnStdout}`);

                // Eliminar todos los archivos de la carpeta "files"
                fs.readdir(FILES_DIRECTORY, (err, files) => {
                    if (err) {
                        console.error(`Error al leer la carpeta: ${err.message}`);
                        return res.status(500).send({ message: 'Error al leer la carpeta de archivos' });
                    }

                    // Iterar sobre los archivos y eliminarlos
                    files.forEach(file => {
                        const filePath = path.join(FILES_DIRECTORY, file);
                        fs.unlink(filePath, (unlinkErr) => {
                            if (unlinkErr) {
                                console.error(`Error al eliminar el archivo: ${filePath}`, unlinkErr);
                            } else {
                                console.log(`Archivo eliminado: ${filePath}`);
                            }
                        });
                    });

                    // Enviar la respuesta después de eliminar los archivos
                    res.status(200).send({ message: 'Archivo guardado, simulador y mvn exec:java ejecutados exitosamente. Todos los archivos eliminados.' });
                });
            });
        });
    });
};

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

        // Nuevas propiedades añadidas
        if (req.body.NumberOfExecutions !== undefined) security.NumberOfExecutions = req.body.NumberOfExecutions;
        if (req.body.AverageTimeEstimate !== undefined) security.AverageTimeEstimate = req.body.AverageTimeEstimate;
        if (req.body.Instance !== undefined) security.Instance = req.body.Instance;

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
