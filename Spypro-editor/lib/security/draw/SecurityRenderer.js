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

export default function SecurityRender(eventBus) {
  BaseRenderer.call(this, eventBus, 1500);

  this.canRender = function(element) {
    return is(element, 'bpmn:ServiceTask');
  };


  this.drawShape = function(parent, shape) {
    var url = SoD.dataURL;

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

SecurityRender.$inject = [ 'eventBus' ];

/*function SecurityRenderer(eventBus) {
  BaseRenderer.call(this, eventBus, 1500); // Call the super constructor
}

inherits(SecurityRenderer, BaseRenderer); // Set up inheritance

SecurityRenderer.prototype.canRender = function(element) {
  return is(element, 'bpmn:ServiceTask');
};

SecurityRenderer.prototype.drawShape = function(parent, shape) {
  var lockGfx = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  lockGfx.setAttribute('x', 0);
  lockGfx.setAttribute('y', 0);
  lockGfx.setAttribute('width', shape.width);
  lockGfx.setAttribute('height', shape.height);
  lockGfx.setAttribute('href', lockDataURL);

  parent.appendChild(lockGfx);

  return lockGfx;
};

module.exports = SecurityRenderer;*/
