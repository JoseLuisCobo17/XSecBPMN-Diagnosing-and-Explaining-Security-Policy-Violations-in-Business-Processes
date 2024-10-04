import { html } from 'htm/preact';
import { useService } from 'bpmn-js-properties-panel';
import { TextFieldEntry } from '@bpmn-io/properties-panel';


export default function(element) {
  return [
    {
      id: 'Nu',
      element,
      component: NuFunction, 
      isEdited: isNumberEntryEdited 
    },
    {
      id: 'Mth',
      element,
      component: MthFunction, 
      isEdited: isNumberEntryEdited 
    }
  ];
}

function NuFunction(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return '';
    }
    const value = element.businessObject.Nu;
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
        Nu: ''
      });
      return;
    }

    const newValue = parseFloat(value);

    if (isNaN(newValue)) {
      return;
    }

    modeling.updateProperties(element, {
      Nu: newValue
    });
  };

  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('Nu')}
    getValue=${getValue}
    setValue=${debounce(setValue)}
    debounce=${debounce}
    tooltip=${translate('Enter a numeric value.')}
  />`;
}

function MthFunction(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return '';
    }
    const value = element.businessObject.Mth;
    console.log('Current Mth value (getValue):', value);
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
        Mth: ''
      });
      return;
    }
    const newValue = parseFloat(value);

    if (isNaN(newValue)) {
      return;
    }

    console.log('Setting Mth to (setValue):', newValue);
    modeling.updateProperties(element, {
      Mth: newValue
    });
  };

  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('Mth')}
    getValue=${getValue}
    setValue=${debounce(setValue)}
    debounce=${debounce}
    tooltip=${translate('Enter a numeric value.')}
  />`;
}

function isNumberEntryEdited(element) {
  if (!element || !element.businessObject) {
    return 0;
  }
  const nuValue = element.businessObject.Nu;
  return (typeof nuValue !== 'undefined' && !isNaN(nuValue)) ? nuValue : 0;
}