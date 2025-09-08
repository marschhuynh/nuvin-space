#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';

const cli = meow(
  `
  Usage
    $ nuvin-cli-app [options]

  Options
    --openrouter       Use OpenRouter provider (or set OPENROUTER_API_KEY)
    --github           Use GitHub provider (or set GITHUB_COPILOT_API_KEY / GITHUB_ACCESS_TOKEN)
    --mem-persist      Persist conversation history (stored under .history/<session>/)
    --mcp-config PATH  Load MCP servers config from a JSON file (default .nuvin_mcp.json)

  Examples
    $ nuvin-cli-app --openrouter --mem-persist
  `,
  {
    importMeta: import.meta,
    flags: {
      openrouter: {type: 'boolean', default: false},
      github: {type: 'boolean', default: false},
      memPersist: {type: 'boolean', default: false},
      mcpConfig: {type: 'string'},
    },
  },
);

// Prefer explicit OpenRouter when both set
const useOpenRouter = Boolean(cli.flags.openrouter || process.env.OPENROUTER_API_KEY);
const useGithub = Boolean(!useOpenRouter && (cli.flags.github || process.env.GITHUB_COPILOT_API_KEY || process.env.GITHUB_ACCESS_TOKEN));

render(
  <App
    useOpenRouter={useOpenRouter}
    useGithub={useGithub}
    memPersist={Boolean(cli.flags.memPersist)}
    mcpConfigPath={cli.flags.mcpConfig}
  />,
);
