// 1. Read the txt file
// 2. Remove the ```
// 3. Split the output.txt file by ---
// 4. Iterate through the available templates
// 5. For each template, remove the hbs file
// 6. For each template, write the new index.js

const fs = require('fs');

let fileContents = fs.readFileSync(
  './codemods/react-migration/output-test-gemini.txt',
  'utf-8'
);

// // ember component file handling from template.hbs -> index.jsx
function updateTemplateFileNames(oldFilePath, newCode) {
  // delete the index.hbs
  fs.unlinkSync(oldFilePath);
  // finding template files only first
  // incoming hbs
  const newFilePath = oldFilePath.replace(`template.hbs`, `index.jsx`);
  // add the index.jsx
  fs.writeFileSync(newFilePath, newCode);
}

//  ```
fileContents = fileContents.replace(/```/g, '');

// -------------------
const newTemplateOutputArray = fileContents
  .split('-------------------')
  .slice(1); // start at the first element because there's a starting divider

const TEMPLATE_ONLY_EMBER_COMPONENTS_WITHOUT_EMBER_CHILDREN = require('./available-ember-templates-to-migrate');

for (const [
  index, // get index of which file is in the list
  templateFilePath,
] of TEMPLATE_ONLY_EMBER_COMPONENTS_WITHOUT_EMBER_CHILDREN.entries()) {
  // 5. For each template, remove the hbs file
  updateTemplateFileNames(templateFilePath, newTemplateOutputArray[index]);
}
