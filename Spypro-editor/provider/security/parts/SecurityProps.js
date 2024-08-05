import { html } from 'htm/preact';

import { CheckboxEntry, isCheckboxEntryEdited } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

export default function(element) {
  return [
    {
      id: 'spell',
      element,
      component: Spell,
      isEdited: () => {
        return isCheckboxEntryEdited() ? true : false;
      }
    }
  ];
}

function Spell(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return element.businessObject.spell || false;
  };

  const setValue = value => {
    return modeling.updateProperties(element, {
      spell: value
    });
  };

  return html`<${CheckboxEntry}
    id=${ id }
    element=${ element }
    description=${ translate('Apply a black magic spell') }
    label=${ translate('Spell') }
    getValue=${ getValue }
    setValue=${ setValue }
    debounce=${ debounce }
    tooltip=${ translate('Check available spells in the spellbook.') }
  />`;
}
