const axios = require('axios');

function getSecurityTasks(bpmnModeler) {
  var elementRegistry = bpmnModeler.get('elementRegistry');
  var definitions = bpmnModeler.get('canvas').getRootElement().businessObject.$parent;
  var id_model = definitions.diagrams[0].id;

  // Filtra solo las tareas relevantes
  var serviceTasks = elementRegistry.filter(e => e.type === 'bpmn:ServiceTask');
  var serviceTaskBusinessObjects = serviceTasks.map(e => e.businessObject);

  var res = [];

  // Procesa cada tarea de servicio para capturar sus propiedades
  serviceTaskBusinessObjects.forEach(function(element) {
    var list = element.outgoing;
    var subTasks = [];

    if (!list || list.length === 0) {
      console.warn(`No hay conexiones salientes (outgoing) para la tarea: ${element.id}`);
    } else {
      console.log(`Conexiones salientes para la tarea ${element.id}:`, list);
      list.forEach(function(task) {
        if (task.targetRef) {
          const subTaskElement = elementRegistry.get(task.targetRef.id);

          if (subTaskElement && subTaskElement.businessObject) {
            const targetType = subTaskElement.businessObject.$type;
            console.log('Tipo de tarea objetivo (targetType):', targetType); // Depuración para ver el tipo

            let userTask = 'N/A';
            let numberOfExecutions = 'N/A';
            let averageTimeEstimate = 'N/A';
            let instance = 'N/A';

            // Actualizamos la lógica para verificar si el objeto contiene el UserTask, NumberOfExecutions, AverageTimeEstimate e Instance
            if (targetType === 'bpmn:UserTask' || targetType === 'bpmn:Task') {
              const bo = subTaskElement.businessObject;
              console.log('Encontrado Task:', bo); // Depuración completa de la sub-tarea

              // Intentamos acceder a las diferentes propiedades
              userTask = bo.userTask || bo.UserTask || bo.assignee || bo.candidateUsers || bo.name || 'Unknown';
              numberOfExecutions = bo.numberOfExecutions || 'N/A';
              averageTimeEstimate = bo.averageTimeEstimate || 'N/A';
              instance = bo.instance || 'N/A';

              console.log('UserTask detectado:', userTask); // Depuración para ver el valor de userTask
              console.log('NumberOfExecutions detectado:', numberOfExecutions); // Depuración para ver el valor de numberOfExecutions
              console.log('AverageTimeEstimate detectado:', averageTimeEstimate); // Depuración para ver el valor de averageTimeEstimate
              console.log('Instance detectado:', instance); // Depuración para ver el valor de instance
            }

            subTasks.push({
              taskId: subTaskElement.id,
              UserTask: userTask,
              NumberOfExecutions: numberOfExecutions,
              AverageTimeEstimate: averageTimeEstimate,
              Instance: instance
            });
          } else {
            console.warn(`El targetRef existe pero no tiene un businessObject para la tarea con id: ${task.targetRef.id}`);
            subTasks.push({
              taskId: task.targetRef.id,
              UserTask: 'N/A',
              NumberOfExecutions: 'N/A',
              AverageTimeEstimate: 'N/A',
              Instance: 'N/A'
            });
          }
        } else {
          console.warn(`No se encontró targetRef para la tarea con id: ${task.id}`);
        }
      });
    }

    // Mostrar todas las propiedades del elemento
    console.log('ServiceTask BusinessObject completo:', JSON.stringify(element, null, 2));

    // Verifica el securityType y lo traduce a BoD, SoD y UoC
    var isBod = element.securityType === 'BoD';
    var isSod = element.securityType === 'SoD';
    var isUoc = element.securityType === 'UoC';

    // Verifica y asigna correctamente las propiedades de seguridad, incluyendo las nuevas propiedades
    var st = {
      id_model: id_model,
      id_bpmn: element.id,
      Bod: isBod ? true : false,
      Sod: isSod ? true : false,
      Uoc: isUoc ? true : false,
      Nu: element.Nu || 0,
      Mth: element.Mth || 0,
      P: element.P || 0,
      User: element.User || '',
      Log: element.Log || '',
      NumberOfExecutions: element.numberOfExecutions || 'N/A',
      AverageTimeEstimate: element.averageTimeEstimate || 'N/A',
      Instance: element.instance || 'N/A',
      SubTasks: subTasks.length > 0 ? subTasks : []
    };

    console.log('Tarea de seguridad procesada:', JSON.stringify(st, null, 2));

    res.push(st);
  });

  console.log('Security Tasks para enviar:', JSON.stringify(res, null, 2));

  return res;
}

