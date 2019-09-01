import * as core from '@actions/core';
import * as github from '@actions/github';

async function run() {
  try {
    const issueCloseMessage: string = core.getInput('issue-close-message');
    const prCloseMessage: string = core.getInput('pr-close-message');

    if (!issueCloseMessage && !prCloseMessage) {
      throw new Error(
        'Action must have at least one of issue-close-message or pr-close-message set'
      );
    }

    const issuePattern: string = core.getInput('issue-pattern');
    const prPattern: string = core.getInput('pr-pattern');

    if (!issuePattern && !prPattern) {
      throw new Error(
        'Action must have at least one of issue-pattern or pr-pattern set'
      );
    }

    // Get client and context
    const client: github.GitHub = new github.GitHub(
      core.getInput('repo-token', {required: true})
    );
    const context = github.context;
    const payload = context.payload;

    if (payload.action !== 'opened') {
      console.log('No issue or PR was opened, skipping');
      return;
    }

    // Do nothing if its not a pr or issue
    const isIssue: boolean = !!payload.issue;

    if (!isIssue && !payload.pull_request) {
      console.log(
        'The event that triggered this action was not a pull request or issue, skipping.'
      );
      return;
    }

    if (!payload.sender) {
      throw new Error('Internal error, no sender provided by GitHub');
    }

    const issue: {owner: string; repo: string; number: number} = context.issue;
    const patternString: string = isIssue ? issuePattern : prPattern;

    if (!patternString) {
      console.log('No pattern provided for this type of contribution');
      return;
    }

    const pattern: RegExp = new RegExp(patternString);
    const body: string | undefined = getBody(payload);

    if (!body) {
      console.log('No body to match against');
      return;
    }

    console.log(`Matching against pattern ${pattern}`);
    if (body.match(pattern)) {
      console.log('Body matched');
      return;
    } else {
      console.log('Body did not match');
    }

    // Do nothing if no message set for this type of contribution
    const closeMessage: string = isIssue ? issueCloseMessage : prCloseMessage;

    if (!closeMessage) {
      console.log('No close message template provided for this type of contribution');
      return;
    }

    console.log('Creating message from template');
    const message: string = evalTemplate(closeMessage, payload)
    const issueType: string = isIssue ? 'issue' : 'pull request';

    // Add a comment to the appropriate place
    console.log(`Adding message: ${message} to ${issueType} ${issue.number}`);
    if (isIssue) {
      await client.issues.createComment({
        owner: issue.owner,
        repo: issue.repo,
        issue_number: issue.number,
        body: message
      });
      await client.issues.update({
        owner: issue.owner,
        repo: issue.repo,
        issue_number: issue.number,
        state: 'closed'
      });
    } else {
      await client.pulls.createReview({
        owner: issue.owner,
        repo: issue.repo,
        pull_number: issue.number,
        body: message,
        event: 'COMMENT'
      });
      await client.pulls.update({
        owner: issue.owner,
        repo: issue.repo,
        pull_number: issue.number,
        state: 'closed'
      });
    }
  } catch (error) {
    core.setFailed(error.message);
    return;
  }
}

function getBody(payload): string | undefined {
  if (payload.issue && payload.issue.body) {
    return payload.issue.body;
  }

  if (payload.pull_request && payload.pull_request.body) {
    return payload.pull_request.body;
  }
}

function evalTemplate(template, params) {
  return Function(...Object.keys(params), "return " + template)(...Object.values(params));
}

run();
