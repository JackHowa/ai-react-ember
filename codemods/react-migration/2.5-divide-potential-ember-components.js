/*

1. Set threshold for how much lines of code is worth extracting
2. Find bits of a component that reach that threshold of migrateable code
3. Create a child component of that component. 
4. Add those lines into that component.

It could be easy to start with markdown only so it's 1:1 and no

note: that something was moved into the children component. but we don't want to maintain that pattern of extracting migrate-able markup. four random components shouldn't be extracted just arbitrarily. put a note at the top that this was extracted for the purpose of react migration rather than that this being the best way to extract the pattern. want to help teams when components are already in react. 

<div>
	<p>SOmething</p>
	<p>SOmething</p>
	<p>SOmething</p>
	<p>SOmething</p>
	<p>SOmething</p>
	<p>SOmething</p>
</div>
<BsButton />
<SomethingReallyComplexInEmber />

-> 

<SillySomethingChildComponent />
<BsButton />
<SomethingReallyComplexInEmber />
*/

/* eslint-disable no-undef */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { parse, print, transform, builders } = require('ember-template-recast');
const EXISTING_FOUND_TEMPLATES = require('./available-ember-templates-to-migrate');

const MINIMUM_STATIC_CHILD_NODES = 3;
let filesUpdatedCount = 0;
let totalLinesExtracted = 0;
let totalErrorsParsing = 0;

// ensure we don't look over nodes
const processedNodes = new WeakSet();

function isLikelyHtmlTag(tagName) {
  // pure HTML tags, ignore names with dots (e.g., dest.element)
  return /^[a-z]+[0-9]*$/.test(tagName) && !tagName.includes('.');
}

function isPureStaticElementNode(node) {
  if (!node || !isLikelyHtmlTag(node.tag)) {
    return false;
  }

  for (const attr of node.attributes || []) {
    if (attr.value && attr.value.type === 'MustacheStatement') {
      return false;
    }
  }

  for (const child of node.children || []) {
    if (child.type === 'MustacheStatement' || child.type === 'BlockStatement') {
      return false;
    }
    if (child.type === 'ElementNode' && !isPureStaticElementNode(child)) {
      return false;
    }
  }

  return true;
}

function countChildNodes(node) {
  let count = 0;
  for (const child of node.children || []) {
    if (child.type === 'ElementNode') {
      count += countChildNodes(child);
    } else if (child.type !== 'TextNode' || child.chars.trim().length > 0) {
      count++; // ignore whitespace
    }
  }
  return count;
}

function countLinesOfCode(hbsSnippet) {
  return hbsSnippet.split('\n').length;
}

/**
 *  "app/components/some/nested" => "Some::Nested"
 */
function parentFolderPathToAngleBracketName(parentFolderPath) {
  let relative = parentFolderPath.replace(/^app\/components\//, '');
  return relative
    .split('/')
    .map((segment) =>
      segment
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')
    )
    .join('::');
}

function extractLargeStaticBlocks(ast, parentAngleName) {
  let snippetStrings = [];
  let componentCounter = 1; // Counter for numbering child components

  transform(ast, () => ({
    ElementNode(node) {
      if (!node?.loc) {
        console.warn(
          'Node missing location data, skipping:',
          node.tag || 'Unknown'
        );
        return; // Skip nodes without loc data to avoid errors
      }

      if (processedNodes.has(node)) {
        return;
      }

      if (isPureStaticElementNode(node)) {
        const childCount = countChildNodes(node);
        if (childCount >= MINIMUM_STATIC_CHILD_NODES) {
          processedNodes.add(node);
          const clonedNode = JSON.parse(JSON.stringify(node));
          const snippetHbs = print(clonedNode);
          totalLinesExtracted += countLinesOfCode(snippetHbs);
          snippetStrings.push(snippetHbs);
          const childComponentName = `${parentAngleName}::Child${componentCounter}`;
          componentCounter++;
          const replacement = builders.element(childComponentName, {
            selfClosing: true,
          });
          return replacement;
        }
      }
    },
  }));

  return snippetStrings;
}

function writeSnippet(parentDir, snippetHbs, index) {
  const commentBlock = `{{!--\n  Extracted snippet for React migration. Not necessarily recommended for Ember.\n--}}\n\n`;
  const finalContent = commentBlock + snippetHbs;
  // make numbered child
  const childDirName = `child${index + 1}`;
  const childDir = path.join(parentDir, childDirName);

  if (!fs.existsSync(childDir)) {
    fs.mkdirSync(childDir);
  }

  const childTemplatePath = path.join(childDir, 'template.hbs');
  fs.writeFileSync(childTemplatePath, finalContent, 'utf8');
}

function extractStaticSnippetFromFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');

  try {
    const ast = parse(source);
    const parentDir = path.dirname(filePath);
    const parentAngleName = parentFolderPathToAngleBracketName(parentDir);
    const extracted = extractLargeStaticBlocks(ast, parentAngleName);

    if (extracted.length === 0) {
      return;
    }

    extracted.forEach((snippet, idx) => {
      writeSnippet(parentDir, snippet, idx);
    });

    const newSource = print(ast);
    if (newSource !== source) {
      fs.writeFileSync(filePath, newSource, 'utf8');
      filesUpdatedCount++;
      console.log(
        `Extracted ${extracted.length} static snippet${
          extracted.length > 1 ? 's' : ''
        } from ${filePath}`
      );
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error.message);
    totalErrorsParsing++;
  }
}

function traverseDirectory(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((fileName) => {
      const filePath = path.join(directoryPath, fileName);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        traverseDirectory(filePath);
      } else {
        if (path.extname(filePath) === '.hbs') {
          if (
            EXISTING_FOUND_TEMPLATES.includes(filePath) ||
            filePath.includes('/child') // already extracted
          ) {
            // console.log('Skipping already processed file: ', filePath);
            return;
          } else {
            // console.log('Processing file: ', filePath);
            extractStaticSnippetFromFile(filePath);
          }
        }
      }
    });
  }
}

function findAndExtractComponents() {
  traverseDirectory('app/components');
}

findAndExtractComponents();

console.log('Total errors parsing: ', totalErrorsParsing);
console.log('Files updated:', filesUpdatedCount);
console.log('Total lines of code extracted:', totalLinesExtracted);
