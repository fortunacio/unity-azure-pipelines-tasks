import path = require('path');
import tl = require('azure-pipelines-task-lib/task');
import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
// import fs = require('fs-extra');
// import { UnityToolRunner, UnityPathTools, UnityLogTools } from '@dinomite-studios/unity-utilities';
// import { getUnityEditorVersion } from './unity-build-shared';

tl.setResourcePath(path.join(__dirname, 'task.json'));

function isValidVersionFromat(version: string | undefined) : boolean {
    if (!version)
        return false;

    let versionNums = version.split('.');
    if (versionNums.length != 3)
        return false;
    
    let patch = versionNums[2];
    if (!patch.includes('f') && ! !patch.includes('p') && !patch.includes('b') && !patch.includes('a'))
        return false;
    
    return true
}

async function run() {
    try {

        let unityVersion: string | undefined = tl.getInput('unityVersion', true);
        
        if (!isValidVersionFromat(unityVersion)){
            throw new Error(tl.loc('UnityVersionWrogFormat'));
        }

        //Fix U3D root permission error on CI environment.
        tl.setVariable('U3D_PASSWORD', '')

        tl.debug('Installing u3d gem...')
        let gemRunner: ToolRunner = tl.tool(tl.which('gem', true));
        gemRunner.arg(['install', 'u3d']);
        await gemRunner.exec()

        tl.debug(`Installing Unity Editor v${unityVersion}...`)
        let u3dRunner: ToolRunner = tl.tool(tl.which('u3d', true));
        u3dRunner.arg(['install', unityVersion as string, '-p', 'Unity', 'ios']);
        await u3dRunner.exec()


        tl.setResult(tl.TaskResult.Succeeded, 'Unity installed successfully!');

    } catch (e) {
        if (e instanceof Error) {
            console.error(e.message);
            tl.setResult(tl.TaskResult.Failed, e.message);
        } else {
            console.error(e);
            tl.setResult(tl.TaskResult.Failed, e);
        }
    }
}

run();