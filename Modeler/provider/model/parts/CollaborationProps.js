import { html } from 'htm/preact';
import { useService } from 'bpmn-js-properties-panel';
import { TextFieldEntry, CheckboxEntry } from '@bpmn-io/properties-panel';

export default function(element) {
  return [
    {
      id: 'instance',
      element,
      component: instanceFunction,
      isEdited: isNumberEntryEdited
    },
    {
      id: 'security',
      element,
      component: securityFunction,
      isEdited: isCheckboxEntryEdited
    }
  ];
}

function instanceFunction(props) {
  const { element, id } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) return '';

    if (element.businessObject.participants) {
      const firstParticipant = element.businessObject.participants[0];
      if (firstParticipant.processRef) {
        const value = firstParticipant.processRef.instance;
        return (typeof value !== 'undefined' && !isNaN(value)) ? value.toString() : '';
      }
    } else if (element.businessObject.instance !== undefined) {
      const value = element.businessObject.instance;
      return (typeof value !== 'undefined' && !isNaN(value)) ? value.toString() : '';
    }
    return '';
  };

  const setValue = (value) => {
    if (typeof value === 'undefined' || !element || !element.businessObject) {
      return;
    }

    const newValue = value.trim() === '' ? '' : parseInt(value, 10);
    if (isNaN(newValue)) return;

    if (element.businessObject.participants) {
      element.businessObject.participants.forEach(participant => {
        if (participant.processRef && typeof participant.processRef === 'object') {
          modeling.updateModdleProperties(element, participant.processRef, { instance: newValue });
        }
      });
    } else {
      modeling.updateProperties(element, { instance: newValue });
    }
  };

  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('Number of instances')}
    getValue=${getValue}
    setValue=${setValue}
    debounce=${debounce}
    tooltip=${translate('Enter the number of different instances.')} 
  />`;
}

function securityFunction(props) {
    const { element, id } = props;
  
    const modeling = useService('modeling');
    const translate = useService('translate');
  
    const getValue = () => {
      if (!element || !element.businessObject) {
        return false;
      }
      const value = element.businessObject.security;
      return value === true;
    };
  
    const setValue = (value) => {
      if (!element || !element.businessObject) {
        return;
      }
      modeling.updateModdleProperties(element, element.businessObject, {
        security: value === true ? true : undefined
      });
    };
  
    return html`<${CheckboxEntry}
      id=${id}
      element=${element}
      label=${translate('Security')}
      getValue=${getValue}
      setValue=${setValue}
      tooltip=${translate('Enable or disable security setting.')}
    />`;
  }
  

function isNumberEntryEdited(element) {
  if (!element || !element.businessObject) return '';
  return element.businessObject.numberOfExecutions;
}

function isCheckboxEntryEdited(element) {
    if (!element || !element.businessObject) {
      return false;
    }
    const securityValue = element.businessObject.security;
    return typeof securityValue !== 'undefined';
  }
  
  
