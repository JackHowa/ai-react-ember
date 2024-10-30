# React to Ember migration with Generative AI 

## Phase 1 

- [x] Setup a working React in Ember app
- [x] Ember components with only templates
- [x] Run ai gemini script

### Phase 2 

- [x] Come up with a sample app. Docusign app with lots of markup might be good.
- [x] Update title from super rental in package.json name and other places
- [x] Generate loads of components with markdown
- [x] Line up the existing scripts to run in sequence

## Phase 3

- [ ] Migrate component files as well as templates
- [x] Migrate parent dom components

## Commands 

1. `gcloud auth login`
1. `export ACCESS_TOKEN="$(gcloud auth print-access-token)"`
1. `export PROJECT_ID=""`
1. `npm start`
1. `npm run migrate:create-template-only-ember-components`
1. `npm run migrate:find-potential-ember-components`
1. `npm run migrate:call-ai-model`
1. `npm run migrate:ember-components`

### Commands explained 

#### `npm start`

Serves Ember.js with React components inside. Watches files and updates with file changes. 

#### `npm run migrate:create-template-only-ember-components`

Uses ASTs to look through all Ember.js components and their respective JavaScript files if available. Has a prettier post-migrate run to update changed hbs and scs files. Removes and migrates "empty shell" components that have `component.js` files and `template.hbs` files, but the component.js files aren't needed to describe the behavior with `template.hbs` components. `template.hbs` files are easier to migrate 1:1 with presentational React `jsx` files. 

There's also functionality for migrating pod styles out of Ember components into global scss styles. "Near empty" components have classnames that are migrated out.

```
Empty component files: 1
Near empty ember component file count: 0
Found pod styles count: 0
```

#### `npm run migrate:find-potential-ember-components`

Uses ASTs to find if the template has addons that can't be migrated yet. For instance, if there's a package that is still in use in other Ember components like a table library. 

This writes to an array:

```js
 const TEMPLATE_ONLY_EMBER_COMPONENTS_WITHOUT_EMBER_CHILDREN = [
  'app/components/greeting/template.hbs',
];
```

Migrating all Ember components would not only take a long time for the AI model. But it would also be too chaotic to review with a human. 

There's a post-run call that runs prettier on this updated file.

#### `npm run migrate:call-ai-model`

Calls target Vertex AI model. Includes prompt engineering instructions. Also includes few-shot learning with example migrations. 

This writes to a file to see the output. 

#### `npm run migrate:ember-components`

Updates the target output to the designated files. Deletes the Handlebar template file and replaces it with an `index.jsx` file. 

The post-run script also runs lint fix and prettier to fix any standards that came up.




