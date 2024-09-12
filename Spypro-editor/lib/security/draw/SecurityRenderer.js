'use strict';

import inherits from 'inherits-browser';
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';

import {
  is
} from 'bpmn-js/lib/util/ModelUtil';
import {
  append as svgAppend,
  create as svgCreate
} from 'tiny-svg';
import SoD from '../lock';
import BoD from '../lock'; // Importa la nueva imagen de BoD

export default function SecurityRender(eventBus, renderType) { // Recibe renderType directamente
  BaseRenderer.call(this, eventBus, 1500);

  // Verifica si el elemento es del tipo ServiceTask
  this.canRender = function(element) {
    return is(element, 'bpmn:ServiceTask');
  };

  // Dibuja la forma dependiendo del tipo de renderizado (SoD o BoD)
  this.drawShape = function(parent, shape) {
    var url;

    // Usa renderType para determinar si es 'SoD' o 'BoD'
    if (renderType === 'BoD') {
      url = BoD.dataURL; // Usa la imagen BoD
    } else {
      url = SoD.dataURL; // Usa la imagen SoD por defecto
    }

    var lockGfx = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href: url
    });

    svgAppend(parent, lockGfx);

    return lockGfx;
  };
}

inherits(SecurityRender, BaseRenderer);

// No necesitamos inyección de renderType
SecurityRender.$inject = ['eventBus'];
