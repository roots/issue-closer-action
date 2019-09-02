"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const issueCloseMessage = core.getInput('issue-close-message');
            const prCloseMessage = core.getInput('pr-close-message');
            if (!issueCloseMessage && !prCloseMessage) {
                throw new Error('Action must have at least one of issue-close-message or pr-close-message set');
            }
            const issuePattern = core.getInput('issue-pattern');
            const prPattern = core.getInput('pr-pattern');
            if (!issuePattern && !prPattern) {
                throw new Error('Action must have at least one of issue-pattern or pr-pattern set');
            }
            // Get client and context
            const client = new github.GitHub(core.getInput('repo-token', { required: true }));
            const context = github.context;
            const payload = context.payload;
            if (payload.action !== 'opened') {
                core.debug('No issue or PR was opened, skipping');
                return;
            }
            // Do nothing if its not a pr or issue
            const isIssue = !!payload.issue;
            if (!isIssue && !payload.pull_request) {
                core.debug('The event that triggered this action was not a pull request or issue, skipping.');
                return;
            }
            if (!payload.sender) {
                throw new Error('Internal error, no sender provided by GitHub');
            }
            const issue = context.issue;
            const patternString = isIssue ? issuePattern : prPattern;
            if (!patternString) {
                core.debug('No pattern provided for this type of contribution');
                return;
            }
            const pattern = new RegExp(patternString);
            const body = getBody(payload);
            if (!body) {
                core.debug('No body to match against');
                return;
            }
            core.debug(`Matching against pattern ${pattern}`);
            if (body.match(pattern)) {
                core.debug('Body matched. Nothing more to do.');
                return;
            }
            else {
                core.debug('Body did not match');
            }
            // Do nothing if no message set for this type of contribution
            const closeMessage = isIssue ? issueCloseMessage : prCloseMessage;
            if (!closeMessage) {
                core.debug('No close message template provided for this type of contribution');
                return;
            }
            core.debug('Creating message from template');
            const message = evalTemplate(closeMessage, payload);
            const issueType = isIssue ? 'issue' : 'pull request';
            // Add a comment to the appropriate place
            core.debug(`Adding message: ${message} to ${issueType} ${issue.number}`);
            if (isIssue) {
                yield client.issues.createComment({
                    owner: issue.owner,
                    repo: issue.repo,
                    issue_number: issue.number,
                    body: message
                });
                core.debug('Closing issue');
                yield client.issues.update({
                    owner: issue.owner,
                    repo: issue.repo,
                    issue_number: issue.number,
                    state: 'closed'
                });
            }
            else {
                yield client.pulls.createReview({
                    owner: issue.owner,
                    repo: issue.repo,
                    pull_number: issue.number,
                    body: message,
                    event: 'COMMENT'
                });
                core.debug('Closing PR');
                yield client.pulls.update({
                    owner: issue.owner,
                    repo: issue.repo,
                    pull_number: issue.number,
                    state: 'closed'
                });
            }
        }
        catch (error) {
            core.setFailed(error.message);
            return;
        }
    });
}
function getBody(payload) {
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
