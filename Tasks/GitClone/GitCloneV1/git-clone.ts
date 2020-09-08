import path = require('path');
import tl = require('azure-pipelines-task-lib/task');
import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
// import fs = require('fs-extra');
// import { UnityToolRunner, UnityPathTools, UnityLogTools } from '@dinomite-studios/unity-utilities';
// import { getUnityEditorVersion } from './unity-build-shared';

tl.setResourcePath(path.join(__dirname, 'task.json'));

function isPushEvent() {
    return tl.getInput('sourceControlEvent', true) === 'push'
}

function isManualBuild() {
    return tl.getInput('sourceControlEvent', true) === 'manual_build'
}

function isPullRequestEvent() {
    return tl.getInput('sourceControlEvent', true) === 'pull_request'
}

function isTagEvent() {
    return tl.getInput('sourceControlEvent', true) === 'tag'
}

async function run() {
    try {
        let outputPath: string | undefined = tl.getInput('outputPath', true);
        let infoWololoGitEmail : string | undefined = tl.getInput('infoWololoGitEmail', true);
        let infoWololoGitName : string | undefined = tl.getInput('infoWololoGitName', true);
        let repositoryUrl: string | undefined = tl.getInput('repositoryUrl', !isPullRequestEvent());
        let repositoryBranch: string | undefined = tl.getInput('repositoryBranch', !isPullRequestEvent() && !isTagEvent());
        let checkoutSHA: string | undefined = tl.getInput('checkoutSHA', isPushEvent());
        let repositoryTargetUrl : string | undefined = tl.getInput('repositoryTargetUrl', isPullRequestEvent());
        let repositorySourceUrl : string | undefined = tl.getInput('repositorySopurceUrl', isPullRequestEvent());
        let repositoryTargetBranch : string | undefined = tl.getInput('repositoryTargetBranch', isPullRequestEvent());
        let repositorySourceBranch : string | undefined = tl.getInput('repositorySopurceBranch', isPullRequestEvent());
        let repositoryTagBranch : string | undefined = tl.getInput('repositoryTagBranch', isTagEvent());

        let gitTool = tl.which('git', true);

        //configure git credential cache to avoid errors
        let gitCache : ToolRunner = tl.tool(gitTool);
        gitCache.arg(['config', '--global', 'credential.helper' , 'cache', '--timeout=3600']);
        await gitCache.exec();

        //base clone command
        let gitClone : ToolRunner = tl.tool(gitTool);
        gitClone.arg(['clone','-b', repositoryBranch as string, '--recursive', repositoryUrl as string, outputPath as string]);

        if (isManualBuild()){
            tl.debug("Tiggered Event: manual_build");
            await gitClone.exec();
        }
        else if(isPushEvent()){
            tl.debug("Tiggered Event: push");
            await gitClone.exec();
            tl.cd(outputPath as string)
            
            let gitCheckout : ToolRunner = tl.tool(gitTool);
            gitCheckout.arg(['checkout', '-b', 'pointed_to_hash', checkoutSHA as string]);
            await gitCheckout.exec();
            
            let gitSubmodule : ToolRunner = tl.tool(gitTool);
            gitSubmodule.arg(['submodule', 'update'])
            await gitSubmodule.exec()
        }
        else if(isPullRequestEvent()){
            tl.debug("Tiggered Event: pull_request");
            let gitClonePr : ToolRunner = tl.tool(gitTool);
            gitClonePr.arg(['clone','-b', repositoryTargetBranch as string, '--recursive', repositoryTargetUrl as string, outputPath as string]);
            await gitClonePr.exec();
            tl.cd(outputPath as string);

            let gitFetch : ToolRunner = tl.tool(gitTool);
            gitFetch.arg(['fetch', repositorySourceUrl as string, repositorySourceBranch as string]);
            await gitFetch.exec();
            
            let gitCheckoutS : ToolRunner = tl.tool(gitTool);
            gitCheckoutS.arg(['checkout', '-b', `source/${repositorySourceBranch}`, 'FETCH_HEAD']);
            await gitCheckoutS.exec();

            let gitFetchO : ToolRunner = tl.tool(gitTool);
            gitFetchO.arg(['fetch', 'origin']);
            await gitFetchO.exec();

            let gitCheckoutO : ToolRunner = tl.tool(gitTool);
            gitCheckoutO.arg(['checkout', `origin/${repositoryTargetBranch}`]);
            await gitCheckoutO.exec();

            //this is a dummy credentials to avoid git merge error
            let gitEmail : ToolRunner = tl.tool(gitTool);
            gitEmail.arg(['config', 'user.email', infoWololoGitEmail as string]);
            await gitEmail.exec();
            let gitName : ToolRunner = tl.tool(gitTool);
            gitName.arg(['config', 'user.name', infoWololoGitName as string]);
            await gitName.exec();

            let gitMerge : ToolRunner = tl.tool(gitTool);
            gitMerge.arg(['merge', '--no-ff', `source/${repositorySourceBranch}`]);
            await gitMerge.exec();

        }
        else if(isTagEvent()){
            tl.debug("Tiggered Event: pull_request");
            let gitCloneT : ToolRunner = tl.tool(gitTool);
            gitCloneT.arg(['clone','-b', repositoryTagBranch as string, '--single-branch', '--recursive', repositoryUrl as string, outputPath as string]);
            await gitCloneT.exec();
        }
        else {
            console.error('Trigger event not fond! : ' + tl.getInput('sourceControlEvent'))
            throw new Error(tl.loc('WrongTriggerEvent'));
        }


        const successLog = tl.loc('ExecuteSuccess');
        console.log(successLog);
        tl.setResult(tl.TaskResult.Succeeded, successLog);
       
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