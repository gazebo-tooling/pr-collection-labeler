const core = require('@actions/core');
const github = require('@actions/github');
const yaml = require('js-yaml');

async function run() {
  try {
    if (github.context.payload.pull_request === undefined) {
      core.debug('Labeler action must be run for pull requests.');
      return;
    }

    const library = github.context.payload.repository.name;
    let target = github.context.payload.pull_request.base.ref;
    target = target.substring(target.indexOf("-") + 1)

    core.debug('Target:', target);

    const token = core.getInput('github-token', { required: true });
    if (!token) {
      core.debug('Failed to get token');
      return;
    }
    const gh = new github.GitHub(token);

    const owner = 'ignition-tooling';
    const repo = 'gazebodistro';

    let labels = [];

    const collections = [
      {name: 'citadel', label: '🏰 citadel'},
      {name: 'fortress', label: '🏯 fortress'},
      {name: 'garden', label: '🌱 garden'}
    ];

    for (const collection of collections) {

      const path = 'collection-' + collection.name + '.yaml';

      const collectionRes = await gh.repos.getContents({owner, repo, path});
      const collectionContent = Buffer.from(collectionRes.data.content, 'base64').toString();
      const collectionYaml = yaml.safeLoad(collectionContent);

      let lib = collectionYaml.repositories[library];

      if (lib == undefined)
      {
        continue;
      }
      lib.version = lib.version.substring(lib.version.indexOf("-") + 1)

      core.debug('lib.version', lib.version, 'target', target);
      if (lib.version == target) {
        labels.push(collection.label);
      }
    }

    const classicVersions = [
      {name: 'gazebo9', label: 'Gazebo 9️'},
      {name: 'gazebo11', label: 'Gazebo 1️1️'},
    ];

    for (const version of classicVersions) {

      const path = version.name + '.yaml';

      const versionRes = await gh.repos.getContents({owner, repo, path});
      const versionContent = Buffer.from(versionRes.data.content, 'base64').toString();
      const versionYaml = yaml.safeLoad(versionContent);

      let lib = versionYaml.repositories[library];

      if (lib == undefined)
      {
        continue;
      }
      lib.version = lib.version.substring(lib.version.indexOf("-") + 1)

      if (lib.version == target) {
        labels.push(version.label);
      }
    }

    if (labels.length > 0) {
      const prNumber = github.context.payload.pull_request.number;
      core.debug(`Adding labels: [${labels}] to PR [${prNumber}]`);
      gh.issues.addLabels(
        Object.assign({issue_number: prNumber, labels: labels },
        github.context.repo));
    }
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
