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
//import propertiesProviderModule from '../provider/security';
//import securityModdleDescriptor from '../descriptors/security.json';

const axios = require('axios');

var propertiesProviderModule = require('../provider/security');
var securityModdleDescriptor = require('../descriptors/security.json');

var container = $('#js-drop-zone');
var canvas = $('#js-canvas');

var propertiesPanelModule = require('bpmn-js-properties-panel');
var securityPaletteModule = require('../lib/security/palette');

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
      Bod: element.Bod || false, // Asegúrate de que es "Bod" aquí
      SoD: element.SoD || false,
      UoC: element.UoC || false,
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

function modSecurity() {
  var client = new Client();
  var args = {
    data: { modSecurity: getSecurityTasks() },
    headers: { "Content-Type": "application/json" }
  };
  client.registerMethod("postMethod", "http://localhost:3000/modsecurity", "POST");
  client.methods.postMethod(args, function (data, response) {
  });
}

function synDB() {
  const tasks = getSecurityTasks();
  console.log('Tasks to be synchronized:', tasks); // Log para depuración
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

function saveJSON(done) {
  var json = JSON.stringify(getSecurityTasks(), null, 2);

  bpmnModeler.saveXML({ format: false }, function(err, xml) {
    done(err, json);
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

  $('#button1').click(function(){
    alert('Exportado a modSecurity en la carpeta de Descargas');
    $.ajax({url: modSecurity()});
  });

  $('#button2').click(function(){
    alert("Sincronizado con mongoDB");
    $.ajax({url: synDB()});
  });

  $('.buttons a').click(function(e) {
    if (!$(this).is('.active')) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  function setEncoded(link, name, data) {
    var encodedData = encodeURIComponent(data);

    if (data) {
      link.addClass('active').attr({
        'href': 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData,
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

    saveJSON(function(err, json) {
      setEncoded(downloadJsonLink, 'diagram.json', err ? null : json);
    });
  }, 500);

  bpmnModeler.on('commandStack.changed', exportArtifacts);
});