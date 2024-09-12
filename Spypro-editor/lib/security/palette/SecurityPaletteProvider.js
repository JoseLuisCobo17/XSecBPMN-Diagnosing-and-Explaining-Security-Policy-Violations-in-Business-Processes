import SoD from '../lock';
import BoD from '../lock'; 


/**
 * A provider for quick service task production
 */
export default function SecurityPaletteProvider(palette, create, elementFactory) {

  this._create = create;
  this._elementFactory = elementFactory;

  palette.registerProvider(this);
}

SecurityPaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory'
];

SecurityPaletteProvider.prototype.getPaletteEntries = function() {

  var elementFactory = this._elementFactory,
      create = this._create;

  // Función para crear una nueva ServiceTask
  function startCreate(event, type) {
    var serviceTaskShape = elementFactory.create(
      'shape', { type: 'bpmn:ServiceTask' }
    );

    if (type === 'SoD') {
      serviceTaskShape.businessObject.securityType = 'SoD'; // Añadir regla SoD
    } else if (type === 'BoD') {
      serviceTaskShape.businessObject.securityType = 'BoD'; // Añadir regla BoD si lo deseas
    }

    create.start(event, serviceTaskShape);
  }

  return {
    'create-service-task-sod': {
      group: 'activity',
      title: 'Create a new SoD Security Task',
      imageUrl: SoD.dataURL, // Usar la imagen de SoD
      action: {
        dragstart: function(event) { startCreate(event, 'SoD'); }, // Inicia con SoD
        click: function(event) { startCreate(event, 'SoD'); }
      }
    },
    'create-service-task-bod': {
      group: 'activity',
      title: 'Create a new BoD Security Task',
      imageUrl: BoD.dataURL, // Usar la imagen de BoD si lo deseas
      action: {
        dragstart: function(event) { startCreate(event, 'BoD'); }, // Inicia con BoD
        click: function(event) { startCreate(event, 'BoD'); }
      }
    }
  };
};
