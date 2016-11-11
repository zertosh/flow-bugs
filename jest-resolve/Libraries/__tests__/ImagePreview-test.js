'use strict';

jest.disableAutomock();

const flowPath = require('flow-bin');
const child_process = require('child_process');
const path = require('path');

describe('base64', () => {
  it('resolves the same in flow & jest', () => {
    const flowOutput = child_process.spawnSync(
      flowPath,
      [
        'find-module',
        'base64-js',
        path.join(__dirname, '../ImagePreview.js'),
        '--json'
      ]
    );
    const flowJson = JSON.parse(flowOutput.stdout);
    const flowBase64Path = flowJson.file;

    const jestBase64Path = require.resolve('base64-js');

    expect(flowBase64Path).toEqual(jestBase64Path);
  });
});
