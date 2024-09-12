import SecurityProps from './parts/SecurityProps';
import UserProps from '../user/parts/UserProps';

import { is } from 'bpmn-js/lib/util/ModelUtil';

const LOW_PRIORITY = 500;

/**
 * A provider with a `#getGroups(element)` method
 * that exposes groups for a diagram element.
 *
 * @param {PropertiesPanel} propertiesPanel
 * @param {Function} translate
 */
export default function SecurityPropertiesProvider(propertiesPanel, translate) {

  // API ////////

  /**
   * Return the groups provided for the given element.
   *
   * @param {DiagramElement} element
   *
   * @return {(Object[]) => (Object[])} groups middleware
   */
  this.getGroups = function(element) {

    /**
     * We return a middleware that modifies
     * the existing groups.
     *
     * @param {Object[]} groups
     *
     * @return {Object[]} modified groups
     */
    return function(groups) {

      // Add the "Security" group based on the securityType
      if (is(element, 'bpmn:ServiceTask') && element.businessObject.securityType === 'SoD') {
        groups.push(createSoDGroup(element, translate));
      } else if (is(element, 'bpmn:ServiceTask') && element.businessObject.securityType === 'BoD') {
        groups.push(createBoDGroup(element, translate)); // Añadimos BoD
      } else if (is(element, 'bpmn:Task')) { 
        groups.push(createUserGroup(element, translate));
      }

      return groups;
    };
  };

  propertiesPanel.registerProvider(LOW_PRIORITY, this);
}

SecurityPropertiesProvider.$inject = ['propertiesPanel', 'translate'];

// Create the custom SoD group
function createSoDGroup(element, translate) {

  // Create a group called "SoD properties".
  const securityGroup = {
    id: 'security-sod',
    label: translate('SoD properties'),
    entries: SecurityProps(element), 
    tooltip: translate('Ensure proper SoD management!')
  };

  return securityGroup;
}

// Create the custom BoD group
function createBoDGroup(element, translate) {

  // Create a group called "BoD properties".
  const securityGroup = {
    id: 'security-bod',
    label: translate('BoD properties'),
    entries: SecurityProps(element),
    tooltip: translate('Ensure proper BoD management!')
  };

  return securityGroup;
}

// Create the custom User group
function createUserGroup(element, translate) {

  // Create a group called "User properties".
  const userGroup = {
    id: 'User',
    label: translate('UserTask properties'),
    entries: UserProps(element),
    tooltip: translate('Make sure you know what you are doing!')
  };

  return userGroup;
}
