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
    },
    {
      id: 'userWithoutRole',
      element,
      component: userWithoutRoleFunction,
      isEdited: isListOfStringEntryEdited
    },
    {
      id: 'userWithRole',
      element,
      component: userWithRoleFunction,
      isEdited: element => isStringEntryEdited(element, 'userWithRole')
    }
  ];
}

function instanceFunction(props) {
  const { element, id } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) return '';

    // Acceder al valor en processRef de cada participante
    if (element.businessObject.participants) {
      const firstParticipant = element.businessObject.participants[0];
      if (firstParticipant.processRef) {
        const value = firstParticipant.processRef.instance;
        console.log("Current instance value in processRef:", value);
        return (typeof value !== 'undefined' && !isNaN(value)) ? value.toString() : '';
      } else {
        console.warn("processRef is missing for participant:", firstParticipant);
      }
    } else if (element.businessObject.instance !== undefined) {
      const value = element.businessObject.instance;
      console.log("Current instance value:", value);
      return (typeof value !== 'undefined' && !isNaN(value)) ? value.toString() : '';
    }

    return '';
  };

  const setValue = (value) => {
    if (typeof value === 'undefined' || !element || !element.businessObject) {
      return;
    }

    const newValue = value.trim() === '' ? '' : parseInt(value, 10);
    if (isNaN(newValue)) return;

    // Si el elemento es Collaboration, verifica cada participant y su processRef
    if (element.businessObject.participants) {
      element.businessObject.participants.forEach(participant => {
        if (participant.processRef && typeof participant.processRef === 'object') {
          try {
            modeling.updateModdleProperties(element, participant.processRef, {
              instance: newValue
            });
            console.log("Instance value after update in processRef:", participant.processRef.instance);
          } catch (error) {
            console.error("Failed to update properties for processRef:", error);
          }
        } else {
          console.warn("processRef is missing or invalid for participant:", participant);
        }
      });
    } else {
      // Actualización directa si no es un Collaboration
      modeling.updateProperties(element, {
        instance: newValue
      });
      console.log("Instance value after update:", element.businessObject.instance);
    }
  };

  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('Number of instances')}
    getValue=${getValue}
    setValue=${setValue}
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
    if (!element || !element.businessObject) return '';

    // Acceder al valor en processRef de cada participante
    if (element.businessObject.participants) {
      const firstParticipant = element.businessObject.participants[0];
      if (firstParticipant.processRef) {
        const value = firstParticipant.processRef.frequency;
        console.log("Current frequency value in processRef:", value);
        return (typeof value !== 'undefined' && !isNaN(value)) ? value.toString() : '';
      } else {
        console.warn("processRef is missing for participant:", firstParticipant);
      }
    } else if (element.businessObject.frequency !== undefined) {
      const value = element.businessObject.frequency;
      console.log("Current frequency value:", value);
      return (typeof value !== 'undefined' && !isNaN(value)) ? value.toString() : '';
    }

    return '';
  };

  const setValue = (value) => {
    if (typeof value === 'undefined' || !element || !element.businessObject) {
      return;
    }

    const newValue = value.trim() === '' ? '' : parseInt(value, 10);
    if (isNaN(newValue)) return;

    // Si el elemento es Collaboration, verifica cada participant y su processRef
    if (element.businessObject.participants) {
      element.businessObject.participants.forEach(participant => {
        if (participant.processRef && typeof participant.processRef === 'object') {
          try {
            modeling.updateModdleProperties(element, participant.processRef, {
              frequency: newValue
            });
            console.log("Frequency value after update in processRef:", participant.processRef.frequency);
          } catch (error) {
            console.error("Failed to update properties for processRef:", error);
          }
        } else {
          console.warn("processRef is missing or invalid for participant:", participant);
        }
      });
    } else {
      // Actualización directa si no es un Collaboration
      modeling.updateProperties(element, {
        frequency: newValue
      });
      console.log("Frequency value after update:", element.businessObject.frequency);
    }
  };

  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('Frequency')}
    getValue=${getValue}
    setValue=${setValue}
    debounce=${debounce}
    tooltip=${translate('Enter the frequency')}
  />`;
}

function userWithoutRoleFunction(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return ''; 
    }
    const value = element.businessObject.userWithoutRole; 
    return value !== undefined ? value : ''; 
  };

  const setValue = value => {
    if (!element || !element.businessObject) {
      return; 
    }

    // Asegúrate de que la propiedad userWithoutRole está presente en el businessObject
    modeling.updateProperties(element, {
      userWithoutRole: value 
    });
  };

  return html`<${TextFieldEntry}
    id=${id}
    element=${element}
    label=${translate('User without role')}
    getValue=${getValue}
    setValue=${setValue}
    debounce=${debounce}
    tooltip=${translate('Enter a user name without role.')} 
  />`;
}

function userWithRoleFunction(props) {
  const { element, id } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  // Obtén el objeto userWithRole o un objeto vacío si no existe
  const getuserWithRole = () => {
    if (!element || !element.businessObject) {
      return {};
    }
    return element.businessObject.userWithRole || {};
  };

  // Función para actualizar el nombre del rol
  const setRoleName = (oldRole, newRole) => {
    const userWithRole = getuserWithRole();
    const updateduserWithRole = {};

    // Transferir los valores, cambiando el nombre del rol
    Object.keys(userWithRole).forEach(role => {
      if (role === oldRole) {
        updateduserWithRole[newRole] = userWithRole[role];
      } else {
        updateduserWithRole[role] = userWithRole[role];
      }
    });

    // Actualizar el businessObject con el nuevo userWithRole
    modeling.updateProperties(element, {
      userWithRole: updateduserWithRole
    });
  };

  // Función para actualizar el valor de un rol en el userWithRole
  const setuserWithRoleValue = (role, value) => {
    const userWithRole = getuserWithRole();
    const updateduserWithRole = { ...userWithRole, [role]: value };

    // Actualizar el businessObject con el nuevo userWithRole
    modeling.updateProperties(element, {
      userWithRole: updateduserWithRole
    });
  };

  // Función para eliminar un rol y su valor asociado del userWithRole
  const removeRole = (role) => {
    const userWithRole = getuserWithRole();
    const updateduserWithRole = { ...userWithRole };
    delete updateduserWithRole[role]; // Eliminar el rol específico

    // Actualizar el businessObject con el nuevo userWithRole
    modeling.updateProperties(element, {
      userWithRole: updateduserWithRole
    });
  };

  // Función para añadir un nuevo rol al userWithRole
  const addRole = () => {
    const userWithRole = getuserWithRole();
    const newRole = `role${Object.keys(userWithRole).length + 1}`; // Crear una clave única para el nuevo rol
    const updateduserWithRole = { ...userWithRole, [newRole]: '' };

    modeling.updateProperties(element, {
      userWithRole: updateduserWithRole
    });
  };

  // Renderizar las entradas clave-valor
  const renderuserWithRoleEntries = () => {
    const userWithRole = getuserWithRole();
    return Object.keys(userWithRole).map(role => {
      return html`
        <div class="user-pool-item">
          <!-- Entrada editable para el nombre del rol (clave) -->
          <input 
            type="text" 
            value=${role} 
            onInput=${(event) => setRoleName(role, event.target.value)} 
            placeholder="Role name" 
            style="margin-right: 10px;" 
          />
          <!-- Entrada para el valor asociado al rol -->
          <input 
            type="text" 
            value=${userWithRole[role]} 
            onInput=${(event) => setuserWithRoleValue(role, event.target.value)} 
            placeholder="User name" 
          />
          <!-- Botón para eliminar el rol -->
          <button 
            class="remove-role-button" 
            onClick=${() => removeRole(role)}
            style="margin-left: 10px; background-color: red; color: white;">
            ${translate('X')}
          </button>
        </div>
      `;
    });
  };

  return html`
    <div class="user-pool-container">
      ${renderuserWithRoleEntries()}
      <button class="add-role-button" onClick=${addRole}>${translate('Add role with user')}</button>
    </div>
  `;
}

function isNumberEntryEdited(element) {

  if (!element || !element.businessObject) {
    return '';
  }

  const nuValue = element.businessObject.numberOfExecutions;

  return nuValue;
}

function isStringEntryEdited(element, attributeName) {
  if (!element || !element.businessObject) {
    return false;
  }

  const value = element.businessObject[attributeName];

  return typeof value === 'string' && value.trim() !== '';
}

function isListOfStringEntryEdited(element) {
  if (!element || !element.businessObject) {
    return false;
  }

  const userWithoutRoleValues = element.businessObject.userWithoutRole;

  // Verificamos que userWithoutRole es un array
  if (!Array.isArray(userWithoutRoleValues)) {
    return false;
  }

  // Retornamos true si al menos un elemento en la lista no es un string vacío
  return userWithoutRoleValues.some(value => typeof value === 'string' && value !== '');
}