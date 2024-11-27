import { html } from 'htm/preact';
import { useService } from 'bpmn-js-properties-panel';
import { TextFieldEntry } from '@bpmn-io/properties-panel';


export default function(element) {
  return [
    {
      id: 'frequency',
      element,
      component: frequencyFunction,
      isEdited: isNumberEntryEdited
    },
    {
        id: 'userWithoutRole',
        element,
        component: userWithoutRoleFunction,
        isEdited: isListOfStringEntryEdited
      }
  ];
}

function frequencyFunction(props) {
  const { element, id } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) return '';

    if (element.businessObject.participants) {
      const firstParticipant = element.businessObject.participants[0];
      if (firstParticipant.processRef) {
        const value = firstParticipant.processRef.frequency;
        return (typeof value !== 'undefined' && !isNaN(value)) ? value.toString() : '';
      } else {
        console.warn("processRef is missing for participant:", firstParticipant);
      }
    } else if (element.businessObject.frequency !== undefined) {
      const value = element.businessObject.frequency;

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
          try {
            modeling.updateModdleProperties(element, participant.processRef, {
              frequency: newValue
            });
          } catch (error) {
            console.error("Failed to update properties for processRef:", error);
          }
        } else {
          console.warn("processRef is missing or invalid for participant:", participant);
        }
      });
    } else {
      modeling.updateProperties(element, {
        frequency: newValue
      });
    }
  };

  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('Frequency')}
    getValue=${getValue}
    setValue=${setValue}
    debounce=${debounce}
    tooltip=${translate('Enter the frequency')}
  />`;
}

function isNumberEntryEdited(element) {

  if (!element || !element.businessObject) {
    return '';
  }

  const nuValue = element.businessObject.numberOfExecutions;

  return nuValue;
}

function userWithoutRoleFunction(props) {
    const { element, id } = props;
  
    const modeling = useService('modeling');
    const translate = useService('translate');
    const debounce = useService('debounceInput');
  
    const getValue = () => {
      if (!element || !element.businessObject) return '';
  
      if (element.businessObject.participants) {
        const firstParticipant = element.businessObject.participants[0];
        if (firstParticipant.processRef) {
          const value = firstParticipant.processRef.userWithoutRole;
          return value !== undefined ? value : '';
        } else {
          console.warn("processRef is missing for participant:", firstParticipant);
        }
      } else if (element.businessObject.userWithoutRole !== undefined) {
        const value = element.businessObject.userWithoutRole;
        return value !== undefined ? value : '';
      }
  
      return '';
    };
  
    const setValue = (value) => {
      if (typeof value === 'undefined' || !element || !element.businessObject) return;
  
      // Eliminar duplicados en el valor que se va a establecer
      const uniqueValue = Array.from(new Set(value.split(',').map(v => v.trim()))).join(', ');
  
      if (element.businessObject.participants) {
        element.businessObject.participants.forEach(participant => {
          if (participant.processRef && typeof participant.processRef === 'object') {
            try {
              modeling.updateModdleProperties(element, participant.processRef, {
                userWithoutRole: uniqueValue
              });
            } catch (error) {
              console.error("Failed to update properties for processRef:", error);
            }
          } else {
            console.warn("processRef is missing or invalid for participant:", participant);
          }
        });
      } else {
        modeling.updateProperties(element, {
          userWithoutRole: uniqueValue
        });
      }
    };
  
    return html`<${TextFieldEntry}
      id=${id}
      element=${element}
      label=${translate('User/s')}
      getValue=${getValue}
      setValue=${setValue}
      debounce=${debounce}
      tooltip=${translate('Enter a user/s name.')}
    />`;
  }
  
  function isListOfStringEntryEdited(element) {
    if (!element || !element.businessObject) {
      return false;
    }
  
    const userWithoutRoleValues = element.businessObject.userWithoutRole;
  
    // Verificamos que userWithoutRole es un array
    if (!Array.isArray(userWithoutRoleValues)) {
      return false;
    }
  
    // Retornamos true si al menos un elemento en la lista no es un string vacío
    return userWithoutRoleValues.some(value => typeof value === 'string' && value !== '');
  }
