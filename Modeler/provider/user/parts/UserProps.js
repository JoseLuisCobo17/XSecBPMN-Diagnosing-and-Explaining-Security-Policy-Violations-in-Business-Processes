import { html } from 'htm/preact';
import { useService } from 'bpmn-js-properties-panel';
import { TextFieldEntry } from '@bpmn-io/properties-panel';

export default function(element) {
  return [
    {
      id: 'UserTask',
      element,
      component: UserFunction,
      isEdited: isListOfStringEntryEdited
    },
    {
      id: 'NumberOfExecutions',
      element,
      component: NumberOfExecutionsFunction,
      isEdited: isNumberEntryEdited
    },
    {
      id: 'minimumTime',
      element,
      component: minimumTimeFunction,
      isEdited: isNumberEntryEdited
    },
    {
      id: 'maximumTime',
      element,
      component: maximumTimeFunction,
      isEdited: isNumberEntryEdited
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
    setValue=${setValue}
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
    setValue=${setValue}
    debounce=${debounce}
    tooltip=${translate('Enter the number of different executions.')} 
  />`;
}

function maximumTimeFunction(props) {
  const { element, id } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return '';
    }
    const value = element.businessObject.maximumTime;
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
        maximumTime: ''
      });
      return;
    }

    const newValue = parseFloat(value);

    if (isNaN(newValue)) {
      return;
    }

    // Obtener el valor actual de `minimumTime`
    const minimumTime = parseFloat(element.businessObject.minimumTime);

    // Verificar que `maximumTime` sea mayor que `minimumTime`
    if (!isNaN(minimumTime) && newValue <= minimumTime) {
      alert('Maximum time must be greater than Minimum time.');
      return;
    }

    modeling.updateProperties(element, {
      maximumTime: newValue
    });
  };

  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('Maximum time')}
    getValue=${getValue}
    setValue=${setValue}
    debounce=${debounce}
    tooltip=${translate('Enter the maximum time.')} 
  />`;
}

function minimumTimeFunction(props) {
  const { element, id } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return '';
    }
    const value = element.businessObject.minimumTime;
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
        minimumTime: ''
      });
      return;
    }

    const newValue = parseFloat(value);

    if (isNaN(newValue)) {
      return;
    }

    // Obtener el valor actual de `maximumTime`
    const maximumTime = parseFloat(element.businessObject.maximumTime);

    // Verificar que `minimumTime` sea menor que `maximumTime`
    if (!isNaN(maximumTime) && newValue >= maximumTime) {
      alert('Minimum time must be less than Maximum time.');
      return;
    }

    modeling.updateProperties(element, {
      minimumTime: newValue
    });
  };

  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('Minimum time')}
    getValue=${getValue}
    setValue=${setValue}
    debounce=${debounce}
    tooltip=${translate('Enter the minimum time.')} 
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
  if (!element || !element.businessObject) {
    return 0;
  }
  const nuValue = element.businessObject.numberOfExecutions;
  return (typeof nuValue !== 'undefined' && !isNaN(nuValue)) ? nuValue : 0;
}