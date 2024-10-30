// packages for handling files
// eslint-disable-next-line no-undef
const fs = require('fs');
// eslint-disable-next-line no-undef
const { fetchData } = require('./utils/fetch');

// import available template paths
// eslint-disable-next-line no-undef
const TEMPLATE_ONLY_EMBER_COMPONENTS_WITHOUT_EMBER_CHILDREN = require('./available-ember-templates-to-migrate');

async function updateEmberComponents() {
  const messages = [];
  const examples = [];

  console.info('Iterating through Ember templates; do not stop the process.');
  // iterate through available components from constant file
  // read the hbs file
  // then call the fetch ai command with the hbs file contents
  // get the output of the fetch ai command

  // set messages
  for (const emberTemplatePath of TEMPLATE_ONLY_EMBER_COMPONENTS_WITHOUT_EMBER_CHILDREN) {
    const emberContents = fs.readFileSync(emberTemplatePath, 'utf8');
    messages.push(`{{!-- ${emberTemplatePath} --}}\n${emberContents}`);
  }
  console.info(`Total found ember templates to convert: ${messages.length}`);

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
    console.log(output);
  }
}

async function callFetch(examplesArr, messagesArr) {
  const resp = await fetchData(
    {
      examplesArr,
      messagesArr,
    },
    {}
  );
  const { output, errors } = resp || {};
  const hasErrors = errors?.length;

  if (hasErrors) {
    if (output) {
      console.info('\n\n⚠️  Partially completed.');
    } else {
      console.error('\n❗Encountered errors.\n');
    }

    errors?.forEach((error) =>
      console.error('Failed to complete fetch:', error)
    );
  }

  return output;
}

updateEmberComponents();
