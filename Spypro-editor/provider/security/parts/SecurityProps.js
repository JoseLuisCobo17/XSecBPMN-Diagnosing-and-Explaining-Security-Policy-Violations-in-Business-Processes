import { html } from 'htm/preact';
import { CheckboxEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

export default function(element) {
  return [
    {
      id: 'BoD',
      element,
      component: BoDFunction,
      isEdited: isCheckboxEntryEdited
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

function isCheckboxEntryEdited(element) {
  if (!element || !element.businessObject) {
    return false;
  }
  const propValue = element.businessObject.Bod;
  return typeof propValue !== 'undefined';
}
