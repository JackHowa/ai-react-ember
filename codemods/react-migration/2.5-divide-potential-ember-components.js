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

const MINIMUM_STATIC_CHILD_NODES = 5;
let filesUpdatedCount = 0;

// ensure we don't look over nodes
const processedNodes = new WeakSet();

function isLikelyHtmlTag(tagName) {
  return /^[a-z]+[0-9]*$/.test(tagName);
}

function isPureStaticElementNode(node) {
  if (!node || !isLikelyHtmlTag(node.tag)) return false;
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
  let count = 1;
  for (const child of node.children || []) {
    if (child.type === 'ElementNode') {
      count += countChildNodes(child);
    } else {
      count++;
    }
  }
  return count;
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

  transform(ast, () => ({
    ElementNode(node) {
      if (processedNodes.has(node)) {
        return;
      }

      if (node && isPureStaticElementNode(node)) {
        const childCount = countChildNodes(node);
        if (childCount >= MINIMUM_STATIC_CHILD_NODES) {
          processedNodes.add(node);

          // get nodes to avoid infinite loop
          const clonedNode = JSON.parse(JSON.stringify(node));
          const snippetHbs = print(clonedNode);

          snippetStrings.push(snippetHbs);

          // create element
          const replacement = builders.element(`${parentAngleName}::Child`, {
            selfClosing: true,
          });
          return replacement;
        }
      }
    },
  }));

  return snippetStrings;
}

function writeSnippet(parentDir, snippetHbs, index, totalSnippets) {
  const commentBlock = `{{!--
  Extracted snippet for React migration. Not necessarily recommended for Ember.
--}}\n\n`;

  const finalContent = commentBlock + snippetHbs;

  const childDirName = totalSnippets > 1 ? `child${index}` : 'child';
  const childDir = path.join(parentDir, childDirName);

  if (!fs.existsSync(childDir)) {
    fs.mkdirSync(childDir);
  }

  const childTemplatePath = path.join(childDir, 'template.hbs');
  fs.writeFileSync(childTemplatePath, finalContent, 'utf8');
}

function extractStaticSnippetFromFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const ast = parse(source);

  const parentDir = path.dirname(filePath);
  const parentAngleName = parentFolderPathToAngleBracketName(parentDir);

  const extracted = extractLargeStaticBlocks(ast, parentAngleName);

  if (extracted.length === 0) {
    return;
  }

  extracted.forEach((snippet, idx) => {
    writeSnippet(parentDir, snippet, idx, extracted.length);
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
}

extractStaticSnippetFromFile(
  'app/components/partially-migrateable-component/template.hbs'
);
console.log('Files updated:', filesUpdatedCount);
