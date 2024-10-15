import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import '@bpmn-io/properties-panel/assets/properties-panel.css';
import '../style.less';

import BpmnModeler from 'bpmn-js/lib/Modeler';
import { debounce } from 'min-dash';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel';
import fileOpen from 'file-open';
import download from 'downloadjs';
import exampleXML from '../resources/example.bpmn';
import $ from 'jquery';

import securityDrawModule from '../../lib/security/draw';
import securityPaletteModule from '../../lib/security/palette';
import resizeAllModule from '../../lib/resize-all-rules';
import propertiesProviderModule from '../../provider/security';
import securityModdleDescriptor from '../../descriptors/security.json';
import userModdleDescriptor from '../../descriptors/user.json';
import sequenceFlowExtension from '../../descriptors/sequenceFlow.json';
import modelExtension from '../../descriptors/model.json';

import TokenSimulationModule from '../..';
import AddExporter from '@bpmn-io/add-exporter';

import {
  esperRules,
  exportToEsper,
  deployRules
} from './taskHandlers';

$(function() {
  const bpmnModeler = new BpmnModeler({
    container: '#canvas',
    propertiesPanel: {
      parent: '#properties-panel'
    },
    additionalModules: [
      BpmnPropertiesPanelModule,
      BpmnPropertiesProviderModule,
      propertiesProviderModule,
      securityPaletteModule,
      securityDrawModule,
      resizeAllModule,
      TokenSimulationModule,
      AddExporter,
    ],
    exporter: {
      name: 'my-bpmn-exporter',
      version: '1.0.0'
    },
    moddleExtensions: {
      security: securityModdleDescriptor,
      user: userModdleDescriptor,
      sequenceFlow: sequenceFlowExtension,
      model: modelExtension
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

  // Función para registrar el arrastre y soltar archivos
  function registerFileDrop(container, callback) {
    function handleFileSelect(e) {
      e.stopPropagation();
      e.preventDefault();

      var files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
      if (files.length === 0) {
        console.error('No se encontró un archivo para procesar.');
        return;
      }

      var file = files[0];

      if (!file || !(file instanceof File)) {
        console.error('El archivo no es válido.');
        return;
      }

      var reader = new FileReader();
      reader.onload = function(e) {
        var xml = e.target.result;
        callback(xml);
      };

      reader.onerror = function(e) {
        console.error('Error al leer el archivo:', e);
      };
      reader.readAsText(file);
    }

    function handleDragOver(e) {
      e.stopPropagation();
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy'; // Cambia el cursor para indicar que es posible soltar
    }
    container.get(0).addEventListener('dragover', handleDragOver, false);
    container.get(0).addEventListener('drop', handleFileSelect, false);

    // También agregamos soporte para abrir el archivo mediante un input
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.bpmn, .xml'; // Especificamos los tipos de archivos permitidos
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', handleFileSelect, false);
    container.get(0).appendChild(fileInput);
  }

  createNewDiagram();
  registerFileDrop($('#canvas'), openDiagram);

  function setEncoded(link, name, data) {
    if (data) {
      const encodedData = encodeURIComponent(data);
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

  let isDownloading = false;
  let hasDownloaded = false;

// Manejador para guardar Esper en la carpeta del proyecto y ejecutar el comando
$('#js-download-esper').off('click').on('click', async function(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  console.log('Guardado iniciado');

  try {
    // Exportar el contenido a Esper
    const content = await exportToEsper(bpmnModeler);

    // Configura la solicitud POST para guardar el archivo
    const saveResponse = await fetch('http://localhost:3000/save-esper-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, filename: 'esperTasks.txt' }),
    });

    if (!saveResponse.ok) {
      throw new Error(`Error al guardar el archivo: ${saveResponse.statusText}`);
    }

    console.log('Archivo guardado en la carpeta del proyecto');
  } catch (err) {
    console.error('Error al exportar a Esper:', err);
  } finally {
    console.log('Proceso de guardado completado');
  }
});


  // Función para descargar el diagrama como XML (BPMN)
  function downloadDiagram() {
    bpmnModeler.saveXML({ format: true }).then(({ xml }) => {
      download(xml, 'diagram.bpmn', 'application/xml');
    }).catch(err => {
      console.error('Error al guardar BPMN:', err);
    });
  }

  // Función para exportar el diagrama como SVG
  async function exportSvg() {
    try {
      const { svg } = await bpmnModeler.saveSVG();
      const blob = new Blob([ svg ], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = 'diagram.svg';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);

      console.log('SVG descargado correctamente');
    } catch (err) {
      console.error('Error al exportar SVG:', err);
    }
  }

  // Agregar el evento de clic para descargar el SVG
  $('#js-download-svg').click(function() {
    exportSvg();
  });

  function openFile(files) {
    if (!files.length) return;
    const file = files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
      const xml = event.target.result;
      openDiagram(xml);
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

  // Función debounced para exportar artefactos (incluyendo SVG y XML )
  var exportArtifacts = debounce(async function() {
    try {
      const { svg } = await bpmnModeler.saveSVG();
      setEncoded(downloadSvgLink, 'diagram.svg', svg);
    } catch (err) {
      console.error('Error al guardar SVG: ', err);
      setEncoded(downloadSvgLink, 'diagram.svg', null);
    }

    // Exportar XML
    try {
      const { xml } = await bpmnModeler.saveXML({ format: true });
      setEncoded(downloadLink, 'diagram.bpmn', xml);
    } catch (err) {
      console.log('Error al guardar XML: ', err);
      setEncoded(downloadLink, 'diagram.bpmn', null);
    }
  }, 500);

  $('#js-download-json').click(function() {
    try {
      exportArtifacts();
    } catch (err) {
      console.log('Error al exportar artefactos:', err);
    }
  });

  createNewDiagram();
  registerFileDrop($('#canvas'), openDiagram);

  $('#js-download-diagram').click(function() {
    exportArtifacts();
  });

  bpmnModeler.on('commandStack.changed', () => {
    exportArtifacts();
  });

  // Variable para evitar descargas múltiples simultáneas
let isDownloading2 = false;

// Manejador para la descarga de Deploy Rules cuando se presione el botón "Deploy Rules"
$('#button2').off('click').on('click', async function(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  if (isDownloading2) return;
  isDownloading2 = true;

  console.log('Descarga de Deploy Rules (JSON) iniciada');

  try {
    const content = await deployRules(bpmnModeler);

    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'deployRules.json';

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.log('Error al exportar Deploy Rules (JSON):', err);
  } finally {
    isDownloading2 = false;
    console.log('Descarga completada');
  }
});

  // Manejador para la descarga de Esper cuando se presione el botón "Esper Rules"
$('#button3').off('click').on('click', async function(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  if (isDownloading) return;
  isDownloading = true;

  console.log('Descarga de Esper Rules (JSON) iniciada');

  try {
    const content = await esperRules(bpmnModeler);

    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'esperRules.json';

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.log('Error al exportar Esper Rules (JSON):', err);
  } finally {
    isDownloading = false;
    console.log('Descarga completada');
  }
});

  // Verificar compatibilidad del navegador
  if (!window.FileList || !window.FileReader) {
    window.alert(
      'Parece que usas un navegador antiguo que no soporta arrastrar y soltar. ' +
    'Prueba usar Chrome, Firefox o Internet Explorer > 10.');
  }
});
