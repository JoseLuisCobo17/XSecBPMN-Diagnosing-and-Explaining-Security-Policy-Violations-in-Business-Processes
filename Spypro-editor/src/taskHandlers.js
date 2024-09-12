const axios = require('axios');

function getSecurityTasks(bpmnModeler) {
  var elementRegistry = bpmnModeler.get('elementRegistry');
  var definitions = bpmnModeler.get('canvas').getRootElement().businessObject.$parent;
  var id_model = definitions.diagrams[0].id;
  var serviceTasks = elementRegistry.filter(e => e.type === 'bpmn:ServiceTask');
  var serviceTaskBusinessObjects = serviceTasks.map(e => e.businessObject);

  var res = [];
  serviceTaskBusinessObjects.forEach(function(element) {
    var list = element.outgoing;
    var subTasks = [];
    if (list) {
      list.forEach(function(task) {
        subTasks.push(task.targetRef.id);
      });
    }
    var st = {
      id_model: id_model,
      id_bpmn: element.id,
      Bod: element.Bod || false,
      Sod: element.Sod || false,
      Uoc: element.Uoc || false,
      Nu: element.Nu || 0,
      Mth: element.Mth || 0,
      P: element.P || 0,
      User: element.User || "",
      Log: element.Log || "",
      SubTasks: subTasks
    };

    res.push(st);
  });

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
      console.log('ModSecurity rules generated and posted successfully:', response.data);
      return response.data;
    })
    .catch(error => {
      console.error('Error posting ModSecurity rules:', error);
      throw error;
    });
}

function esperRules(bpmnModeler) {
  const args = {
    data: { modSecurity: getSecurityTasks(bpmnModeler) }, 
    headers: { "Content-Type": "application/json" }
  };
  return axios.post("http://localhost:3000/esperrules", args.data, { headers: args.headers })
    .then(response => {
      console.log('EsperRules generated and posted successfully:', response.data);
      return response.data;
    })
    .catch(error => {
      console.error('Error posting EsperRules:', error);
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
