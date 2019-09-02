# GitHub action to automatically close issues/PRs

## Installation

To configure the action simply add the following lines to your `.github/main.workflow` workflow file:

```yml
name: Autocloser
on: [issues, pull_request]
jobs:
  autoclose:
    runs-on: ubuntu-latest
    steps:
    - name: Autoclose issues that did not follow issue template
      uses: roots/issue-closer@1.0
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
        issue-close-message: "`@${issue.user.login} this issue was automatically closed because it did not follow the issue template`"
        issue-pattern: ".*guidelines for Contributing.*"
```

## Configuration

`issue-close-message` and `pr-close-message` are ES6-style template literals which will be evaluated with the issue or pull request
webhook payload in context. The example above uses `${issue.user.login}` to get the author of the issue.

* `issue` webhook [payload example](https://developer.github.com/v3/activity/events/types/#webhook-payload-example-15)
* `pull_request` webhook [payload example](https://developer.github.com/v3/activity/events/types/#webhook-payload-example-28)

`issue-pattern` and `pr-pattern` are strings which are compiled to JavaScript `Regexp`s.
