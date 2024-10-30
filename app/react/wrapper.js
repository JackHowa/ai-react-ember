import Component from '@glimmer/component';
import { action } from '@ember/object';
import { addObserver, removeObserver } from '@ember/object/observers';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';

let prefix = 0;

const DYNAMIC_TAG_PARAM_NAME = '_ember_wrapper_tag_';

export default (ReactComponent) =>
  class ReactWrapper extends Component {
    // wrapper tag element, defaults to div
    get domElement() {
      return (
        this.args[DYNAMIC_TAG_PARAM_NAME] ||
        ReactComponent[DYNAMIC_TAG_PARAM_NAME] ||
        'div'
      );
    }

    get watchedArgs() {
      return Object.entries(this.args).reduce((obj, [key, value]) => {
        if (key !== DYNAMIC_TAG_PARAM_NAME) {
          obj[key] = value;
        }
        return obj;
      }, {});
    }

    constructor() {
      super(...arguments);

      // add an observer to each argument so we can update the react component
      Object.keys(this.watchedArgs).forEach((key) =>
        // eslint-disable-next-line ember/no-observers
        addObserver(this, `args.${key}`, this.emberUpdate)
      );
    }

    willDestroy() {
      super.willDestroy(...arguments);

      // remove the observers
      Object.keys(this.watchedArgs).forEach((key) =>
        removeObserver(this, `args.${key}`, this.emberUpdate)
      );

      // unmount the react root
      this.container?.unmount();
    }

    generateComponent() {
      // return the wrapped component (StrictMode will cause a double render - https://reactjs.org/docs/strict-mode.html)
      return (
        <StrictMode>
          <ReactComponent {...this.watchedArgs} />
        </StrictMode>
      );
    }

    emberUpdate() {
      // re-render the component with the new arguments
      this.container?.render(this.generateComponent());
    }

    @action
    emberRender(element) {
      // create a react root using the element as the container (use identifierPrefix because we have multiple roots)
      this.container = createRoot(element, {
        identifierPrefix: `wrapper-${++prefix}`,
      });

      // render the component into the react root
      this.container.render(this.generateComponent());
    }
  };
