/* eslint-disable no-undef */
// packages for handling files
const fs = require('fs');
const path = require('path');

// packages for handling js files and updating
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// global counts
let emptyEmberComponentFileCount = 0;
let nearEmptyEmberComponentFileCount = 0;
let shellEmberComponentWithPodStylesCount = 0;

// near-empty updater with styles
function updateTemplateWithDivs(filePath, foundClassNames) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // keep on passing ember-view so as not to potentially change anything
  let updatedContent = `<div ...attributes class="ember-view${
    foundClassNames ? ` ${foundClassNames}` : ''
  }">\n${content}\n</div>`;

  fs.writeFileSync(filePath, updatedContent);
}

function checkAgainstActualMigrateableComponents(templateFilePath) {
  if (
    templateFilePath.includes('light-table') ||
    templateFilePath.includes('chart')
  ) {
    return false;
  }

  return true;
}

function generateNewStyleNamespaceClass(filePath) {
  // probably the full path of the component would be helpful
  // app/components/your/special/component-name -> your-special-component-name
  const componentPath = filePath
    .replace('app/components/', '')
    .replaceAll('/', '-');

  return componentPath;
}

function writeStylesComponentFileSyncRecursive(
  directoryName,
  baseName,
  fileContents
) {
  // 2. Create scss file
  const targetStylesName = 'app/styles/components/';

  // make directories recursively if they don't already exist
  if (!fs.existsSync(`${targetStylesName}${directoryName}`)) {
    fs.mkdirSync(`${targetStylesName}${directoryName}`, { recursive: true });
  }

  // 3. Add the text into the file for the name-spaced style
  if (directoryName === '.') {
    fs.writeFileSync(
      `${targetStylesName}${baseName}.scss`,
      fileContents,
      'utf-8'
    );
  } else {
    fs.writeFileSync(
      `${targetStylesName}${directoryName}/${baseName}.scss`,
      fileContents,
      'utf-8'
    );
  }
}

function appendNewStatementfterTargetLine(filePath, targetLine, newStatement) {
  // get the files
  const fileContents = fs.readFileSync(filePath, 'utf-8');

  // split by line
  const lines = fileContents.split('\n');

  // find the index of the target line
  const targetIndex = lines.findIndex((line) => line.trim() === targetLine);

  if (targetIndex === -1) {
    // find a different line than `@import 'components/name';`, if it doesn't exist
    console.error(`Target line "${targetLine}" not found in file.`);
    return;
  }

  // insert target statement
  lines.splice(targetIndex + 1, 0, newStatement);

  // make sure lines are back in place
  const updatedContents = lines.join('\n');

  // re-write new file
  fs.writeFileSync(filePath, updatedContents, 'utf-8');
}

// filePath: app/components/component-name
function createAndFillComponentStyleFile(filePath, fileContents) {
  // 1. Update the app/styles/app.scss with component-specific file: @import 'components/component-name
  const componentPath = filePath.replace('app/components/', '');
  const IMPORT_STATEMENT = `@import 'components/${componentPath}';`;
  const TARGET_APP_FILE_PATH = 'app/styles/app.scss';

  appendNewStatementfterTargetLine(
    TARGET_APP_FILE_PATH,
    `@import 'components/component-name';`,
    `${IMPORT_STATEMENT}`
  );

  // directory name
  const directoryName = path.dirname(componentPath);

  // name of the actual file
  let basename = path.basename(filePath);

  // add an underscore to the start
  basename = '_' + basename;

  writeStylesComponentFileSyncRecursive(directoryName, basename, fileContents);
}

function hasStylesPods(potentialEmberStyleComponentPath) {
  if (fs.existsSync(potentialEmberStyleComponentPath)) {
    // console.log(
    //   `Found pod styles needing migration: ${potentialEmberStyleComponentPath}`
    // );
    shellEmberComponentWithPodStylesCount++;
    return true;
  }
  return false;
}

