// packages for handling files
const fs = require('fs');

const { fetchData } = require('./utils/fetch');
const { consoleC } = require('./utils/colorized-console');

// import available template paths
const TEMPLATE_ONLY_EMBER_COMPONENTS_WITHOUT_EMBER_CHILDREN = require('./available-ember-templates-to-migrate');

async function updateEmberComponents() {
  const messages = [];
  const examples = [];

  // logging that's not needed unless you want to see output
  // consoleC.info('Iterating through Ember templates; do not stop the process.');
  // iterate through available components from constant file
  // read the hbs file
  // then call the fetch ai command with the hbs file contents
  // get the output of the fetch ai command
  // update the template.hbs -> index.jsx with the new contents

  // set messages
  for (const emberTemplatePath of TEMPLATE_ONLY_EMBER_COMPONENTS_WITHOUT_EMBER_CHILDREN) {
    const emberContents = fs.readFileSync(emberTemplatePath, 'utf8');
    // consoleC.debug(`Updating ${emberTemplatePath} to React...`);
    messages.push(`{{!-- ${emberTemplatePath} --}}\n${emberContents}`);
    // const reactContents = await updateFileContents(emberContents);

    // updateTemplateFileNames(emberTemplatePath, reactContents);
  }
  // show output if you want to see it
  // consoleC.info(`Total found ember templates to convert: ${messages.length}`);

  // set examples
  const codeExamplesFolder = './codemods/react-migration/code-examples';

  fs.readdirSync(codeExamplesFolder).forEach((folderName) => {
    let typeOfExampleObject = { input: '', output: '' };
    fs.readdirSync(`${codeExamplesFolder}/${folderName}`).forEach(
      (languageFolder) => {
        fs.readdirSync(
          `${codeExamplesFolder}/${folderName}/${languageFolder}`
        ).forEach((file) => {
          const fullPathFile = `${codeExamplesFolder}/${folderName}/${languageFolder}/${file}`;
          if (languageFolder === 'ember') {
            typeOfExampleObject.input = fs.readFileSync(fullPathFile, 'utf8');
          } else {
            // assume react
            typeOfExampleObject.output = fs.readFileSync(fullPathFile, 'utf8');
          }
        });
      }
    );
    examples.push(typeOfExampleObject);
  });

  const output = await callFetch(examples, messages);
  if (output) {
    // TODO: Break up the large output string and create individual React files (should be ordered)
    console.log(output);

    // consoleC.info(
    //   `\n\nCongrats you used a generative AI model and training data to migrate ${TEMPLATE_ONLY_EMBER_COMPONENTS_WITHOUT_EMBER_CHILDREN.length} components to React ✨⚛️`
    // );
  }
}

async function callFetch(examplesArr, messagesArr) {
  const resp = await fetchData(
    {
      examplesArr,
      messagesArr // Must be odd number for now!
    },
    { isDryRun: false, debug: false }
  );
  const { output, errors } = resp || {};
  const hasErrors = errors?.length;

  if (hasErrors) {
    if (output) {
      consoleC.info('\n\n⚠️  Partially completed.');
    } else {
      consoleC.error('\n❗Encountered errors.\n');
    }

    errors?.forEach((error) =>
      consoleC.error('Failed to complete fetch:', error)
    );
  }

  return output;
}

updateEmberComponents();
