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
    },
    {
      id: 'NumberOfExecutions',
      element,
      component: NumberOfExecutionsFunction,
      isEdited: isNumberEntryEdited
    },
    {
      id: 'AverageTimeEstimate',
      element,
      component: AverageTimeEstimateFunction,
      isEdited: isNumberEntryEdited
    },
    {
      id: 'Instance',
      element,
      component: InstanceFunction,
      isEdited: isListOfStringEntryEdited
    }
  ];
}

// UserTask
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

    // Asegúrate de que la propiedad UserTask está presente en el businessObject
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

function NumberOfExecutionsFunction(props) {
  const { element, id } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return '';
    }
    const value = element.businessObject.NumberOfExecutions;
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
        NumberOfExecutions: ''
      });
      return;
    }

    const newValue = parseInt(value, 10);
    if (isNaN(newValue)) {
      return;
    }

    modeling.updateProperties(element, {
      NumberOfExecutions: newValue
    });
  };
  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('Number of executions')}
    getValue=${getValue}
    setValue=${debounce(setValue)}
    debounce=${debounce}
    tooltip=${translate('Enter the number of different executions.')} 
  />`;
}

function AverageTimeEstimateFunction(props) {
  const { element, id } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return '';
    }
    const value = element.businessObject.AverageTimeEstimate;
    console.log('Current AverageTimeEstimate value (getValue):', value);
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
        AverageTimeEstimate: ''
      });
      return;
    }

    const newValue = parseFloat(value);

    if (isNaN(newValue)) {
      return;
    }

    console.log('Setting AverageTimeEstimate to (setValue):', newValue);

    modeling.updateProperties(element, {
      AverageTimeEstimate: newValue
    });
  };

  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('Average time estimate')}
    getValue=${getValue}
    setValue=${debounce(setValue)}
    debounce=${debounce}
    tooltip=${translate('Enter the average time estimate.')} 
  />`;
}


// Instance
function InstanceFunction(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return ''; 
    }
    const value = element.businessObject.Instance; 
    console.log('Current Instance value (getValue):', value);
    return value !== undefined ? value : ''; 
  };

  const setValue = value => {
    if (!element || !element.businessObject) {
      return; 
    }

    // Asegúrate de que la propiedad Instance está presente en el businessObject
    modeling.updateProperties(element, {
      Instance: value 
    });
  };

  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('Instance')}
    getValue=${getValue}
    setValue=${debounce(setValue)}
    debounce=${debounce}
    tooltip=${translate('Enter a Instance name.')} 
  />`;
}

// Funciones auxiliares
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

function isNumberEntryEdited(element) {
  console.log("element:" + element.businessObject)
  if (!element || !element.businessObject) {
    return 0;
  }
  const nuValue = element.businessObject.numberOfExecutions;
  return (typeof nuValue !== 'undefined' && !isNaN(nuValue)) ? nuValue : 0;
}