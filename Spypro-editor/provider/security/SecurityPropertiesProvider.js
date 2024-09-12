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

      // Add the "Security" group
      if (is(element, 'bpmn:ServiceTask')) {
        groups.push(createSoDGroup(element, translate));
      } else if (is(element, 'bpmn:Task')) { 
        groups.push(createUserGroup(element, translate));
      }

      return groups;
    };
  };

  propertiesPanel.registerProvider(LOW_PRIORITY, this);
}

SecurityPropertiesProvider.$inject = [ 'propertiesPanel', 'translate' ];

// Create the custom Security group
function createSoDGroup(element, translate) {

  // create a group called "SoD properties".
  const securityGroup = {
    id: 'security',
    label: translate('SoD properties'),
    entries: SecurityProps(element),
    tooltip: translate('Make sure you know what you are doing!')
  };

  return securityGroup;
}

// Create the custom User group
function createUserGroup(element, translate) {

  // create a group called "User properties".
  const userGroup = {
    id: 'User',
    label: translate('UserTask properties'),
    entries: UserProps(element),
    tooltip: translate('Make sure you know what you are doing!')
  };

  return userGroup;
}