// if classic or native component
// look for @tagName('') and extends Component {}
// https://guides.emberjs.com/v3.4.0/components/customizing-a-components-element/
// idea derived from https://github.com/expel-io/ember-ui/pull/8447/files
/*
import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import { tagName } from '@ember-decorators/component';

@classic
@tagName('') // should be empty
export default class SomethingComponent extends Component {} // should be class empty
*/
function findEmptyComponentEmberComponent(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const ast = parser.parse(code, {
    // for files that use imports module
    sourceType: 'module',
    // need decorators plugin:
    // SyntaxError: This experimental syntax requires enabling one of the following parser plugin(s): "decorators", "decorators-legacy".
    plugins: ['decorators-legacy', 'classProperties'],
  });

  // function level vars from within the ast parser
  let hasTagNameDecorator = false;
  let isExtendsComponentEmpty = false;
  let isGlimmerComponent = false;

  traverse(ast, {
    ImportDeclaration(path) {
      // https://github.com/emberjs/ember-classic-decorator?tab=readme-ov-file#which-classes-must-be-marked-as-classic
      // can be classic import classic from 'ember-classic-decorator' with @classic
      // or can be native class import Component from '@ember/component';

      if (path.node.source.value === '@glimmer/component') {
        isGlimmerComponent = true;
      }
    },
    Decorator(path) {
      if (
        // @tagName('')
        path.node.expression.callee &&
        path.node.expression.callee.name === 'tagName' &&
        path.node.expression.arguments.length === 1 &&
        path.node.expression.arguments[0].value === ''
      ) {
        hasTagNameDecorator = true;
      }
    },
    ClassDeclaration(path) {
      if (
        // Component {}
        path.node.superClass &&
        path.node.superClass.name === 'Component' &&
        path.node.body.body.length === 0 // check that the body length is empty
      ) {
        isExtendsComponentEmpty = true;
      }
    },
  });

  return hasTagNameDecorator && isExtendsComponentEmpty && !isGlimmerComponent;
}

// find classic or native but no tag name. Then update the template to have the div parent so that the component can be removed
// tag name defaults to div for the parents
/*
import Component from '@ember/component';
import classic from 'ember-classic-decorator';

@classic
export default class AlertEvidenceCloudEvidence extends Component {}
*/

// get the classname
/*
import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import { classNames } from '@ember-decorators/component';

@classic
@classNames('text-nowrap')
export default class GridTableHeaderCountsComponent extends Component {}
*/
function findNearEmptyComponentEmberComponents(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['decorators-legacy', 'classProperties'],
  });

  let isExtendsComponentEmpty = false;
  let hasTagNameDecorator = false;
  let foundClassNames = '';
  let isGlimmerComponent = false;

  traverse(ast, {
    ImportDeclaration(path) {
      // https://github.com/emberjs/ember-classic-decorator?tab=readme-ov-file#which-classes-must-be-marked-as-classic
      // can be classic import classic from 'ember-classic-decorator' with @classic
      // or can be native class import Component from '@ember/component';

      if (path.node.source.value === '@glimmer/component') {
        isGlimmerComponent = true;
      }
    },
    Decorator(path) {
      if (
        path.node.expression.callee &&
        path.node.expression.callee.name === 'tagName'
      ) {
        // want to find no tagname which means default of div
        hasTagNameDecorator = true;
      }

      if (
        path.node.expression.callee &&
        path.node.expression.callee.name === 'classNames'
      ) {
        // want to find no tagname which means default of div
        foundClassNames = path.node.expression.arguments[0].value;
      }
    },
    ClassDeclaration(path) {
      if (
        path.node.superClass &&
        path.node.superClass.name === 'Component' &&
        path.node.body.body.length === 0 // check that the body length is empty
      ) {
        isExtendsComponentEmpty = true;
      }
    },
  });

  const isEmpty =
    isExtendsComponentEmpty && !hasTagNameDecorator && !isGlimmerComponent;

  return {
    isEmpty,
    foundClassNames,
  };
}

