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
      id: 'userPool',
      element,
      component: userPoolFunction,
      isEdited: element => isStringEntryEdited(element, 'userPool')
    }
  ];
}

function instanceFunction(props) {
    const { element, id } = props;
    const modeling = useService('modeling');
    const translate = useService('translate');
    const debounce = useService('debounceInput');
  
    const getValue = () => {
      if (!element || !element.businessObject) {
        return '';
      }
      const value = element.businessObject.instance;
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
          instance: ''
        });
        return;
      }
  
      const newValue = parseInt(value, 10);
      if (isNaN(newValue)) {
        return;
      }
  
      modeling.updateProperties(element, {
        instance: newValue
      });
    };
    return html`<${TextFieldEntry}
      id=${id}
      element=${element}
      label=${translate('Number of instances')}
      getValue=${getValue}
      setValue=${debounce(setValue)}
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
      if (!element || !element.businessObject) {
        return '';
      }
      const value = element.businessObject.frequency;
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
          frequency: ''
        });
        return;
      }
  
      const newValue = parseInt(value, 10);
      if (isNaN(newValue)) {
        return;
      }
  
      modeling.updateProperties(element, {
        frequency: newValue
      });
    };
    return html`<${TextFieldEntry}
      id=${id}
      element=${element}
      label=${translate('Number of frequency')}
      getValue=${getValue}
      setValue=${debounce(setValue)}
      debounce=${debounce}
      tooltip=${translate('Enter the number of different frequency.')} 
    />`;
}

function userPoolFunction(props) {
  const { element, id } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  // Obtén el objeto userPool o un objeto vacío si no existe
  const getUserPool = () => {
    if (!element || !element.businessObject) {
      return {};
    }
    return element.businessObject.userPool || {};
  };

  // Función para actualizar el nombre del rol
  const setRoleName = (oldRole, newRole) => {
    const userPool = getUserPool();
    const updatedUserPool = {};

    // Transferir los valores, cambiando el nombre del rol
    Object.keys(userPool).forEach(role => {
      if (role === oldRole) {
        updatedUserPool[newRole] = userPool[role];
      } else {
        updatedUserPool[role] = userPool[role];
      }
    });

    // Actualizar el businessObject con el nuevo userPool
    modeling.updateProperties(element, {
      userPool: updatedUserPool
    });
  };

  // Función para actualizar el valor de un rol en el userPool
  const setUserPoolValue = (role, value) => {
    const userPool = getUserPool();
    const updatedUserPool = { ...userPool, [role]: value };

    // Actualizar el businessObject con el nuevo userPool
    modeling.updateProperties(element, {
      userPool: updatedUserPool
    });
  };

  // Función para añadir un nuevo rol al userPool
  const addRole = () => {
    const userPool = getUserPool();
    const newRole = `role${Object.keys(userPool).length + 1}`; // Crear una clave única para el nuevo rol
    const updatedUserPool = { ...userPool, [newRole]: '' };

    modeling.updateProperties(element, {
      userPool: updatedUserPool
    });
  };

  // Renderizar las entradas clave-valor
  const renderUserPoolEntries = () => {
    const userPool = getUserPool();
    return Object.keys(userPool).map(role => {
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
            value=${userPool[role]} 
            onInput=${(event) => setUserPoolValue(role, event.target.value)} 
            placeholder="User name" 
          />
        </div>
      `;
    });
  };

  return html`
    <div class="user-pool-container">
      ${renderUserPoolEntries()}
      <button class="add-role-button" onClick=${addRole}>${translate('Add Role')}</button>
    </div>
  `;
}

function isNumberEntryEdited(element) {
  console.log("element:", element.businessObject);

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

  const userPool = element.businessObject.userPool;

  if (!userPool || typeof userPool !== 'object') {
    return false;
  }

  // Verificar si algún valor en userPool no es un string vacío
  return Object.values(userPool).some(value => typeof value === 'string' && value !== '');
}

function isListOfRolesEntryEdited(element) {
  if (!element || !element.businessObject) {
    return false;
  }

  const rolPool = element.businessObject.rolPool;

  // Verificar si rolPool es un array y contiene al menos un string no vacío
  return Array.isArray(rolPool) && rolPool.some(role => typeof role === 'string' && role !== '');
}
