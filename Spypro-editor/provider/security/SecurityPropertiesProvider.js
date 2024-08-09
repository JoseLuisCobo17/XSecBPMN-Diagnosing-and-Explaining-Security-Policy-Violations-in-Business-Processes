import SecurityProps from './parts/SecurityProps';

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
        groups.push(createSecurityGroup(element, translate));
      }

      return groups;
    };
  };

  propertiesPanel.registerProvider(LOW_PRIORITY, this);
}

SecurityPropertiesProvider.$inject = [ 'propertiesPanel', 'translate' ];

// Create the custom Security group
function createSecurityGroup(element, translate) {

  // create a group called "Security properties".
  const securityGroup = {
    id: 'security',
    label: translate('Security properties'),
    entries: SecurityProps(element),
    tooltip: translate('Make sure you know what you are doing!')
  };

  return securityGroup;
}