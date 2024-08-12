'use strict';

import inherits from 'inherits';
import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';

function ResizeAllRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(ResizeAllRules, RuleProvider);

ResizeAllRules.prototype.init = function() {
  this.addRule('shape.resize', 1500, function() {
    return true;
  });
};

export default ResizeAllRules;
