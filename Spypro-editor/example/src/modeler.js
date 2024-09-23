import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import '@bpmn-io/properties-panel/assets/properties-panel.css';
import '../style.less';

import BpmnModeler from 'bpmn-js/lib/Modeler';
import { debounce } from 'min-dash';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel';
import fileDrop from 'file-drops';
import fileOpen from 'file-open';
import download from 'downloadjs';
import exampleXML from '../resources/example.bpmn'; // Asegúrate de que este archivo esté en la ruta correcta
import $ from 'jquery';

import securityDrawModule from '../../lib/security/draw';
import securityPaletteModule from '../../lib/security/palette';
import resizeAllModule from '../../lib/resize-all-rules';
import propertiesProviderModule from '../../provider/security';
import securityModdleDescriptor from '../../descriptors/security.json';
import userModdleDescriptor from '../../descriptors/user.json';

import TokenSimulationModule from '../..';
import AddExporter from '@bpmn-io/add-exporter';

import { 
  getSecurityTasks,
  getAllRelevantTasks,
  modSecurity,
  esperRules,
  synDB,
  saveJSON,
  exportToEsper
} from './taskHandlers';

$(function() {
  // Inicialización del BpmnModeler
  const bpmnModeler = new BpmnModeler({
    container: '#canvas', // Asegúrate de que coincida con el ID en el HTML
    propertiesPanel: {
      parent: '#properties-panel'
    },
    additionalModules: [
      BpmnPropertiesPanelModule,
      BpmnPropertiesProviderModule,
      TokenSimulationModule,
      AddExporter,
      securityDrawModule,
      securityPaletteModule,
      resizeAllModule,
      propertiesProviderModule
    ],
    exporter: {
      name: 'my-bpmn-exporter',
      version: '1.0.0'
    },
    moddleExtensions: {
      security: securityModdleDescriptor,
      user: userModdleDescriptor
    }
  });

  // Función para abrir un diagrama dado su XML
  async function openDiagram(xml) {
    console.log('Opening diagram...');
    try {
      await bpmnModeler.importXML(xml);
      console.log('Diagram imported successfully.');
      $('#canvas')
        .removeClass('with-error')
        .addClass('with-diagram');
    } catch (err) {
      console.error('Error during importXML:', err);
      $('#canvas')
        .removeClass('with-diagram')
        .addClass('with-error');
      $('#canvas .error pre').text(err.message);
    }
  }

  // Cargar el diagrama inicial al abrir la aplicación
  async function createNewDiagram() {
    openDiagram(exampleXML); // Asegúrate de que este XML esté correctamente referenciado
  }

  // Registrar el drop de archivos para cargar diagramas
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

  // Función para establecer enlaces de descarga
  function setEncoded(link, name, data) {
    var encodedData = encodeURIComponent(data);

    if (data) {
      link.addClass('active').attr({
        'href': 'data:application/json;charset=UTF-8,' + encodedData,
        'download': name
      });
    } else {
      link.removeClass('active');
    }
  }

  // Enlaces de descarga
var downloadLink = $('#js-download-diagram');
var downloadSvgLink = $('#js-download-svg');
var downloadJsonLink = $('#js-download-json');
var downloadEsperLink = $('#js-download-esper');

let isDownloading = false;
let isExporting = false;

// Función para manejar el estado del botón y controlar las exportaciones
function handleExport(button, exportFunction, successMessage, errorMessage) {
  if (isExporting) return;  // Prevenir exportaciones concurrentes

  isExporting = true;
  button.prop('disabled', true);

  exportFunction()
    .then(() => {
      alert(successMessage);
    })
    .catch(() => {
      alert(errorMessage);
    })
    .finally(() => {
      isExporting = false;
      button.prop('disabled', false);
    });
}

// Manejador para la descarga de Esper
$('#js-download-esper').off('click').on('click', async function(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  if (isDownloading || hasDownloaded) return;
  isDownloading = true;

  console.log("Descarga iniciada");

  try {
    const content = await exportToEsper(bpmnModeler);

    if (!hasDownloaded) {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'esperTasks.txt';

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      hasDownloaded = true;
    } else {
      console.log("Ya descargado");
    }
  } catch (err) {
    console.log('Error al exportar a Esper:', err);
  } finally {
    isDownloading = false;
    console.log("Descarga completada");
  }
});

// Función para descargar el diagrama como XML (BPMN)
function downloadDiagram() {
  bpmnModeler.saveXML({ format: true }).then(({ xml }) => {
    download(xml, 'diagram.bpmn', 'application/xml');  // Usar downloadjs para la descarga de BPMN
  }).catch(err => {
    console.error('Error al guardar BPMN:', err);
  });
}

// Función para abrir un archivo BPMN
function openFile(files) {
  if (!files.length) return;
  const file = files[0];
  const reader = new FileReader();
  
  reader.onload = function(event) {
    const xml = event.target.result;
    openDiagram(xml);  // Cargar el archivo en el modeler
  };
  
  reader.readAsText(file);
}

// Manejar eventos de teclas para descarga rápida y abrir archivo
document.body.addEventListener('keydown', function(event) {
  if (event.code === 'KeyS' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    downloadDiagram();
  }

  if (event.code === 'KeyO' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    fileOpen().then(openFile);
  }
});

// Manejar el clic en el botón de descarga
document.querySelector('#download-button').addEventListener('click', function(event) {
  downloadDiagram();
});


// Función debounced para exportar artefactos
var exportArtifacts = debounce(async function() {
  try {
    // Descargar como SVG
    const { svg } = await bpmnModeler.saveSVG();
    if (svg) {
      download(svg, 'diagram.svg', 'image/svg+xml');  // Usar downloadjs para la descarga de SVG
      console.log('SVG exportado correctamente.');
    } else {
      console.error('Error: SVG vacío.');
    }
  } catch (err) {
    console.error('Error al guardar SVG:', err);
  }

  try {
    // Descargar como XML (BPMN)
    const { xml } = await bpmnModeler.saveXML({ format: true });
    if (xml) {
      download(xml, 'diagram.bpmn', 'application/xml');  // Usar downloadjs para la descarga de BPMN
      console.log('BPMN exportado correctamente.');
    } else {
      console.error('Error: XML vacío.');
    }
  } catch (err) {
    console.log('Error al guardar XML:', err);
  }

  try {
    // Descargar como JSON
    const json = await saveJSON(bpmnModeler);
    if (json) {
      download(json, 'diagram.json', 'application/json');  // Usar downloadjs para la descarga de JSON
      console.log('JSON exportado correctamente.');
    } else {
      console.error('Error: JSON vacío.');
    }
  } catch (err) {
    console.log('Error al guardar JSON:', err);
  }
}, 500);

// Función para manejar la exportación de artefactos
$('#js-download-diagram').click(function() {
  exportArtifacts(); // Llamar directamente la función de exportación
});


// Escuchar cambios en el modeler
bpmnModeler.on('commandStack.changed', () => {
  exportArtifacts();
  updateModSecurityFile();
});

function updateModSecurityFile() {
  modSecurity(bpmnModeler)
  esperRules(bpmnModeler)
    .catch(() => {
      console.error('Error updating ModSecurity/esperRules file.');
    });
}

// Inicializar el diagrama al cargar la página
createNewDiagram();

// Registrar el evento para arrastrar archivos
registerFileDrop($('#canvas'), openDiagram);

// Manejadores para los botones
$('#button1').click(function() {
  handleExport($(this), () => modSecurity(bpmnModeler), 'Exportado a ModSecurity con éxito.', 'Error al exportar a ModSecurity');
});

$('#button2').click(function() {
  handleExport($(this), () => synDB(bpmnModeler), 'Sincronizado con MongoDB con éxito.', 'Error en la sincronización con MongoDB');
});

$('#button3').click(function() {
  handleExport($(this), () => esperRules(bpmnModeler), 'Exportado a Esper Rules con éxito.', 'Error al exportar a Esper Rules');
});

// Verificar compatibilidad del navegador
if (!window.FileList || !window.FileReader) {
  window.alert(
    'Parece que usas un navegador antiguo que no soporta arrastrar y soltar. ' +
    'Prueba usar Chrome, Firefox o Internet Explorer > 10.');
}

});
