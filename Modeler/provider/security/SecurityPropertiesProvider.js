import SecurityProps from './parts/SecurityProps';
import UserProps from '../user/parts/UserProps';
import SequenceFlowProps from '../sequenceFlow/parts/SequenceFlowProps';
import ModelProps from '../model/parts/ModelProps';

import { is } from 'bpmn-js/lib/util/ModelUtil';

const LOW_PRIORITY = 500;

export default function SecurityPropertiesProvider(propertiesPanel, translate) {

  // API ////////

  this.getGroups = function(element) {
    return function(groups) {
      if (is(element, 'bpmn:ServiceTask') && element.businessObject.securityType === 'SoD') {
        return groups;
      } else if (is(element, 'bpmn:ServiceTask') && element.businessObject.securityType === 'BoD') {
        return groups;
      } else if (is(element, 'bpmn:ServiceTask') && element.businessObject.securityType === 'UoC') {
        groups.push(createUoCGroup(element, translate));
      } else if (is(element, 'bpmn:ManualTask') || is(element, 'bpmn:UserTask') || (is(element, 'bpmn:Task') 
        || is(element, 'bpmn:BusinessRuleTask') || is(element, 'bpmn:ScriptTask') || is(element, 'bpmn:CallActivity') 
        || is(element, 'bpmn:SendTask') || is(element, 'bpmn:ReceiveTask')
        && !is(element, 'bpmn:ServiceTask'))) {
        groups.push(createUserGroup(element, translate));
      } else if (is(element, 'bpmn:SequenceFlow')) {
        const sourceElement = element.businessObject.sourceRef;
        if (sourceElement && is(sourceElement, 'bpmn:Gateway')) {
          groups.push(createSequenceFlowGroup(element, translate));
        }
      } else if (is(element, 'bpmn:Process') || is(element, 'bpmn:Collaboration') 
        || is(element, 'bpmn:Participant')) {
        groups.push(createModelGroup(element, translate));
      }
      return groups;
    };
  };

  propertiesPanel.registerProvider(LOW_PRIORITY, this);
}

SecurityPropertiesProvider.$inject = ['propertiesPanel', 'translate'];

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

function createSequenceFlowGroup(element, translate) {
  const sequenceFlowGroup = {
    id: 'sequenceFlow',
    label: translate('SequenceFlow properties'),
    entries: SequenceFlowProps(element),
    tooltip: translate('Make sure you know what you are doing!')
  };

  return sequenceFlowGroup;
}

// Crear el grupo personalizado para Model
function createModelGroup(element, translate) {
  const modelGroup = {
    id: 'model',
    label: translate('Model properties'),
    entries: ModelProps(element), // Llama a ModelProps, donde está gestionado userPool
    tooltip: translate('Manage model-level properties, including userPool.')
  };

  return modelGroup;
}
