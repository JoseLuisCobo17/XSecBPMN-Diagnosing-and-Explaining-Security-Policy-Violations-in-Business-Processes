import { html } from 'htm/preact';
import { useService } from 'bpmn-js-properties-panel';
import { TextFieldEntry } from '@bpmn-io/properties-panel';

export default function(element) {
  return [
    {
      id: 'UserTask',
      element,
      component: UserFunction,
      isEdited: isListOfStringEntryEdited // Se pasa la función correcta
    }
  ];
}

function UserFunction(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return ''; 
    }
    const value = element.businessObject.UserTask; 
    console.log('Current UserTask value (getValue):', value);
    return value !== undefined ? value : ''; 
  };

  const setValue = value => {
    if (!element || !element.businessObject) {
      return; 
    }
    console.log('Setting UserTask to (setValue):', value); 
    modeling.updateProperties(element, {
      UserTask: value 
    });
  };

  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('UserTask')}
    getValue=${getValue}
    setValue=${debounce(setValue)}
    debounce=${debounce}
    tooltip=${translate('Enter a user task name.')} 
  />`;
}

// Corregido: Acepta 'element' como parámetro
function isListOfStringEntryEdited(element) {
  if (!element || !element.businessObject) {
    return false;
  }

  const userTaskValues = element.businessObject.UserTask;

  // Verificamos que UserTask es un array
  if (!Array.isArray(userTaskValues)) {
    return false;
  }

  // Retornamos true si al menos un elemento en la lista no es un string vacío
  return userTaskValues.some(value => typeof value === 'string' && value !== '');
}
