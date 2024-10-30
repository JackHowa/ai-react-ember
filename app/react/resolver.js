import { computed } from '@ember/object';
// eslint-disable-next-line ember/no-classic-components
import EmberComponent from '@ember/component';
import GlimmerComponent from '@glimmer/component';

import Resolver from 'ember-resolver';
import ReactWrapper from './wrapper';

const REACT_COMPONENT_TYPE = 'react-component';

export default Resolver.extend({
  // adopted from https://discuss.emberjs.com/t/more-advanced-ember-cli-pod/7226
  moduleNameLookupPatterns: computed(function () {
    const defaults = this._super();
    return [
      ...defaults,
      function (parsedName) {
        // don't do anything if we aren't checking for a react component
        if (parsedName.type != REACT_COMPONENT_TYPE) {
          return;
        }

        // templates already have 'components/' in the name
        const typePath =
          parsedName.resolveMethodName === 'resolveTemplate'
            ? ''
            : 'components/';

        // we expect the entry point for react components to be components/[name]/index.jsx
        return `${parsedName.prefix}/${typePath}${parsedName.fullNameWithoutType}/index`;
      },
    ];
  }),

  // adopted from https://github.com/AltSchool/ember-cli-react/blob/master/addon/resolver.js#L9
  resolveComponent(parsedName) {
    // try to find the react component
    const component = this.resolveOther({
      ...parsedName,
      type: REACT_COMPONENT_TYPE,
    });

    // if we don't find any component or we find a ember/glimmer component, return null so ember will try to find the regular component
    // https://github.com/ember-cli/ember-resolver/blob/5f4546e0963169afc12f93a387e494980b9b95a9/addon/resolvers/classic/index.js#L176
    if (
      !component ||
      component.prototype instanceof EmberComponent ||
      component.prototype instanceof GlimmerComponent
    ) {
      return null;
    }

    // wrap the react component so ember doesn't know the difference
    return ReactWrapper(component, parsedName.fullNameWithoutType);
  },

  // allows us to add a default template for all react components
  resolveTemplate(parsedName) {
    // same as above, we are going to check to see if this is a react component
    if (
      !this.resolveOther({
        ...parsedName,
        type: REACT_COMPONENT_TYPE,
      })
    ) {
      return null;
    }

    // return a custom template so we can find the desired root
    return this.resolveOther({
      ...parsedName,
      fullName: 'template:react',
      fullNameWithoutType: 'react',
      name: 'react',
    });
  },
});
