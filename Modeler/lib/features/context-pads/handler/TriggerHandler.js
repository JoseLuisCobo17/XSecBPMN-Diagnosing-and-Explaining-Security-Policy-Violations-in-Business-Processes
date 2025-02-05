import {
  PlayIcon
} from '../../../../images/icons';


export default function TriggerHandler(simulator) {
  this._simulator = simulator;
}

TriggerHandler.$inject = [
  'simulator'
];

TriggerHandler.prototype.createContextPads = function(element) {
  return [
    this.createTriggerContextPad(element)
  ];
};

TriggerHandler.prototype.createTriggerContextPad = function(element) {

  const contexts = () => {
    const subscriptions = this._findSubscriptions({
      element
    });

    const sortedSubscriptions = subscriptions.slice().sort((a, b) => {
      return a.event.type === 'none' ? 1 : -1;
    });

    return sortedSubscriptions;
  };

  const html = `
    <div class="bts-context-pad" title="Trigger Event">
      ${PlayIcon()}
    </div>
  `;

  const action = (subscriptions) => {

    const {
      event,
      scope
    } = subscriptions[0];

    return this._simulator.trigger({
      event,
      scope
    });
  };

  return {
    action,
    element,
    html,
    contexts
  };
};

TriggerHandler.prototype._findSubscriptions = function(options) {
  return this._simulator.findSubscriptions(options);
};