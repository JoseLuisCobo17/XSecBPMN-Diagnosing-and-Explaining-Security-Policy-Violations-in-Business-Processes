import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import '@bpmn-io/properties-panel/assets/properties-panel.css';
import './style.less';

import $ from 'jquery';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { debounce } from 'min-dash';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel';
import diagramXML from '../resources/newDiagram.bpmn';
import securityDrawModule from '../lib/security/draw';
import securityPaletteModule from '../lib/security/palette';
import resizeAllModule from '../lib/resize-all-rules';

const axios = require('axios');

const fs = require('fs');
const path = require('path');

var propertiesProviderModule = require('../provider/security');
var securityModdleDescriptor = require('../descriptors/security.json');

var container = $('#js-drop-zone');
var canvas = $('#js-canvas');
var propertiesPanelModule = require('bpmn-js-properties-panel');

var bpmnModeler = new BpmnModeler({
  container: canvas,
  propertiesPanel: {
    parent: '#js-properties-panel'
  },
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    propertiesPanelModule,
    propertiesProviderModule,
    securityPaletteModule,
    securityDrawModule,
    resizeAllModule,
  ],
  moddleExtensions: {
    security: securityModdleDescriptor
  }
});

container.removeClass('with-diagram');

function createNewDiagram() {
  openDiagram(diagramXML);
}

async function openDiagram(xml) {
  console.log('Opening diagram...');
  try {
    await bpmnModeler.importXML(xml);
    console.log('Diagram imported successfully.');
    container
      .removeClass('with-error')
      .addClass('with-diagram');
  } catch (err) {
    console.error('Error during importXML:', err);
    container
      .removeClass('with-diagram')
      .addClass('with-error');
    container.find('.error pre').text(err.message);
  }
}

