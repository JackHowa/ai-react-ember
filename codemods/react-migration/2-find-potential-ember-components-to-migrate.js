// packages for handling files
// eslint-disable-next-line no-undef
const fs = require('fs');
// eslint-disable-next-line no-undef
const path = require('path');

// for checking hbs
// eslint-disable-next-line no-undef
const { parse, transform } = require('ember-template-recast');

let templateOnlyEmberComponentsCount = 0;
let templateOnlyEmberComponentsWithNoEmberChildren = 0;
let migrateableTemplatesFilePaths = [];

const emberComponentNameToFilename = (str) =>
  str &&
  str
    .split('::')
    .map((part) =>
      part
        .match(/[A-Z][a-z]*\d*|[a-z]+\d*/g)
        .map((x) => x.toLowerCase())
        .join('-')
    )
    .join('/');

function isAnEmberComponent(potentialEmberComponent) {
  const emberComponentFilename = emberComponentNameToFilename(
    potentialEmberComponent
  );
  const potentialEmberComponentFolderPath = `app/components/${emberComponentFilename}`;

  if (potentialEmberComponentFolderPath.includes('light-table')) {
    // ignore light table
    return false;
  }
  if (fs.existsSync(potentialEmberComponentFolderPath)) {
    // check if it has a template.hbs
    // it shouldn't have an empty component.js file after the transformation
    // may have to run twice if nested children are migrated

    const files = fs.readdirSync(potentialEmberComponentFolderPath);

    return files.includes('template.hbs');
  } else {
    // found folder doesn't exist like an a tag
    return false;
  }
}

function isAReactComponent(potentialReactComponent) {
  const reactComponentFilename = emberComponentNameToFilename(
    potentialReactComponent
  );
  const potentialReactComponentFolderPath = `app/components/${reactComponentFilename}`;

  if (fs.existsSync(potentialReactComponentFolderPath)) {
    const files = fs.readdirSync(potentialReactComponentFolderPath);

    return files.includes('index.jsx');
  } else {
    // found folder doesn't exist like an a tag
    return false;
  }
}

function findMigrateableComponents(filePath) {
  // look for folder path
  if (filePath.includes('light-table')) {
    return false;
  }
  const source = fs.readFileSync(filePath, 'utf8');
  const template = parse(source);

  let isComponentMigrateableToReact = true;

  // use recast function transform
  transform(template, () => {
    return {
      // get all of the elements directly without traversal
      ElementNode(node) {
        // can't have ember inside of react
        // ignore linkto due to complications with eds
        if (isAnEmberComponent(node.tag) || node.tag === 'LinkTo') {
          isComponentMigrateableToReact = false;
        }

        if (isAReactComponent(node.tag)) {
          isComponentMigrateableToReact = true;
        }
      },
      PathExpression(node) {
        // can't migrate svg jar
        // can't migrate light table
        if (
          node.original === 'svg-jar' ||
          node.original === 't' ||
          node.original === 'light-table'
        ) {
          isComponentMigrateableToReact = false;
        }
      },
    };
  });

  return isComponentMigrateableToReact;
}
// test if there's an ember template and no presence of component.js file
// makes sure it's not an react component already
function findTemplateOnlyEmberComponent(directoryPath) {
  const files = fs.readdirSync(directoryPath);

  // find if there's no child file of component.js and only template.hbs
  return files.includes('template.hbs') && !files.includes('component.js');
}

function traverseDirectory(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((fileName) => {
      const filePath = path.join(directoryPath, fileName);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        if (findTemplateOnlyEmberComponent(filePath)) {
          const targetHbsFile = `${filePath}/template.hbs`;

          templateOnlyEmberComponentsCount++;

          if (findMigrateableComponents(targetHbsFile)) {
            templateOnlyEmberComponentsWithNoEmberChildren++;
            migrateableTemplatesFilePaths.push(targetHbsFile);
          }
        }

        // recursively finding files and calling itself
        traverseDirectory(filePath);
      }
    });
  }
}

function findAndUpdateEmberComponents() {
  // don't want to try to do route templates yet in app/templates
  traverseDirectory('app/components');
  let content = `const TEMPLATE_ONLY_EMBER_COMPONENTS_WITHOUT_EMBER_CHILDREN = ${JSON.stringify(
    migrateableTemplatesFilePaths
  )};\n\n// eslint-disable-next-line no-undef\nmodule.exports = TEMPLATE_ONLY_EMBER_COMPONENTS_WITHOUT_EMBER_CHILDREN;`;

  fs.writeFileSync(
    './codemods/react-migration/available-ember-templates-to-migrate.js',
    content
  );
}

findAndUpdateEmberComponents();

console.log(
  'Template only ember components available: ',
  templateOnlyEmberComponentsCount
);

console.log(
  'No ember react children template-only components available: ',
  templateOnlyEmberComponentsWithNoEmberChildren
);
