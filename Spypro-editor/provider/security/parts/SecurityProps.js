import { html } from 'htm/preact';
import { CheckboxEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import { TextFieldEntry } from '@bpmn-io/properties-panel';


export default function(element) {
  return [
    {
      id: 'BoD',
      element,
      component: BoDFunction,
      isEdited: isCheckboxEntryEdited
    },
    {
      id: 'SoD',
      element,
      component: SoDFunction,
      isEdited: isCheckboxEntryEdited
    },
    {
      id: 'UoC',
      element,
      component: UoCFunction,
      isEdited: isCheckboxEntryEdited
    },
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
    },
    {
      id: 'P',
      element,
      component: PFunction, 
      isEdited: isNumberEntryEdited 
    },
    {
      id: 'User',
      element,
      component: UserFunction,
      isEdited: isStringEntryEdited
    },
    {
      id: 'Log',
      element,
      component: LogFunction,
      isEdited: isStringEntryEdited
    }
  ];
}

function BoDFunction(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return false; 
    }
    const value = element.businessObject.Bod;
    console.log('Current BoD value (getValue):', value);
    return value === true;
  };

  const setValue = value => {
    if (!element || !element.businessObject) {
      return; 
    }
    console.log('Setting BoD to (setValue):', value); 
    modeling.updateProperties(element, {
      Bod: value
    });
  };

  return html`<${CheckboxEntry}
    id=${id}
    element=${element}
    label=${translate('BoD')}
    getValue=${getValue}
    setValue=${setValue}
    debounce=${debounce}
    tooltip=${translate('Check BoD security')}
  />`;
}

function SoDFunction(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return false; 
    }
    const value = element.businessObject.Sod;
    console.log('Current SoD value (getValue):', value); 
    return value === true; 
  };

  const setValue = value => {
    if (!element || !element.businessObject) {
      return;
    }
    console.log('Setting SoD to (setValue):', value); 
    modeling.updateProperties(element, {
      Sod: value
    });
  };

  return html`<${CheckboxEntry}
    id=${id}
    element=${element}
    label=${translate('SoD')}
    getValue=${getValue}
    setValue=${setValue}
    debounce=${debounce}
    tooltip=${translate('Check SoD security')}
  />`;
}

function UoCFunction(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return false; 
    }
    const value = element.businessObject.Uoc; 
    console.log('Current UoC value (getValue):', value);
    return value === true; 
  };

  const setValue = value => {
    if (!element || !element.businessObject) {
      return; 
    }
    console.log('Setting UoC to (setValue):', value); 
    modeling.updateProperties(element, {
      Uoc: value 
    });
  };

  return html`<${CheckboxEntry}
    id=${id}
    element=${element}
    label=${translate('UoC')}
    getValue=${getValue}
    setValue=${setValue}
    debounce=${debounce}
    tooltip=${translate('Check UoC security')}
  />`;
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
    console.log('Current Nu value (getValue):', value); 
    return value !== undefined ? value : ''; 
  };

  const setValue = value => {
    if (!element || !element.businessObject) {
      return;
    }
    console.log('Setting Nu to (setValue):', value); 
    modeling.updateProperties(element, {
      Nu: Number(value) 
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
    return value !== undefined ? value : ''; 
  };

  const setValue = value => {
    if (!element || !element.businessObject) {
      return; 
    }
    console.log('Setting Mth to (setValue):', value); 
    modeling.updateProperties(element, {
      Mth: Number(value) 
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

function PFunction(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return ''; 
    }
    const value = element.businessObject.P;
    console.log('Current P value (getValue):', value); 
    return value !== undefined ? value : ''; 
  };

  const setValue = value => {
    if (!element || !element.businessObject) {
      return; 
    }
    console.log('Setting P to (setValue):', value); 
    modeling.updateProperties(element, {
      P: Number(value) 
    });
  };

  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('P')}
    getValue=${getValue}
    setValue=${debounce(setValue)}
    debounce=${debounce}
    tooltip=${translate('Enter a numeric value.')}
  />`;
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

function LogFunction(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return ''; 
    }
    const value = element.businessObject.Log;
    console.log('Current Log value (getValue):', value); 
    return value !== undefined ? value : ''; 
  };

  const setValue = value => {
    if (!element || !element.businessObject) {
      return; 
    }
    console.log('Setting Log to (setValue):', value); 
    modeling.updateProperties(element, {
      Log: value 
    });
  };

  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('Log')}
    getValue=${getValue}
    setValue=${debounce(setValue)}
    debounce=${debounce}
    tooltip=${translate('Enter a user name.')}
  />`;
}

function isCheckboxEntryEdited(element) {
  if (!element || !element.businessObject) {
    return false;
  }
  const boDValue = element.businessObject.Bod;
  const soDValue = element.businessObject.Sod;
  const uoCValue = element.businessObject.Uoc;
  return typeof boDValue !== 'undefined' || typeof soDValue !== 'undefined' || typeof uoCValue !== 'undefined';
}

function isNumberEntryEdited(element) {
  if (!element || !element.businessObject) {
    return 0;
  }
  const nuValue = element.businessObject.Nu;
  return (typeof nuValue !== 'undefined' && !isNaN(nuValue)) ? nuValue : 0;
}

function isStringEntryEdited(element) {
  if (!element || !element.businessObject) {
    return false;
  }
  const userValue = element.businessObject.User;
  return typeof userValue !== 'undefined' && userValue !== '';
}