function getAllRelevantTasks(bpmnModeler) {
  var elementRegistry = bpmnModeler.get('elementRegistry');
  var definitions = bpmnModeler.get('canvas').getRootElement().businessObject.$parent;
  var id_model = definitions.diagrams[0].id;

  var relevantElements = elementRegistry.filter(e =>
    e.type === 'bpmn:Task' ||
    e.type === 'bpmn:ServiceTask' ||
    e.type === 'bpmn:UserTask' ||
    e.type === 'bpmn:ManualTask' ||
    e.type === 'bpmn:StartEvent' ||
    e.type === 'bpmn:EndEvent' ||
    e.type.startsWith('bpmn:')
  );

  return relevantElements.map(e => {
    var businessObject = e.businessObject;
    var subTasks = businessObject.outgoing ? businessObject.outgoing.map(task => task.targetRef.id) : [];

    const isServiceTask = e.type === 'bpmn:ServiceTask';
    const isTask = e.type === 'bpmn:Task';
    const securityType = businessObject.securityType || '';

    return {
      id_model: id_model,
      id_bpmn: businessObject.id,
      name: businessObject.name || '',
      type: businessObject.$type || '',
      Bod: securityType === 'BoD',
      Sod: securityType === 'SoD',
      Uoc: securityType === 'UoC',
      Nu: isServiceTask ? (businessObject.Nu || 0) : 0,
      Mth: isServiceTask ? (businessObject.Mth || 0) : 0,
      P: isServiceTask ? (businessObject.P || 0) : 0,
      User: isServiceTask ? (businessObject.User || '') : '',
      UserTask: isTask ? (businessObject.UserTask || '') : '',
      Log: businessObject.Log || '',
      SubTasks: subTasks
    };
  });
}

function getTaskById(bpmnModeler, taskId) {
  const elementRegistry = bpmnModeler.get('elementRegistry');
  const element = elementRegistry.get(taskId);
  return element ? element.businessObject : null;
}

function esperRules(bpmnModeler) {
  return new Promise((resolve, reject) => {
    try {
      const elements = getAllRelevantTasks(bpmnModeler);
      const triggeredRules = [];

      elements.forEach(element => {
        const subTasks = element.SubTasks
          ? element.SubTasks.map(id => getTaskById(bpmnModeler, id)).filter(st => st !== null)
          : [];
        console.log('SubTasks for element', element.id_bpmn, subTasks);

        // Obtener los UserTask que no sean null, vacíos o "Unknown"
        const validUserTasks = subTasks.map(subTask => subTask.UserTask)
          .filter(userTask => userTask && userTask.trim() !== '' && userTask !== 'Unknown');

        // Calcular el número de usuarios únicos
        const uniqueUserCount = new Set(validUserTasks).size;

        // Determinar si los usuarios son los mismos o diferentes
        const usersAreSame = uniqueUserCount === 1;
        const usersAreDifferent = uniqueUserCount > 1;

        // Reglas BoD, SoD, y UoC (Ajustadas para detectar violaciones)
        const isBoDViolation = element.Bod === true && validUserTasks.length > 0 && usersAreDifferent;
        const isSoDViolation = element.Sod === true && validUserTasks.length >= 2 && usersAreSame;
        const isUoC = element.Uoc === true && element.Mth >= 4 && validUserTasks.length > 0;

        // Crear el objeto para esta tarea
        const triggeredRuleData = {
          id_bpmn: element.id_bpmn || 'Unknown',
          triggeredMessages: []
        };

        // Si se detecta una violación de BoD
        if (isBoDViolation && subTasks.length >= 2) {
          const subTask1Id = subTasks[0].id || subTasks[0];
          const subTask2Id = subTasks[1].id || subTasks[1];
          const user1 = subTasks[0].UserTask || "User1";
          const user2 = subTasks[1].UserTask || "User2";

          triggeredRuleData.triggeredMessages.push(
            `[BOD MONITOR] Binding of Duty violation detected:\n` +
            `- Parent Task ID: ${element.id_bpmn}\n` +
            `- SubTask 1 ID: ${subTask1Id} - User ID: ${user1}\n` +
            `- SubTask 2 ID: ${subTask2Id} - User ID: ${user2}\n` +
            `- Expected: Same user should perform both tasks.\n`
          );
        }

        // Si se detecta una violación de SoD
        if (isSoDViolation && subTasks.length >= 2) {
          const subTask1Id = subTasks[0].id || subTasks[0];
          const subTask2Id = subTasks[1].id || subTasks[1];
          const user = subTasks[0].UserTask || "No User Assigned"; // Mismo usuario

          triggeredRuleData.triggeredMessages.push(
            `[SOD MONITOR] Separation of Duties violation detected:\n` +
            `- Parent Task ID: ${element.id_bpmn}\n` +
            `- SubTask 1 ID: ${subTask1Id}\n` +
            `- SubTask 2 ID: ${subTask2Id}\n` +
            `- User ID: ${user}\n` +
            `- Expected: Different users should perform the tasks.\n`
          );
        }

        // Si UoC se dispara, agregar texto correspondiente
        if (isUoC) {
          const userTaskCount = validUserTasks.reduce((acc, userTask) => {
            acc[userTask] = (acc[userTask] || 0) + 1;
            return acc;
          }, {});

          for (const [user, count] of Object.entries(userTaskCount)) {
            if (count >= element.Mth) {
              const taskIds = subTasks.map(subTask => subTask.id || subTask).join(", ");
              triggeredRuleData.triggeredMessages.push(
                `[UOC MONITOR] Usage of Control detected:\n` +
                `- Parent Task ID: ${element.id_bpmn}\n` +
                `- SubTasks IDs: ${taskIds}\n` +
                `- User ID: ${user}\n` +
                `- Maximum allowed executions (Mth >= 4): ${element.Mth}\n`
              );
            }
          }
        }

        // Solo agregar la tarea si alguna regla se disparó
        if (triggeredRuleData.triggeredMessages.length > 0) {
          triggeredRules.push(triggeredRuleData);
        }
      });

      // Si no hay reglas que se disparen
      if (triggeredRules.length === 0) {
        triggeredRules.push({ message: 'No rules triggered.' });
      }

      console.log('Triggered Rules:', triggeredRules);

      // Convertir a JSON y resolver la promesa
      resolve(JSON.stringify(triggeredRules, null, 2));
    } catch (err) {
      reject(err);
    }
  });
}

