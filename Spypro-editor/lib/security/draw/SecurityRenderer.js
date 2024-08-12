'use strict';

var inherits = require('inherits');
var BaseRenderer = require('diagram-js/lib/draw/BaseRenderer');
var is = require('bpmn-js/lib/util/ModelUtil').is;
var lockDataURL = require('../lock').dataURL;

function SecurityRenderer(eventBus) {
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

module.exports = SecurityRenderer;
