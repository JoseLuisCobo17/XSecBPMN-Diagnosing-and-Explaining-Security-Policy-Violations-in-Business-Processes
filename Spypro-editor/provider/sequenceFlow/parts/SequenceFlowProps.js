import { html } from 'htm/preact';
import { useService } from 'bpmn-js-properties-panel';
import { TextFieldEntry } from '@bpmn-io/properties-panel';
import { is } from 'bpmn-js/lib/util/ModelUtil';


export default function(element) {
  return [
    {
      id: 'sequenceFlow',
      element,
      component: PercentageofBranchesFunction,
      isEdited: isNumberEntryEdited
    }
  ];
}

// PercentageofBranches
function PercentageofBranchesFunction(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return '';
    }
    const value = element.businessObject.percentageOfBranches; 
    console.log('Current percentageOfBranches value (getValue):', value);
    return value !== undefined ? value : '';
  };
  
// En SequenceFlowProps.js, en la función setValue:
const setValue = value => {
  if (!element || !element.businessObject) {
    return;
  }

  // Convertir el valor a un número entero para la validación
  const newPercentage = parseInt(value, 10);

  // Obtener el Gateway de origen
  const sourceElement = element.businessObject.sourceRef;

  // Verificar si el Gateway de origen es válido
  if (sourceElement && is(sourceElement, 'bpmn:Gateway')) {
    
    // Obtener todas las ramas salientes del mismo Gateway
    const outgoingFlows = sourceElement.outgoing || [];

    // Calcular la suma de los percentageOfBranches de todas las ramas salientes
    let totalPercentage = 0;

    outgoingFlows.forEach(flow => {
      // Ignorar la secuencia de flujo actual al sumar
      if (flow !== element.businessObject) {
        totalPercentage += parseInt(flow.percentageOfBranches || 0, 10);
      }
    });

    // Añadir el nuevo valor a la suma total
    totalPercentage += newPercentage;

    // Verificar si la suma total es mayor que 100
    if (totalPercentage > 100) {
      // Mostrar un error o alerta
      alert('La suma de todas las ramas del Gateway excede el 100%. Ajusta los valores.');
      return; // No permitir el cambio si la suma excede 100
    }
  }

  // Si la suma es válida, actualizar la propiedad
  modeling.updateProperties(element, {
    percentageOfBranches: newPercentage
  });
};


  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('Percentage of branche')}
    getValue=${getValue}
    setValue=${debounce(setValue)}
    debounce=${debounce}
    tooltip=${translate('Enter a user percentage of branche.')} 
  />`;
}

function isNumberEntryEdited(element) {
  console.log("element:" + element.businessObject)
  if (!element || !element.businessObject) {
    return 0;
  }
  const nuValue = element.businessObject.numberOfExecutions;
  return (typeof nuValue !== 'undefined' && !isNaN(nuValue)) ? nuValue : 0;
}