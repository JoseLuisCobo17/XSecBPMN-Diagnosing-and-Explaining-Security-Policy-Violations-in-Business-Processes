import { html } from 'htm/preact';
import { useService } from 'bpmn-js-properties-panel';
import { TextFieldEntry } from '@bpmn-io/properties-panel';


export default function(element) {
  return [
    {
      id: 'instance',
      element,
      component: instanceFunction,
      isEdited: isNumberEntryEdited
    },
    {
      id: 'frequency',
      element,
      component: frequencyFunction,
      isEdited: isNumberEntryEdited
    }
  ];
}

function instanceFunction(props) {
    const { element, id } = props;
    const modeling = useService('modeling');
    const translate = useService('translate');
    const debounce = useService('debounceInput');
  
    const getValue = () => {
      if (!element || !element.businessObject) {
        return '';
      }
      const value = element.businessObject.instance;
      return (typeof value !== 'undefined' && !isNaN(value)) ? value.toString() : '';
    };
  
    const setValue = value => {
  
      if (typeof value === 'undefined') {
        return;
      }
  
      if (!element || !element.businessObject) {
        return;
      }
  
      if (value.trim() === '') {
        modeling.updateProperties(element, {
          instance: ''
        });
        return;
      }
  
      const newValue = parseInt(value, 10);
      if (isNaN(newValue)) {
        return;
      }
  
      modeling.updateProperties(element, {
        instance: newValue
      });
    };
    return html`<${TextFieldEntry}
      id=${id}
      element=${element}
      label=${translate('Number of instances')}
      getValue=${getValue}
      setValue=${debounce(setValue)}
      debounce=${debounce}
      tooltip=${translate('Enter the number of different instances.')} 
    />`;
}

function frequencyFunction(props) {
    const { element, id } = props;
    const modeling = useService('modeling');
    const translate = useService('translate');
    const debounce = useService('debounceInput');
  
    const getValue = () => {
      if (!element || !element.businessObject) {
        return '';
      }
      const value = element.businessObject.frequency;
      return (typeof value !== 'undefined' && !isNaN(value)) ? value.toString() : '';
    };
  
    const setValue = value => {
  
      if (typeof value === 'undefined') {
        return;
      }
  
      if (!element || !element.businessObject) {
        return;
      }
  
      if (value.trim() === '') {
        modeling.updateProperties(element, {
          frequency: ''
        });
        return;
      }
  
      const newValue = parseInt(value, 10);
      if (isNaN(newValue)) {
        return;
      }
  
      modeling.updateProperties(element, {
        frequency: newValue
      });
    };
    return html`<${TextFieldEntry}
      id=${id}
      element=${element}
      label=${translate('Number of frequency')}
      getValue=${getValue}
      setValue=${debounce(setValue)}
      debounce=${debounce}
      tooltip=${translate('Enter the number of different frequency.')} 
    />`;
}

function isNumberEntryEdited(element) {
  console.log("element:", element.businessObject);

  if (!element || !element.businessObject) {
    return '';
  }

  const nuValue = element.businessObject.numberOfExecutions;

  return nuValue;
}