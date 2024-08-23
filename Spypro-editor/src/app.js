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

const {
  getSecurityTasks,
  getAllRelevantTasks,
  modSecurity,
  esperRules,
  synDB,
  saveJSON,
  exportToEsper
} = require('./taskHandlers');

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

$(function() {

  $('#js-download-esper').click(async function(e) {
    e.stopPropagation();
    e.preventDefault();

    try {
      const content = await exportToEsper(bpmnModeler);
      
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
      const json = await saveJSON(bpmnModeler);
      setEncoded(downloadJsonLink, 'diagram.json', json);
    } catch (err) {
      console.log('Error al guardar JSON: ', err);
      setEncoded(downloadJsonLink, 'diagram.json', null);
    }

    try {
      const content = await exportToEsper(bpmnModeler);
      setEncoded(downloadEsperLink, 'esperTasks.txt', content); 
    } catch (err) {
      console.log('Error al preparar Esper:', err);
      setEncoded(downloadEsperLink, 'esperTasks.txt', null);
    }
  }, 500);
});

function updateModSecurityFile() {
  modSecurity(bpmnModeler)
  esperRules(bpmnModeler)
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

    modSecurity(bpmnModeler)
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
    synDB(bpmnModeler);
  });

  $('#button3').click(function(){
    if (isExporting) {
      return;
    }

    isExporting = true;
    $(this).prop('disabled', true);

    esperRules(bpmnModeler)
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
      const json = await saveJSON(bpmnModeler);
      setEncoded(downloadJsonLink, 'diagram.json', json);
    } catch (err) {
      console.log('Error al guardar JSON: ', err);
      setEncoded(downloadJsonLink, 'diagram.json', null);
    }
  
    try {
      const fileName = await exportToEsper(bpmnModeler);
      setEncoded(downloadEsperLink, fileName, fileName);
    } catch (err) {
      console.log('Error al guardar en Esper: ', err);
      setEncoded(downloadEsperLink, 'diagram.txt', null);
    }
  }, 500);  

  bpmnModeler.on('commandStack.changed', () => {
    exportArtifacts(); 
    updateModSecurityFile(); 
  });
});
