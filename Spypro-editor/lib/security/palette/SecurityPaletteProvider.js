import SoD from '../lock';


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

  function startCreate(event) {
    var serviceTaskShape = elementFactory.create(
      'shape', { type: 'bpmn:ServiceTask' }
    );

    create.start(event, serviceTaskShape);
  }

  return {
    'create-service-task': {
      group: 'activity',
      title: 'Create a new security CAT!',
      imageUrl: SoD.dataURL,
      action: {
        dragstart: startCreate,
        click: startCreate
      }
    }
  };
};