function traverseDirectory(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((fileName) => {
      const filePath = path.join(directoryPath, fileName);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        const targetHbsFile = `${filePath}/template.hbs`;
        const potentiallyEmptyEmberComponentFilePath = `${filePath}/component.js`;
        const potentialEmberStyleComponentPath = `${filePath}/styles.scss`;

        if (checkAgainstActualMigrateableComponents(filePath)) {
          if (
            fs.existsSync(potentiallyEmptyEmberComponentFilePath) &&
            findEmptyComponentEmberComponent(
              potentiallyEmptyEmberComponentFilePath
            )
          ) {
            // or a template can exist with an empty component.js

            // 1. Find if it has styles.scss
            // 2. Generate a new style namespace classname
            // 3. In the hbs file, update the styles namespace var to be the new classname. It can either be interpolated or set directly on classname
            // 4. Move the styles children from the styles.scss to the component styles file
            if (hasStylesPods(potentialEmberStyleComponentPath)) {
              const styleNamespaceClassName =
                generateNewStyleNamespaceClass(filePath);
              // handle styles
              const hbsFileContents = fs.readFileSync(targetHbsFile, 'utf-8');

              // this could be handled more elegantly with interpolation and ast but this works as expected in hbs
              const newHbsFileContents = hbsFileContents.replaceAll(
                'this.styleNamespace',
                `"${styleNamespaceClassName}"`
              );

              fs.writeFileSync(targetHbsFile, newHbsFileContents);

              // todo: duplicate code. can be refactored
              const scssFileContents = fs.readFileSync(
                potentialEmberStyleComponentPath,
                'utf-8'
              );

              const newScssFileContents = `.${styleNamespaceClassName} { ${scssFileContents}}`;

              createAndFillComponentStyleFile(filePath, newScssFileContents);

              fs.unlinkSync(potentialEmberStyleComponentPath);
            }

            fs.unlinkSync(potentiallyEmptyEmberComponentFilePath);
            emptyEmberComponentFileCount++;
          } else if (fs.existsSync(potentiallyEmptyEmberComponentFilePath)) {
            const nearEmptyResponseObject =
              findNearEmptyComponentEmberComponents(
                potentiallyEmptyEmberComponentFilePath
              );
            const { isEmpty } = nearEmptyResponseObject;

            if (isEmpty) {
              // could be appended to used to append the new autogenerated style namespace
              let { foundClassNames } = nearEmptyResponseObject;

              // 1. Find if it has styles.scss
              // 2. Generate a new style namespace
              // 3. Add new style namespace to found classnames class
              // 4. Take in the styles from styles.scss
              // 5. Make the new style namespace the new parent of the found styles after the &&
              // 6. Write to a component style sheet
              // 7. Delete the styles.scss file

              // for now, just ignore styles.scss potentials
              if (hasStylesPods(potentialEmberStyleComponentPath)) {
                // your-special-component-name -> your-special-component-name-3948394
                const styleNamespaceClassName =
                  generateNewStyleNamespaceClass(filePath);

                // handle styles spaces if @classname decorator is used
                foundClassNames = `${
                  foundClassNames ? `${foundClassNames} ` : ``
                }${styleNamespaceClassName}`;

                // once the podnames are in react {...(podNames[fullName] && { className: podNames[fullName] })}
                // it seems like it might be fine
                // but we want to move away from pod names anyway based on the comment:
                // "* DEPRECATED - please stop using this and migrate to styled-components"

                // can wrap & { and its contents to refer under new parent class anyway of styleNamespace classname

                // todo: duplicate code. can be refactored
                const scssFileContents = fs.readFileSync(
                  potentialEmberStyleComponentPath,
                  'utf-8'
                );

                const newScssFileContents = `.${styleNamespaceClassName} { ${scssFileContents}}`;
                createAndFillComponentStyleFile(filePath, newScssFileContents);

                fs.unlinkSync(potentialEmberStyleComponentPath);
              }

              updateTemplateWithDivs(targetHbsFile, foundClassNames);

              nearEmptyEmberComponentFileCount++;
              fs.unlinkSync(potentiallyEmptyEmberComponentFilePath);
            }
          }
        }

        // recursively finding files and calling itself
        traverseDirectory(filePath);
      }
    });
  }
}

function findAndUpdateEmberComponents() {
  traverseDirectory('app/components');
}

findAndUpdateEmberComponents();

console.log('Empty component files:', emptyEmberComponentFileCount);

console.log(
  'Near empty ember component file count:',
  nearEmptyEmberComponentFileCount
);

console.log('Found pod styles count:', shellEmberComponentWithPodStylesCount);