function deployRules(bpmnModeler) {
  return new Promise((resolve, reject) => {
    try {
      const elements = getAllRelevantTasks(bpmnModeler);

      const jsonContent = [];

      elements.forEach(element => {
        if (element.Sod === true || element.Bod === true || element.Uoc === true) {
          const elementData = {
            type: element.type,
            name: element.name || 'Unnamed',
            id_bpmn: element.id_bpmn || 'Unknown',
            sodSecurity: element.Sod || false,
            bodSecurity: element.Bod || false,
            uocSecurity: element.Uoc || false,
            timestamp: Date.now(),
            nu: element.Nu,
            mth: element.Mth,
            p: element.P,
            userTask: element.type === 'bpmn:Task' ? element.UserTask || 'N/A' : undefined,
            user: element.type === 'bpmn:Task' ? element.User || 'N/A' : undefined,
            log: element.Log || 'N/A',
            subTasks: element.SubTasks ? element.SubTasks : 'No SubTasks'
          };

          jsonContent.push(elementData);
        }
      });

      // Si no hay elementos relevantes
      if (jsonContent.length === 0) {
        jsonContent.push({ message: 'No relevant elements generated.' });
      }

      console.log('Generated content for Esper (JSON):', jsonContent);

      // Convertir a JSON
      resolve(JSON.stringify(jsonContent, null, 2));
    } catch (err) {
      reject(err);
    }
  });
}

function exportToEsper(bpmnModeler) {
  return new Promise((resolve, reject) => {
    try {
      const elements = getAllRelevantTasks(bpmnModeler);

      let content = '### Esper Rules Export ###\n\n';
      elements.forEach(element => {
        content += `Element: [type=${element.type}, `;
        content += `name=${element.name || 'Unnamed'}, `;
        content += `id_bpmn=${element.id_bpmn || 'Unknown'}, `;
        content += `sodSecurity=${element.Sod}, `;
        content += `bodSecurity=${element.Bod}, `;
        content += `uocSecurity=${element.Uoc}, `;
        content += `timestamp=${Date.now()}, `;
        content += `nu=${element.Nu}, `;
        content += `mth=${element.Mth}, `;
        content += `p=${element.P}, `;

        // Diferenciar entre Task y ServiceTask
        if (element.type === 'bpmn:Task') {
          content += `userTask=${element.UserTask || 'N/A'}, `;
          content += `user=${element.User || 'N/A'}, `;
        }

        content += `log=${element.Log || 'N/A'}, `;

        const subTasks = element.SubTasks ? element.SubTasks.join(', ') : 'No SubTasks';
        content += `subTask=${subTasks}]\n`;
      });

      if (elements.length === 0) {
        content += 'No elements generated.\n';
      }

      console.log('Generated content for Esper:', content);

      resolve(content);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  getSecurityTasks,
  getAllRelevantTasks,
  esperRules,
  deployRules,
  exportToEsper
};
