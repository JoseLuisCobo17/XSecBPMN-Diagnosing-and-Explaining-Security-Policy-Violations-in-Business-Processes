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
  serviceTaskBusinessObjects.forEach(function (element) {
    var list = element.outgoing;
    var subTasks = [];

    if (!list || list.length === 0) {
      console.warn(`No hay conexiones salientes (outgoing) para la tarea: ${element.id}`);
    } else {
      console.log(`Conexiones salientes para la tarea ${element.id}:`, list);
      list.forEach(function (task) {
        if (task.targetRef) {
          const subTaskElement = elementRegistry.get(task.targetRef.id);

          if (subTaskElement && subTaskElement.businessObject) {
            const targetType = subTaskElement.businessObject.$type;
            console.log('Tipo de tarea objetivo (targetType):', targetType); // Depuración para ver el tipo

            let userTask = "N/A";

            // Actualizamos la lógica para verificar si el objeto contiene el UserTask
            if (targetType === "bpmn:UserTask" || targetType === "bpmn:Task") {
              const bo = subTaskElement.businessObject;
              console.log('Encontrado Task:', bo); // Depuración completa de la sub-tarea
              
              // Intentamos acceder a diferentes propiedades donde puede estar el valor del usuario
              userTask = bo.userTask || bo.UserTask || bo.assignee || bo.candidateUsers || bo.name || "Unknown";
              console.log('UserTask detectado:', userTask); // Depuración para ver el valor de userTask
            }

            subTasks.push({
              taskId: subTaskElement.id,
              UserTask: userTask
            });
          } else {
            console.warn(`El targetRef existe pero no tiene un businessObject para la tarea con id: ${task.targetRef.id}`);
            subTasks.push({
              taskId: task.targetRef.id,
              UserTask: "N/A"
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
    var isBod = element.securityType === "BoD";
    var isSod = element.securityType === "SoD";
    var isUoc = element.securityType === "UoC";

    // Verifica y asigna correctamente las propiedades de seguridad
    var st = {
      id_model: id_model,
      id_bpmn: element.id,
      Bod: isBod ? true : false,
      Sod: isSod ? true : false,
      Uoc: isUoc ? true : false,
      Nu: element.Nu || 0,
      Mth: element.Mth || 0,
      P: element.P || 0,
      User: element.User || "",
      Log: element.Log || "",
      SubTasks: subTasks.length > 0 ? subTasks : []  // Si no se encontraron subTasks, deja el arreglo vacío
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
      name: businessObject.name || "",  
      type: businessObject.$type || "",  
      Bod: securityType === 'BoD', 
      Sod: securityType === 'SoD', 
      Uoc: securityType === 'UoC', 
      Nu: isServiceTask ? (businessObject.Nu || 0) : 0,
      Mth: isServiceTask ? (businessObject.Mth || 0) : 0,
      P: isServiceTask ? (businessObject.P || 0) : 0,
      User: isServiceTask ? (businessObject.User || "") : "",
      UserTask: isTask ? (businessObject.UserTask || "") : "",
      Log: businessObject.Log || "",
      SubTasks: subTasks
    };
  });
}


function modSecurity(bpmnModeler) {
  const args = {
    data: { modSecurity: getSecurityTasks(bpmnModeler) },
    headers: { "Content-Type": "application/json" }
  };
  return axios.post("http://localhost:3000/modsecurity", args.data, { headers: args.headers })
    .then(response => {
      return response.data;
    })
    .catch(error => {
      throw error;
    });
}

function esperRules(bpmnModeler) {
  // Capturar tareas con propiedades de seguridad
  const securityTasks = getSecurityTasks(bpmnModeler);
  
  // Definir los argumentos para la solicitud POST
  const args = {
    data: { modSecurity: securityTasks }, 
    headers: { "Content-Type": "application/json" }
  };
  
  // Realizar la solicitud POST a la API de EsperRules
  return axios.post("http://localhost:3000/esperrules", args.data, { headers: args.headers })
    .then(response => {
      return response.data;
    })
    .catch(error => {
      throw error;
    });
}

function synDB(bpmnModeler) {
  const tasks = getSecurityTasks(bpmnModeler);
  console.log('Tasks to be synchronized:', tasks);
  axios.post("http://localhost:3000/syndb", { modSecurity: tasks }, {
    headers: {
      "Content-Type": "application/json"
    }
  }).then(function (response) {
    console.log('Sync response:', response.data);
  }).catch(function (error) {
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('Request data:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    console.error('Config:', error.config);
  });
}

function saveJSON(bpmnModeler) {
  return new Promise((resolve, reject) => {
    try {
      const json = JSON.stringify(getSecurityTasks(bpmnModeler), null, 2);
      console.log('Generated JSON:', json);
      resolve(json);
    } catch (err) {
      reject(err);
    }
  });
}

function exportToEsper(bpmnModeler) {
  return new Promise((resolve, reject) => {
    try {
      const elements = getAllRelevantTasks(bpmnModeler);

      let content = "### Esper Rules Export ###\n\n";
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
        content += "No elements generated.\n";
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
  modSecurity,
  esperRules,
  synDB,
  saveJSON,
  exportToEsper
};
