// eslint-disable-next-line no-undef
const fetch = require('node-fetch');

const { ACCESS_TOKEN, PROJECT_ID } = process.env || {}; // eslint-disable-line
// claude 3.7 only available in us-east5
const LOCATION_ID = 'us-east5';
const API_ENDPOINT = 'us-east5-aiplatform.googleapis.com';
const MODEL_ID = 'claude-3-7-sonnet@20250219';
const METHOD = 'rawPredict';
const QUERY_URL = `https://${API_ENDPOINT}/v1/projects/${PROJECT_ID}/locations/${LOCATION_ID}/publishers/anthropic/models/${MODEL_ID}:${METHOD}`;

// eslint-disable-next-line
exports.fetchData = async (inputOrig = {}) => {
  let finalResp = '';
  const errors = [];

  // loop over each input messagesArr and send each sequentially before proceeding to next;
  // in the hopes that we limit the number of tokens in each request to Vertex API
  // to get a better response.
  // eslint-disable-next-line no-unused-vars
  for await (const [_idx, message] of inputOrig?.messagesArr?.entries()) {
    if (!message) {
      continue;
    }

    const input = {
      ...inputOrig,
    };
    const body = getRequestBody(input, message);

    const bodyStr = JSON.stringify(body);

    try {
      const data = await fetch(QUERY_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: bodyStr,
      });

      const eachResp = await getResponse(data);
      finalResp += '\n\n-------------------\n' + eachResp;
    } catch (err) {
      // errors.push(
      //   `Encountered error for message index ${idx}: ${console.log(err)}`
      // );
    }
  }

  return { output: finalResp, errors };
};

const generatePrompt = ({
  examplesArr = [],
  basePromptStr = 'Convert provided Ember component template Handlebar files to React JSX.',
  helpfulPromptStr = `Pay attention to these instructions: Do not add 'import React from "react";' for the generated code since React is already defined. The name of the generated React component should be an appropriate unique one (ideally based on the filename and/or parent parent directory comment on the first line if provided) based on the provided input ember code instead of using component names from the provided examples. Do not include "jsx" or "javascript" in the output like \`\`\`jsx or \`\`\`javascript. Do not modify the names of data-* attributes. If you find an uppercase child component like <FancyButton />, try to import it like import FancyButton from '../fancy-button';. Do not try to import like FancyButton from './fancy-button';. Do not explain your role; ONLY give the output of the jsx file.`,
  examplePromptStr = `Here are some examples you should follow for best practices which have an Ember template Handlebar code example and its equivalent expected React component:`,
  messagesPromptStr = `Now take your time in generating exactly one React JSX for each provided Ember Handlebar template (from the request messages array field).`,
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
            text: `${context} ${message}`,
          },
        ],
      },
    ],
  };

  // console.log(util.inspect(body, { showHidden: false, depth: null }));
  return body;
};

const getResponse = async (data = {}) => {
  try {
    const responseBody = await data.text();
    const response = JSON.parse(responseBody);

    return response.content[0].text;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
