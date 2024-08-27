import { html } from 'htm/preact';
import { CheckboxEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import { TextFieldEntry } from '@bpmn-io/properties-panel';


export default function(element) {
  return [
    {
      id: 'User',
      element,
      component: UserFunction,
      isEdited: isStringEntryEdited
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
    const value = element.businessObject.User;
    console.log('Current User value (getValue):', value);
    return value !== undefined ? value : ''; 
  };

  const setValue = value => {
    if (!element || !element.businessObject) {
      return; 
    }
    console.log('Setting User to (setValue):', value); 
    modeling.updateProperties(element, {
      User: value 
    });
  };

  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('User')}
    getValue=${getValue}
    setValue=${debounce(setValue)}
    debounce=${debounce}
    tooltip=${translate('Enter a user name.')}
  />`;
}

function isStringEntryEdited(element) {
  if (!element || !element.businessObject) {
    return false;
  }
  const userValue = element.businessObject.User;
  return typeof userValue !== 'undefined' && userValue !== '';
}