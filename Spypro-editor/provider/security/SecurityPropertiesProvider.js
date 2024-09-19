import SecurityProps from './parts/SecurityProps';
import UserProps from '../user/parts/UserProps';

import { is } from 'bpmn-js/lib/util/ModelUtil';

const LOW_PRIORITY = 500;

export default function SecurityPropertiesProvider(propertiesPanel, translate) {

  // API ////////

  this.getGroups = function(element) {

    return function(groups) {

      // Añadir el grupo "Security" basado en securityType
      if (is(element, 'bpmn:ServiceTask') && element.businessObject.securityType === 'SoD') {
        groups.push(createSoDGroup(element, translate));
      } else if (is(element, 'bpmn:ServiceTask') && element.businessObject.securityType === 'BoD') {
        groups.push(createBoDGroup(element, translate));
      } else if (is(element, 'bpmn:ServiceTask') && element.businessObject.securityType === 'UoC') {
        groups.push(createUoCGroup(element, translate)); // Añadir UoC
      } else if (is(element, 'bpmn:Task')) { 
        groups.push(createUserGroup(element, translate));
      }

      return groups;
    };
  };

  propertiesPanel.registerProvider(LOW_PRIORITY, this);
}

SecurityPropertiesProvider.$inject = ['propertiesPanel', 'translate'];

// Crear el grupo personalizado para SoD
function createSoDGroup(element, translate) {
  const securityGroup = {
    id: 'security-sod',
    label: translate('SoD properties'),
    entries: SecurityProps(element), 
    tooltip: translate('Ensure proper SoD management!')
  };

  return securityGroup;
}

// Crear el grupo personalizado para BoD
function createBoDGroup(element, translate) {
  const securityGroup = {
    id: 'security-bod',
    label: translate('BoD properties'),
    entries: SecurityProps(element),
    tooltip: translate('Ensure proper BoD management!')
  };

  return securityGroup;
}

// Crear el grupo personalizado para UoC
function createUoCGroup(element, translate) {
  const securityGroup = {
    id: 'security-uoc',
    label: translate('UoC properties'),
    entries: SecurityProps(element),
    tooltip: translate('Ensure proper UoC management!')
  };

  return securityGroup;
}

// Crear el grupo personalizado para UserTask
function createUserGroup(element, translate) {
  const userGroup = {
    id: 'User',
    label: translate('UserTask properties'),
    entries: UserProps(element),
    tooltip: translate('Make sure you know what you are doing!')
  };

  return userGroup;
}
