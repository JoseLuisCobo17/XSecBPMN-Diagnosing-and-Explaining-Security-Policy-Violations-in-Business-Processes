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

            let userTask = '""';
            let numberOfExecutions = '1';
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
    e.type === 'bpmn:Process' ||
    e.type === 'bpmn:Collaboration' ||
    e.type === 'bpmn:Participant' ||
    e.type === 'bpmn:SequenceFlow' ||
    e.type === 'bpmn:MessageFlow' ||
    e.type === 'bpmn:IntermediateCatchEvent' ||
    e.type === 'bpmn:DataObjectReference' ||
    e.type === 'bpmn:BoundaryEvent' ||
    e.type === 'bpmn:DataInputAssociation' ||
    e.type === 'bpmn:DataOutputAssociation' ||
    e.type.startsWith('bpmn:')
  );

  return relevantElements.map(e => {
    var businessObject = e.businessObject;

let isMessageStartEvent = e.type === 'bpmn:StartEvent' && 
    businessObject.eventDefinitions && 
    businessObject.eventDefinitions.some(def => def.$type === 'bpmn:MessageEventDefinition');

let isTimerStartEvent = e.type === 'bpmn:StartEvent' && 
    businessObject.eventDefinitions && 
    businessObject.eventDefinitions.some(def => def.$type === 'bpmn:TimerEventDefinition');

let isMessageIntermediateCatchEvent = e.type === 'bpmn:IntermediateCatchEvent' && 
    businessObject.eventDefinitions && 
    businessObject.eventDefinitions.some(def => def.$type === 'bpmn:MessageEventDefinition');

let isTimerIntermediateCatchEvent = e.type === 'bpmn:IntermediateCatchEvent' && 
    businessObject.eventDefinitions && 
    businessObject.eventDefinitions.some(def => def.$type === 'bpmn:TimerEventDefinition');

let type = e.type;
if (isMessageStartEvent) {
    type = 'bpmn:MessageStartEvent';
} else if (isTimerStartEvent) {
    type = 'bpmn:TimerStartEvent';
} else if (isMessageIntermediateCatchEvent) {
    type = 'bpmn:MessageIntermediateCatchEvent';
} else if (isTimerIntermediateCatchEvent) {
    type = 'bpmn:TimerIntermediateCatchEvent';
} else {
}

    var subTasks = [];
    var subElement = null;
    var superElement = null;

    if (e.type === 'bpmn:DataInputAssociation') {
      superElement = businessObject.sourceRef && businessObject.sourceRef.length > 0
          ? businessObject.sourceRef.map(source => source.id).join(', ')
          : 'No Super Element';
      const targetTask = elementRegistry.find(el =>
          el.businessObject.dataInputAssociations &&
          el.businessObject.dataInputAssociations.some(assoc => assoc.id === businessObject.id)
      );
      subElement = targetTask ? targetTask.businessObject.id : 'No Sub Element';
  } else if (e.type === 'bpmn:DataOutputAssociation') {
      subElement = businessObject.targetRef ? businessObject.targetRef.id : '';
  
      const parentTask = elementRegistry.find(el =>
          el.businessObject.dataOutputAssociations &&
          el.businessObject.dataOutputAssociations.some(assoc => assoc.id === businessObject.id)
      );
      superElement = parentTask ? [parentTask.businessObject.id].join(', ') : 'No Super Element';
  
      console.log(`Elemento: ${businessObject.id}, superElement: ${superElement}, subElement: ${subElement}`);   
    } else if (e.type === 'bpmn:BoundaryEvent' && businessObject.attachedToRef) {
      const attachedTask = businessObject.attachedToRef;
      subElement = attachedTask.outgoing ? attachedTask.outgoing.map(flow => flow.targetRef.id).join(', ') : '';
      superElement = attachedTask.incoming ? attachedTask.incoming.map(flow => flow.sourceRef.id) : [];
    } else if (e.type === 'bpmn:SequenceFlow' || e.type === 'bpmn:MessageFlow') {
      subElement = businessObject.targetRef ? businessObject.targetRef.id : '';
      superElement = businessObject.sourceRef ? [businessObject.sourceRef.id] : [];
    } else {
      subTasks = businessObject.outgoing ? businessObject.outgoing.map(task => task.targetRef.id) : [];
      subElement = subTasks.join(', ');
      superElement = businessObject.incoming ? businessObject.incoming.map(flow => flow.sourceRef.id) : [];
    }

    const isServiceTask = e.type === 'bpmn:ServiceTask';
    const isUserTask = e.type === 'bpmn:UserTask';
    const isTask = e.type === 'bpmn:Task' || isUserTask;
    const isProcess = e.type === 'bpmn:Process';
    const isCollaboration = e.type === 'bpmn:Collaboration';
    const isParticipant = e.type === 'bpmn:Participant';
    const isSequenceFlow = e.type === 'bpmn:SequenceFlow' || e.type === 'bpmn:MessageFlow';
    const securityType = businessObject.securityType || '';
    const percentageOfBranches = isSequenceFlow ? (businessObject.percentageOfBranches || 0) : 0;

    let time = null;
    if (businessObject.eventDefinitions && businessObject.eventDefinitions.length > 0) {
      const timerEventDef = businessObject.eventDefinitions.find(def => def.$type === 'bpmn:TimerEventDefinition');
      if (timerEventDef && timerEventDef.timeDuration) {
        time = timerEventDef.timeDuration.body || '';
      }
    }

    const userTasks = Array.isArray(businessObject.UserTask) ? businessObject.UserTask : [businessObject.UserTask || ''];
    const numberOfExecutions = businessObject.NumberOfExecutions || 0;
    const minimumTime = businessObject.minimumTime || 0;
    const maximumTime = businessObject.maximumTime || 0;

    let instance = ''; 
    let security = false; 
    let userWithRole = {};
    let userWithoutRoleSet = new Set();
    let frequency = 0;

    if (e.type === 'bpmn:Collaboration') {
      const participants = businessObject.participants || [];
      participants.forEach(participant => {
        const processRef = participant.processRef;
        if (processRef) {
          if (processRef.instance !== undefined) {
            instance = processRef.instance;
          }
          if (processRef.security !== undefined) {
            security = processRef.security;
          }
        }
      });
    } else if (e.type === 'bpmn:Participant') {
      const processRef = businessObject.processRef;
      if (processRef) {
        if (processRef.instance !== undefined) {
          instance = processRef.instance;
        }
        if (processRef.userWithRole) {
          userWithRole = processRef.userWithRole;
        }
        if (processRef.userWithoutRole) {
          processRef.userWithoutRole.split(',').forEach(role => userWithoutRoleSet.add(role.trim()));
        }
        if (processRef.frequency !== undefined) {
          frequency = processRef.frequency;
        }
      }
    } else if (e.type === 'bpmn:Process') {
      if (businessObject.instance !== undefined) {
        instance = businessObject.instance;
      }
      if (businessObject.userWithRole) {
        userWithRole = businessObject.userWithRole;
      }
      if (businessObject.userWithoutRole) {
        businessObject.userWithoutRole.split(',').forEach(role => userWithoutRoleSet.add(role.trim()));
      }
      if (businessObject.frequency !== undefined) {
        frequency = businessObject.frequency;
      }
    } else {
      instance = businessObject.instance || '';
    }

    const userWithoutRole = Array.from(userWithoutRoleSet).join(', ');

    return {
      id_model: id_model,
      id_bpmn: businessObject.id,
      name: businessObject.name || '',
      type: businessObject.$type || '',
      Bod: securityType === 'BoD',
      Sod: securityType === 'SoD',
      Uoc: securityType === 'UoC',
      Mth: isServiceTask ? (businessObject.Mth || 0) : 0,
      P: isServiceTask ? (businessObject.P || 0) : 0,
      User: isServiceTask ? (businessObject.User || '') : '',
      UserTask: (isTask || isUserTask) ? (userTasks.join(', ') || '') : '',
      Log: businessObject.Log || '',
      SubTasks: subTasks,
      subElement: subElement,
      superElement: superElement,
      Instances: isProcess || isCollaboration || isParticipant ? (instance || 0) : 0,
      Frequency: isProcess || isCollaboration || isParticipant ? (frequency || 0) : 0,
      PercentageOfBranches: percentageOfBranches,
      NumberOfExecutions: numberOfExecutions,
      MinimumTime: minimumTime,
      MaximumTime: maximumTime,
      UserInstance: instance,
      security: security,
      time: time,
      userWithoutRole: isProcess || isCollaboration || isParticipant ? userWithoutRole : '',
      userWithRole: userWithRole ,
      type: type,
    };
  });
}