function registerFileDrop(container, callback) {
  function handleFileSelect(e) {
    e.stopPropagation();
    e.preventDefault();

    var files = e.dataTransfer.files;
    var file = files[0];
    var reader = new FileReader();

    reader.onload = function(e) {
      var xml = e.target.result;
      callback(xml);
    };

    reader.readAsText(file);
  }

  function handleDragOver(e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  container.get(0).addEventListener('dragover', handleDragOver, false);
  container.get(0).addEventListener('drop', handleFileSelect, false);
}

function getSecurityTasks() {
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

function getAllTasks() {
  var elementRegistry = bpmnModeler.get('elementRegistry');
  var definitions = bpmnModeler.get('canvas').getRootElement().businessObject.$parent;
  var id_model = definitions.diagrams[0].id;

  // Filtrar todas las tareas en lugar de solo ServiceTasks
  var allTasks = elementRegistry.filter(e => e.type && e.type.startsWith('bpmn:'));

  var res = [];
  allTasks.forEach(function(element) {
    var businessObject = element.businessObject;
    var list = businessObject.outgoing;
    var subTasks = [];
    if (list) {
      list.forEach(function(task) {
        subTasks.push(task.targetRef.id);
      });
    }

    // Recolectar la información relevante de cada tarea
    var task = {
      id_model: id_model,
      id_bpmn: businessObject.id,
      name: businessObject.name || "",  // Nombre de la tarea si existe
      type: businessObject.$type || "",  // Tipo de tarea (por ejemplo, bpmn:UserTask)
      Bod: businessObject.Bod || false,
      Sod: businessObject.Sod || false,
      Uoc: businessObject.Uoc || false,
      Nu: businessObject.Nu || 0,
      Mth: businessObject.Mth || 0,
      P: businessObject.P || 0,
      User: businessObject.User || "",
      Log: businessObject.Log || "",
      SubTasks: subTasks
    };

    res.push(task);
  });

  return res;
}

function modSecurity() {
  const args = {
    data: { modSecurity: getSecurityTasks() },
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

function esperRules() {
  const args = {
    data: { modSecurity: getSecurityTasks() }, 
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

function synDB() {
  const tasks = getSecurityTasks();
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

function saveJSON() {
  return new Promise((resolve, reject) => {
    try {
      const json = JSON.stringify(getSecurityTasks(), null, 2);
      console.log('Generated JSON:', json);
      resolve(json);
    } catch (err) {
      reject(err);
    }
  });
}

function getAllElements() {
  var elementRegistry = bpmnModeler.get('elementRegistry');
  var definitions = bpmnModeler.get('canvas').getRootElement().businessObject.$parent;
  var id_model = definitions.diagrams[0].id;

  // Obtener todos los elementos BPMN del diagrama
  var allElements = elementRegistry.filter(e => e.type && e.type.startsWith('bpmn:'));

  var res = [];
  allElements.forEach(function(element) {
    var businessObject = element.businessObject;
    var list = businessObject.outgoing;
    var subTasks = [];
    if (list) {
      list.forEach(function(task) {
        subTasks.push(task.targetRef.id);
      });
    }

    // Recolectar la información relevante de cada elemento
    var task = {
      id_model: id_model,
      id_bpmn: businessObject.id,
      name: businessObject.name || "",  // Nombre del elemento si existe
      type: businessObject.$type || "",  // Tipo de elemento (por ejemplo, bpmn:UserTask)
      Bod: businessObject.Bod || false,
      Sod: businessObject.Sod || false,
      Uoc: businessObject.Uoc || false,
      Nu: businessObject.Nu || 0,
      Mth: businessObject.Mth || 0,
      P: businessObject.P || 0,
      User: businessObject.User || "",
      Log: businessObject.Log || "",
      SubTasks: subTasks
    };

    res.push(task);
  });

  return res;
}

function exportToEsper() {
  return new Promise((resolve, reject) => {
    try {
      const elements = getAllElements();  // Usar getAllElements en lugar de getSecurityTasks

      let content = "### Esper Rules Export ###\n\n";
      elements.forEach(element => {
        content += `Element: [type=${element.type}, `;
        content += `name=${element.name}, `;  // Añadir el nombre del elemento
        content += `id_bpmn=${element.id_bpmn}, `;
        content += `sodSecurity=${element.Sod}, `;
        content += `bodSecurity=${element.Bod}, `;
        content += `uocSecurity=${element.Uoc}, `;
        content += `timestamp=${Date.now()}, `; 
        content += `nu=${element.Nu}, `;
        content += `mth=${element.Mth}, `;
        content += `p=${element.P}, `;
        content += `user=${element.User}, `;
        content += `log=${element.Log}, `;
        content += `subTask=${element.SubTasks.join(', ')}]\n`;  
      });

      if (elements.length === 0) {
        content += "No elements generated.\n";
      }

      console.log('Generated content for Esper:', content);
      
      resolve(content);  // Devolver el contenido en lugar de descargarlo automáticamente
    } catch (err) {
      reject(err);
    }
  });
}

$(function() {
  // Rest of the code...

  $('#js-download-esper').click(async function(e) {
    e.stopPropagation();
    e.preventDefault();

    try {
      const content = await exportToEsper();
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'esperTasks.txt';
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.log('Error al exportar a Esper:', err);
    }
  });

  // Adjusted exportArtifacts function
  var exportArtifacts = debounce(async function() {
    try {
      const { svg } = await bpmnModeler.saveSVG();
      setEncoded(downloadSvgLink, 'diagram.svg', svg);
    } catch (err) {
      console.error('Error al guardar SVG: ', err);
      setEncoded(downloadSvgLink, 'diagram.svg', null);
    }
  
    try {
      const { xml } = await bpmnModeler.saveXML({ format: true });
      setEncoded(downloadLink, 'diagram.bpmn', xml);
    } catch (err) {
      console.log('Error al guardar XML: ', err);
      setEncoded(downloadLink, 'diagram.bpmn', null);
    }
  
    try {
      const json = await saveJSON();
      setEncoded(downloadJsonLink, 'diagram.json', json);
    } catch (err) {
      console.log('Error al guardar JSON: ', err);
      setEncoded(downloadJsonLink, 'diagram.json', null);
    }

    // No descarga automática para Esper, solo actualiza el contenido
    try {
      const content = await exportToEsper();
      setEncoded(downloadEsperLink, 'esperTasks.txt', content);  // Cambia la extensión a .txt
    } catch (err) {
      console.log('Error al preparar Esper:', err);
      setEncoded(downloadEsperLink, 'esperTasks.txt', null);
    }
  }, 500);

  // Other event handlers...
});

function updateModSecurityFile() {
  modSecurity()
  esperRules()
    .then(() => {
      console.log('ModSecurity and esperRules file updated.');
    })
    .catch(() => {
      console.error('Error updating ModSecurity/esperRules file.');
    });
}

if (!window.FileList || !window.FileReader) {
  window.alert(
    'Parece que usas un navegador antiguo que no soporta arrastrar y soltar. ' +
    'Prueba usar Chrome, Firefox o Internet Explorer > 10.');
} else {
  registerFileDrop(container, openDiagram);
}

$(function() {
  $('#js-create-diagram').click(function(e) {
    e.stopPropagation();
    e.preventDefault();
    createNewDiagram();
  });

  var downloadLink = $('#js-download-diagram');
  var downloadSvgLink = $('#js-download-svg');
  var downloadJsonLink = $('#js-download-json');
  var downloadEsperLink = $('#js-download-esper');

  let isExporting = false;

  $('#button1').click(function(){
    if (isExporting) {
      return;
    }

    isExporting = true;
    $(this).prop('disabled', true);

    modSecurity()
      .then(() => {
        alert('Exportado a modSecurity en la carpeta de Descargas');
      })
      .catch(() => {
        alert('Error al exportar a modSecurity');
      })
      .finally(() => {
        isExporting = false;
        $(this).prop('disabled', false);
      });
  });

  $('#button2').click(function(){
    alert("Sincronizado con mongoDB");
    synDB();
  });

  $('#button3').click(function(){
    if (isExporting) {
      return;
    }

    isExporting = true;
    $(this).prop('disabled', true);

    esperRules()
      .then(() => {
        alert('Exportado a esperRules en la carpeta de esperRules');
      })
      .catch(() => {
        alert('Error al exportar a esperRules');
      })
      .finally(() => {
        isExporting = false;
        $(this).prop('disabled', false);
      });
  });

  $('.buttons a').click(function(e) {
    if (!$(this).is('.active')) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  function setEncoded(link, name, data) {
    var encodedData = encodeURIComponent(data);
    console.log('Data:', data);
    console.log('Encoded Data:', encodedData);

    if (data) {
      link.addClass('active').attr({
        'href': 'data:application/json;charset=UTF-8,' + encodedData,
        'download': name
      });
    } else {
      link.removeClass('active');
    }
  }

  var exportArtifacts = debounce(async function() {
    try {
      const { svg } = await bpmnModeler.saveSVG();
      setEncoded(downloadSvgLink, 'diagram.svg', svg);
    } catch (err) {
      console.error('Error al guardar SVG: ', err);
      setEncoded(downloadSvgLink, 'diagram.svg', null);
    }
  
    try {
      const { xml } = await bpmnModeler.saveXML({ format: true });
      setEncoded(downloadLink, 'diagram.bpmn', xml);
    } catch (err) {
      console.log('Error al guardar XML: ', err);
      setEncoded(downloadLink, 'diagram.bpmn', null);
    }
  
    try {
      const json = await saveJSON();
      setEncoded(downloadJsonLink, 'diagram.json', json);
    } catch (err) {
      console.log('Error al guardar JSON: ', err);
      setEncoded(downloadJsonLink, 'diagram.json', null);
    }
  
    try {
      const fileName = await exportToEsper();
      setEncoded(downloadEsperLink, fileName, fileName);
    } catch (err) {
      console.log('Error al guardar en Esper: ', err);
      setEncoded(downloadEsperLink, 'diagram.txt', null);
    }
  }, 500);  

  bpmnModeler.on('commandStack.changed', () => {
    exportArtifacts(); // Actualiza archivos descargables
    updateModSecurityFile(); // Actualiza el archivo modSecurity.txt
  });
});
