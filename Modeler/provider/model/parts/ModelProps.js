import { html } from 'htm/preact';
import { useService } from 'bpmn-js-properties-panel';
import { TextFieldEntry, CheckboxEntry } from '@bpmn-io/properties-panel';


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
    },
    {
      id: 'security',
      element,
      component: securityFunction,
      isEdited: isCheckboxEntryEdited
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
        return (typeof value !== 'undefined' && !isNaN(value)) ? value.toString() : '';
      } else {
        console.warn("processRef is missing for participant:", firstParticipant);
      }
    } else if (element.businessObject.instance !== undefined) {
      const value = element.businessObject.instance;
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
        return (typeof value !== 'undefined' && !isNaN(value)) ? value.toString() : '';
      } else {
        console.warn("processRef is missing for participant:", firstParticipant);
      }
    } else if (element.businessObject.frequency !== undefined) {
      const value = element.businessObject.frequency;
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
    if (!element || !element.businessObject) return '';

    if (element.businessObject.participants) {
      const firstParticipant = element.businessObject.participants[0];
      if (firstParticipant.processRef) {
        const value = firstParticipant.processRef.userWithoutRole;
        return value !== undefined ? value : '';
      } else {
        console.warn("processRef is missing for participant:", firstParticipant);
      }
    } else if (element.businessObject.userWithoutRole !== undefined) {
      const value = element.businessObject.userWithoutRole;
      return value !== undefined ? value : '';
    }

    return '';
  };

  const setValue = (value) => {
    if (typeof value === 'undefined' || !element || !element.businessObject) return;

    // Eliminar duplicados en el valor que se va a establecer
    const uniqueValue = Array.from(new Set(value.split(',').map(v => v.trim()))).join(', ');

    if (element.businessObject.participants) {
      element.businessObject.participants.forEach(participant => {
        if (participant.processRef && typeof participant.processRef === 'object') {
          try {
            modeling.updateModdleProperties(element, participant.processRef, {
              userWithoutRole: uniqueValue
            });
          } catch (error) {
            console.error("Failed to update properties for processRef:", error);
          }
        } else {
          console.warn("processRef is missing or invalid for participant:", participant);
        }
      });
    } else {
      modeling.updateProperties(element, {
        userWithoutRole: uniqueValue
      });
    }
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

  // Obtén el objeto userWithRole o un objeto vacío si no existe, considerando si es un bpmn:Collaboration
  const getuserWithRole = () => {
    if (!element || !element.businessObject) return {};

    if (element.businessObject.participants) {
      const firstParticipant = element.businessObject.participants[0];
      if (firstParticipant.processRef) {
        return firstParticipant.processRef.userWithRole || {};
      }
    }
    return element.businessObject.userWithRole || {};
  };

  // Función para actualizar el nombre del rol
  const setRoleName = (oldRole, newRole) => {
    const userWithRole = getuserWithRole();
    const updateduserWithRole = {};

    // Transferir los valores, cambiando el nombre del rol
    Object.keys(userWithRole).forEach(role => {
      updateduserWithRole[role === oldRole ? newRole : role] = userWithRole[role];
    });

    // Actualizar en cada participante si es Collaboration
    if (element.businessObject.participants) {
      element.businessObject.participants.forEach(participant => {
        if (participant.processRef) {
          modeling.updateModdleProperties(element, participant.processRef, {
            userWithRole: updateduserWithRole
          });
        }
      });
    } else {
      modeling.updateProperties(element, {
        userWithRole: updateduserWithRole
      });
    }
  };

  // Función para actualizar el valor de un rol en userWithRole
  const setuserWithRoleValue = (role, value) => {
    const userWithRole = getuserWithRole();
    const updateduserWithRole = { ...userWithRole, [role]: value };

    if (element.businessObject.participants) {
      element.businessObject.participants.forEach(participant => {
        if (participant.processRef) {
          modeling.updateModdleProperties(element, participant.processRef, {
            userWithRole: updateduserWithRole
          });
        }
      });
    } else {
      modeling.updateProperties(element, {
        userWithRole: updateduserWithRole
      });
    }
  };

  // Función para eliminar un rol y su valor asociado
  const removeRole = role => {
    const userWithRole = getuserWithRole();
    const updateduserWithRole = { ...userWithRole };
    delete updateduserWithRole[role];

    if (element.businessObject.participants) {
      element.businessObject.participants.forEach(participant => {
        if (participant.processRef) {
          modeling.updateModdleProperties(element, participant.processRef, {
            userWithRole: updateduserWithRole
          });
        }
      });
    } else {
      modeling.updateProperties(element, {
        userWithRole: updateduserWithRole
      });
    }
  };

  // Función para añadir un nuevo rol
  const addRole = () => {
    const userWithRole = getuserWithRole();
    const newRole = `role${Object.keys(userWithRole).length + 1}`;
    const updateduserWithRole = { ...userWithRole, [newRole]: '' };

    if (element.businessObject.participants) {
      element.businessObject.participants.forEach(participant => {
        if (participant.processRef) {
          modeling.updateModdleProperties(element, participant.processRef, {
            userWithRole: updateduserWithRole
          });
        }
      });
    } else {
      modeling.updateProperties(element, {
        userWithRole: updateduserWithRole
      });
    }
  };

  // Renderizar las entradas clave-valor
  const renderuserWithRoleEntries = () => {
    const userWithRole = getuserWithRole();
    return Object.keys(userWithRole).map(role => {
      return html`
        <div class="user-pool-item">
          <input 
            type="text" 
            value=${role} 
            onInput=${(event) => setRoleName(role, event.target.value)} 
            placeholder="Role name" 
            style="margin-right: 10px;" 
          />
          <input 
            type="text" 
            value=${userWithRole[role]} 
            onInput=${(event) => setuserWithRoleValue(role, event.target.value)} 
            placeholder="User name" 
          />
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

function securityFunction(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');

  const getValue = () => {
    if (!element || !element.businessObject) {
      return false;
    }
    const value = element.businessObject.security;
    return value === true;
  };

  const setValue = (value) => {
    if (!element || !element.businessObject) {
      return;
    }
    modeling.updateModdleProperties(element, element.businessObject, {
      security: value === true ? true : undefined
    });
  };

  return html`<${CheckboxEntry}
    id=${id}
    element=${element}
    label=${translate('Security')}
    getValue=${getValue}
    setValue=${setValue}
    tooltip=${translate('Enable or disable security setting.')}
  />`;
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

function isCheckboxEntryEdited(element) {
  if (!element || !element.businessObject) {
    return false;
  }
  const securityValue = element.businessObject.security;
  return typeof securityValue !== 'undefined';
}