function exportToEsper(bpmnModeler) {
  return new Promise((resolve, reject) => {
    try {
      const elements = getAllRelevantTasks(bpmnModeler);

      let content = '### Esper Rules Export ###\n\n';
      elements.forEach(element => {

        if (element.type === 'bpmn:StartEvent' && 
            element.businessObject &&
            element.businessObject.eventDefinitions &&
            element.businessObject.eventDefinitions.length > 0 &&
            element.businessObject.eventDefinitions[0].$type === 'bpmn:MessageEventDefinition') {
          content += `Element: [type=bpmn:MessageStartEvent, `;
        } else {
          content += `Element: [type=${element.type}, `;
        }

        content += `name="${element.name || 'Unnamed'}", `;
        content += `id_bpmn="${element.id_bpmn || 'Unknown'}", `;        

        if (element.time) {
          content += `time=${element.time}, `;
        }

        if (element.type === 'bpmn:SequenceFlow' || element.type === 'bpmn:MessageFlow' ||
          element.type === 'bpmn:DataObjectReference' || element.type === 'bpmn:BoundaryEvent' ||
          element.type === 'bpmn:DataInputAssociation' || element.type === 'bpmn:DataOutputAssociation') {

            if (element.PercentageOfBranches && element.PercentageOfBranches !== 'N/A') {
              content += `percentageOfBranches=${element.PercentageOfBranches}, `;
            }
          
          const superElement = typeof element.superElement === 'string' 
            ? element.superElement 
            : (Array.isArray(element.superElement) ? element.superElement.join(', ') : 'No Super Element');
          const subElement = element.subElement || 'No Sub Element';

          content += `superElement="${superElement}", `;
          content += `subElement="${subElement}"]\n`;
        } else if (element.type === 'bpmn:ServiceTask') {
          content += `sodSecurity=${element.Sod}, `;
          content += `bodSecurity=${element.Bod}, `;
          content += `uocSecurity=${element.Uoc}, `;
          const subTasks = element.SubTasks ? element.SubTasks.join(', ') : 'No SubTasks';
          content += `subTask="${subTasks}"]\n`;
        } else if (element.type === 'bpmn:ServiceTask' && element.businessObject.securityType === 'UoC') {
          content += `sodSecurity=${element.Sod}, `;
          content += `bodSecurity=${element.Bod}, `;
          content += `uocSecurity=${element.Uoc}, `;
          content += `mth=${element.Mth}, `;
          const subTasks = element.SubTasks ? element.SubTasks.join(', ') : 'No SubTasks';
          content += `subTask="${subTasks}"]\n`;
        } else if (element.type === 'bpmn:Task' || element.type === 'bpmn:UserTask' || element.type === 'bpmn:ManualTask'
          || element.type === 'bpmn:SendTask' || element.type === 'bpmn:ReceiveTask' || element.type === 'bpmn:BusinessRuleTask'
          || element.type === 'bpmn:ScriptTask' || element.type === 'bpmn:CallActivity'
        ) {
          content += `userTask="${element.UserTask || '""'}", `;
          content += `numberOfExecutions=${element.NumberOfExecutions}, `;
          content += `minimumTime=${element.MinimumTime}, `;
          content += `maximumTime=${element.MaximumTime}, `;
          const subTasks = element.SubTasks ? element.SubTasks.join(', ') : 'No SubTasks';
          content += `subTask="${subTasks}"]\n`;
        } else if (element.type === 'bpmn:Collaboration') {
          content += `instances=${element.Instances}, `;
          content += `security=${element.security}]\n`;
        } else if (element.type === 'bpmn:Process' || element.type === 'bpmn:Participant') {
          content += `instances=${element.Instances}, `;
          content += `frequency=${element.Frequency}, `;

          const userWithoutRole = element.userWithoutRole ? 
            element.userWithoutRole.split(', ').map(user => `"${user}"`).join(', ') : '""';
          content += `userWithoutRole=[${userWithoutRole}], `;

          const userWithRole = element.userWithRole ? 
            Object.entries(element.userWithRole).map(([role, users]) => 
              `"${role}": [${users.split(', ').map(u => `"${u}"`).join(', ')}]`).join(', ') : '{}';
          content += `userWithRole={${userWithRole}}]\n`;
        } else {
          const subTasks = element.SubTasks ? element.SubTasks.join(', ') : 'No SubTasks';
          content += `subTask="${subTasks}"]\n`;
        }
      });

      if (elements.length === 0) {
        content += 'No elements generated.\n';
      }

      resolve(content);
    } catch (err) {
      reject(err);
    }
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

      let eplStatements = "";

      // BoD rules
      const bodElements = elements.filter(element => element.Bod === true);
      if (bodElements.length > 0) {
        console.log("Creando expresión generalizada de BoD");

        const bodEPL = `"select parent.idBpmn as parentId, " 
    "sub1.idBpmn as subTask1Id, sub2.idBpmn as subTask2Id, " 
    "sub1.user as user1, sub2.user as user2 " 
    "from Task#keepall as parent, Task#keepall as sub1, Task#keepall as sub2 " 
    "where parent.bodSecurity = true " 
    "and sub1.user is not null and sub2.user is not null " 
    "and sub1.user = sub2.user " 
    "and sub1.idBpmn != sub2.idBpmn " 
    "and sub1.idBpmn in (parent.subTasks) " 
    "and sub2.idBpmn in (parent.subTasks)"
    
    --------------------------------------
    `;

        eplStatements += bodEPL;
      }

      // SoD rules
      const sodElements = elements.filter(element => element.Sod === true);
      if (sodElements.length > 0) {
        console.log("Creando expresión generalizada de SoD");

        const sodEPL = ` "select parent.idBpmn as parentId, " 
    "sub1.idBpmn as subTask1Id, sub2.idBpmn as subTask2Id, " 
    "sub1.user as user1, sub2.user as user2, " 
    "count(distinct sub1.user) as distinctUserCount " 
    "from Task#keepall as parent, Task#keepall as sub1, Task#keepall as sub2 " 
    "where parent.sodSecurity = true " 
    "and sub1.user = sub2.user " 
    "and sub1.idBpmn != sub2.idBpmn " 
    "and sub1.idBpmn in (parent.subTasks) " 
    "and sub2.idBpmn in (parent.subTasks) " 
    
    --------------------------------------
    `;

        eplStatements += sodEPL;
      }

      // UoC rules
      const uocElements = elements.filter(element => element.Uoc === true);
      if (uocElements.length > 0) {
        console.log("Creando expresión de UoC");

        const uocEPL = `"select user as userId, count(*) as taskCount " 
    "from Task#time(1 min) " 
    "where uocSecurity = true and mth >= 4"
    
    --------------------------------------
    `;

        eplStatements += uocEPL;
      }

      // Si no se generaron reglas
      if (eplStatements.trim() === "") {
        eplStatements = "No relevant rules generated.";
      }

      console.log('Generated EPL Statements:', eplStatements);

      // Resolver la promesa con las sentencias EPL generadas
      resolve(eplStatements);
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
