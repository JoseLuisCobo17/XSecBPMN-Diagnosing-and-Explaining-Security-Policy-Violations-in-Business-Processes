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
      return false; // Valor predeterminado si businessObject no está definido
    }
    const value = element.businessObject.Bod;
    console.log('Current BoD value (getValue):', value); // Log para depuración
    return value === true; // Asegurarse de que devuelve un booleano
  };

  const setValue = value => {
    if (!element || !element.businessObject) {
      return; // Salir si businessObject no está definido
    }
    console.log('Setting BoD to (setValue):', value); // Log para depuración
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
    tooltip=${translate('Check available spells in the spellbook.')}
  />`;
}

function SoDFunction(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return false; // Valor predeterminado si businessObject no está definido
    }
    const value = element.businessObject.Sod;
    console.log('Current SoD value (getValue):', value); // Log para depuración
    return value === true; // Asegurarse de que devuelve un booleano
  };

  const setValue = value => {
    if (!element || !element.businessObject) {
      return; // Salir si businessObject no está definido
    }
    console.log('Setting SoD to (setValue):', value); // Log para depuración
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
    tooltip=${translate('Check available spells in the spellbook.')}
  />`;
}

function UoCFunction(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return false; // Valor predeterminado si businessObject no está definido
    }
    const value = element.businessObject.Uoc; // Nota: UoC debe ser Uoc para coincidir con la base de datos
    console.log('Current UoC value (getValue):', value); // Log para depuración
    return value === true; // Asegurarse de que devuelve un booleano
  };

  const setValue = value => {
    if (!element || !element.businessObject) {
      return; // Salir si businessObject no está definido
    }
    console.log('Setting UoC to (setValue):', value); // Log para depuración
    modeling.updateProperties(element, {
      Uoc: value // Asegúrate de que es "Uoc" aquí
    });
  };

  return html`<${CheckboxEntry}
    id=${id}
    element=${element}
    label=${translate('UoC')}
    getValue=${getValue}
    setValue=${setValue}
    debounce=${debounce}
    tooltip=${translate('Check available spells in the spellbook.')}
  />`;
}

function NuFunction(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return ''; // Valor predeterminado si businessObject no está definido
    }
    const value = element.businessObject.Nu;
    console.log('Current Nu value (getValue):', value); // Log para depuración
    return value !== undefined ? value : ''; // Devuelve el valor o una cadena vacía
  };

  const setValue = value => {
    if (!element || !element.businessObject) {
      return; // Salir si businessObject no está definido
    }
    console.log('Setting Nu to (setValue):', value); // Log para depuración
    modeling.updateProperties(element, {
      Nu: Number(value) // Asegúrate de convertir a número
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
      return ''; // Valor predeterminado si businessObject no está definido
    }
    const value = element.businessObject.Mth;
    console.log('Current Mth value (getValue):', value); // Log para depuración
    return value !== undefined ? value : ''; // Devuelve el valor o una cadena vacía
  };

  const setValue = value => {
    if (!element || !element.businessObject) {
      return; // Salir si businessObject no está definido
    }
    console.log('Setting Mth to (setValue):', value); // Log para depuración
    modeling.updateProperties(element, {
      Mth: Number(value) // Asegúrate de convertir a número
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
    return false;
  }
  const nuValue = element.businessObject.Nu;
  return typeof nuValue !== 'undefined' && !isNaN(nuValue);
}
