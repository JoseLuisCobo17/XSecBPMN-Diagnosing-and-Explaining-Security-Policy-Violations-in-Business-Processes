'use strict';

var entryFactory = require('bpmn-js-properties-panel');

var is = require('bpmn-js/lib/util/ModelUtil').is;

module.exports = function(group, element) {

  // Only return an entry, if the currently selected
  // element is a start event.

  if (is(element, 'bpmn:ServiceTask')) {
    group.entries.push(entryFactory.checkbox({
      id : 'BoD',
      description : '',
      label : 'BoD Security Task',
      options:[],
      modelProperty : 'BoD'
    }));
    
    group.entries.push(entryFactory.checkbox({
      id : 'SoD',
      description : '',
      label : 'SoD Security Task',
      options:[],
      modelProperty : 'SoD'
    }));

    group.entries.push(entryFactory.checkbox({
      id : 'UoC',
      description : '',
      label : 'UoC Security Task',
      options:[],
      modelProperty : 'UoC'
    }));

    group.entries.push(entryFactory.textBox({
      id : 'Nu',
      label : 'Nu',
      modelProperty : 'Nu'
    }));

    group.entries.push(entryFactory.textBox({
      id : 'Mth',
      label : 'Mth',
      modelProperty : 'Mth'
    }));

    group.entries.push(entryFactory.textBox({
      id : 'P',
      label : 'P',
      modelProperty : 'P'
    }));

    group.entries.push(entryFactory.textBox({
      id : 'User',
      label : 'User',
      modelProperty : 'User'
    }));

    group.entries.push(entryFactory.textBox({
      id : 'Log',
      label : 'Log',
      modelProperty : 'Log'
    }));

  }

};