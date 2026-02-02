/**
 * Calls Vertex API with passed in input and returns API's response.
 *
 * To use this locally, you must first run these occasionally:
 * 1. gcloud auth login                                       # Once a day
 * 2. export ACCESS_TOKEN="$(gcloud auth print-access-token)" # Every hour or so
 * 3. export PROJECT_ID="your-gcp-project-id"                 # Your GCP project
 *
 */

const fetch = require('node-fetch');

const { consoleC, printObj, inspectObj } = require('./colorized-console');

//////////// Global variables ////////////
const { ACCESS_TOKEN, PROJECT_ID } = process.env || {}; // eslint-disable-line
const API_ENDPOINT = 'us-east5-aiplatform.googleapis.com';

// claude 3.5 only available in us-east5
const LOCATION_ID = 'us-east5';

// using a pinned version of claude for reproducibility
// claude sonnet 3.5 is the best current for coding migration tasks
const MODEL_ID = 'claude-3-5-sonnet-v2@20241022';

// rawPredict is for a one-time responnse rather than stream of response
const METHOD = 'rawPredict';

// publisher of the model is approved anthropic from within gcp
const QUERY_URL = `https://${API_ENDPOINT}/v1/projects/${PROJECT_ID}/locations/${LOCATION_ID}/publishers/anthropic/models/${MODEL_ID}:${METHOD}`;

//////////////////////////////////////////

/**
 * Calls Vertex API with examples and input (messages) and returns prediction string.
 * @param input.examplesArr {Array[Object]} - Array of objects where each should be { input: '', output: '' }
 * @param input.messagesArr {Array[String]} - Array of strings
 * @param input.basePrompt {String} - Optional
 * @param input.examplePromptStr {String} - Optional
 * @param input.messagesPromptStr {String} - Optional
 *
 * @param options.isDryRun {Boolean} - Optional. Defaults to true. If true, then
 *        displays total character count, estimated cost, and length f messagesArr.
 * @param options.debug {Boolean} - Optional. Defaults to false. Displays the request body
 *        as well as response object to console.
 *
 * @returns {Object} - { output: If successful, returns prediction string; otherwise, throws exception, errors: [] }
 *
 */
// eslint-disable-next-line
exports.fetchData = async (
  inputOrig = {},
  { isDryRun = true, debug = false } = {} // options
) => {
  let finalResp = '';
  const errors = [];

  // loop over each input messagesArr and send each sequentially before proceeding to next;
  // in the hopes that we limit the number of tokens in each request to Vertex API
  // to get a better response.
  for await (const [idx, message] of inputOrig?.messagesArr?.entries()) {
    if (!message) {
      continue;
    }

    const input = {
      ...inputOrig
    };
    const body = getRequestBody(input, message);
    if (debug) {
      printObj(`Will send body for message index ${idx}:`, body);
    }

    const bodyStr = JSON.stringify(body);
    if (isDryRun) {
      doDryRun(bodyStr, input);
      continue;
    }

    try {
      const data = await fetch(QUERY_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: bodyStr
      });

      const eachResp = await getResponse(data, debug);
      finalResp += '\n\n-------------------\n' + eachResp;
    } catch (err) {
      errors.push(
        `Encountered error for message index ${idx}: ${inspectObj(err)}`
      );
    }
  }

  return { output: finalResp, errors };
};

//////////////////////////////////////////

const generatePrompt = ({
  examplesArr = [],
  basePromptStr = 'Convert provided Ember component template Handlebar files to React JSX.',
  helpfulPromptStr = `Pay attention to these instructions: Do not add 'import React from "react";'; there should be no instances of ''import React from "react";' in the output! The name of the generated React component should be an appropriate unique one (ideally based on the filename and/or parent directory comment on the first line if provided) based on the provided input ember code instead of using component names from the provided examples. Do not modify the names of data-* attributes. Do not explain your role; ONLY give the output of the jsx file.`,
  examplePromptStr = `Here are some examples you should follow for best practices which have an Ember template Handlebar code example and its equivalent expected React component:`,
  messagesPromptStr = `Now take your time in generating exactly one React JSX for each provided Ember Handlebar template (from the request messages array field).`
} = {}) => {
  let examplesStr = '';
  for (const [idx, { input, output } = {}] of examplesArr.entries()) {
    examplesStr += `
    Example #${idx + 1} input:
    \`\`\`
    ${input}
    \`\`\`
    And its expected example #${idx + 1} output:
    \`\`\`
    ${output}
    \`\`\``;
  }

  const prompt = `${basePromptStr}
  ${helpfulPromptStr}
  ${examplePromptStr}
  ${examplesStr}

  ${messagesPromptStr}
  `;

  return prompt;
};

/**
 * Returns API request body.
 * @param input.examplesArr {Array[Object]} - Array of objects where each should be { input: '', output: '' }
 * @param input.basePrompt {String} - Optional
 * @param input.examplePromptStr {String} - Optional
 * @param input.messagesPromptStr {String} - Optional
 * @param message {String} - Text for the single incoming Ember file to migrate to React
 * @returns {Object} Returns API request body
 *
 */
const getRequestBody = (input = {}, message) => {
  const context = generatePrompt(input);

  const body = {
    anthropic_version: 'vertex-2023-10-16',
    stream: false,
    max_tokens: 512,
    temperature: 0.5,
    top_p: 0.95,
    top_k: 1,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            // sonnet doesn't use a system prompt so it's all in one
            text: `${context} ${message}`
          }
        ]
      }
    ]
  };

  return body;
};

// Calculates character count; technically also includes post payload fields
// (e.g. 'parameters') but those should be few
const doDryRun = (bodyStr, input = {}) => {
  const charCount = bodyStr?.length;
  const estCost = (0.0001 * (charCount / 1000)).toFixed(5); // TODO: Confirm if this cost estimate is still accurate
  const { examplesArr = [], messagesArr = [] } = input || {};
  const totalExamples = examplesArr?.length;
  const totalMessages = messagesArr?.length;

  consoleC.info(`Total character count - ${charCount}`);
  consoleC.info(`Total estimated cost count - $${estCost}`);
  consoleC.info(`Total examples - ${totalExamples}`);
  consoleC.info(`Total messages - ${totalMessages}`);
  consoleC.info('');

  return '';
};

const getResponse = async (data = {}, debug) => {
  try {
    const responseBody = await data.text();
    const response = JSON.parse(responseBody);

    if (debug) {
      printObj('Received response:', response);
    }

    // get the first response from sonnet which has the file response
    return response.content[0].text;
  } catch (err) {
    if (debug) {
      consoleC.error('Failed to fetch data', err);
    }
    throw err;
  }
};
