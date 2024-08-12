'use strict';

/*import inherits from 'inherits';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';
import processProps from 'bpmn-js-properties-panel/dist';
import eventProps from 'bpmn-js-properties-panel/dist';
import linkProps from 'bpmn-js-properties-panel/dist';
import idProps from 'bpmn-js-properties-panel/dist';
import nameProps from 'bpmn-js-properties-panel/dist';
import securityProps from './parts/SecurityProps'; // Asegúrate de que esta ruta es correcta y que el archivo existe
*/
var inherits = require('inherits');

//var PropertiesActivator = require('bpmn-js-properties-panel/lib/PropertiesActivator');

var processProps = require('bpmn-js-properties-panel/dist'),
    eventProps = require('bpmn-js-properties-panel/dist'),
    linkProps = require('bpmn-js-properties-panel/dist'),
    idProps = require('bpmn-js-properties-panel/dist'),
    nameProps = require('bpmn-js-properties-panel/dist');

var securityProps = require('./parts/SecurityProps');

var DEFAULT_PRIORITY = 1000;

/**
 * A component that decides upon the visibility / editable
 * state of properties in the properties panel.
 *
 * Implementors must subclass this component and override
 * {@link PropertiesActivator#isEntryVisible} and
 * {@link PropertiesActivator#isPropertyEditable} to provide
 * custom behavior.
 *
 * @class
 * @constructor
 *
 * @param {EventBus} eventBus
 * @param {Number} [priority] at which priority to hook into the activation
 */
function PropertiesActivator(eventBus, priority) {
  var self = this;

  priority = priority || DEFAULT_PRIORITY;

  eventBus.on('propertiesPanel.isEntryVisible', priority, function(e) {
    return self.isEntryVisible(e.entry, e.element);
  });

  eventBus.on('propertiesPanel.isPropertyEditable', priority, function(e) {
    return self.isPropertyEditable(e.entry, e.propertyName, e.element);
  });
}

PropertiesActivator.$inject = [ 'eventBus' ];

module.exports = PropertiesActivator;


/**
 * Should the given entry be visible for the specified element.
 *
 * @method  PropertiesActivator#isEntryVisible
 *
 * @param {EntryDescriptor} entry
 * @param {ModdleElement} element
 *
 * @returns {Boolean}
 */
PropertiesActivator.prototype.isEntryVisible = function(entry, element) {
  return true;
};

/**
 * Should the given property be editable for the specified element
 *
 * @method  PropertiesActivator#isPropertyEditable
 *
 * @param {EntryDescriptor} entry
 * @param {String} propertyName
 * @param {ModdleElement} element
 *
 * @returns {Boolean}
 */
PropertiesActivator.prototype.isPropertyEditable = function(entry, propertyName, element) {
  return true;
};

// The general tab contains all bpmn relevant properties.
// The properties are organized in groups.
function createGeneralTabGroups(element, bpmnFactory, elementRegistry, translate) {

  var generalGroup = {
    id: 'general',
    label: 'General',
    entries: []
  };
  idProps(generalGroup, element, translate);
  nameProps(generalGroup, element, translate);
  processProps(generalGroup, element, translate);

  var detailsGroup = {
    id: 'details',
    label: 'Details',
    entries: []
  };
  linkProps(detailsGroup, element, translate);
  eventProps(detailsGroup, element, bpmnFactory, elementRegistry, translate);

  return[
    generalGroup,
    detailsGroup,
  ];
}

function createSecurityTabGroups(element, elementRegistry) {

  var securityTaskGroup = {
    id: 'security-tasks',
    label: 'Security Properties',
    entries: []
  };

  securityProps(securityTaskGroup, element);

  return [
    securityTaskGroup
  ];
}

function SecurityPropertiesProvider(eventBus, bpmnFactory, elementRegistry, translate) {

  PropertiesActivator.call(this, eventBus);

  this.getTabs = function(element) {

    var generalTab = {
      id: 'general',
      label: 'General',
      groups: createGeneralTabGroups(element, bpmnFactory, elementRegistry, translate)
    };

    var securityTab = {
      id: 'security',
      label: 'Security',
      groups: createSecurityTabGroups(element, elementRegistry)
    };
    return [
      generalTab,
      securityTab
    ];
  };
}

inherits(SecurityPropertiesProvider, PropertiesActivator);

module.exports = SecurityPropertiesProvider;
