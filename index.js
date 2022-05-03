const core = require('@actions/core');
const github = require('@actions/github');
const yaml = require('js-yaml');

/**
 * Run the action.
 * @param _local True to test locally with `node`. Requires a valid GITHUB_TOKEN
 *               environment variable with minimal permissions.
 * @param _lib Library to test locally, such as "gz-math"
 * @param _branch Branch to test locally, such as "gz-math7"
 */
async function run(_local, _lib, _branch) {
  try {
    if (!_local && github.context.payload.pull_request === undefined) {
      core.debug('Labeler action must be run for pull requests.');
      return;
    }

    let library = _local ? _lib : github.context.payload.repository.name;
    const target = _local ? _branch : github.context.payload.pull_request.base.ref;

    const token = _local ? process.env.GITHUB_TOKEN :
        core.getInput('github-token', { required: true });
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
        // TODO(chapulina) Remove this after gz rename is over
        library = library.replace('gz', 'ign');
        lib = collectionYaml.repositories[library];
        if (lib == undefined)
        {
          continue;
        }
      }

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

      if (lib.version == target) {
        labels.push(version.label);
      }
    }

    if (_local) {
      labels.forEach((_label) => {
        console.log(_label);
      });
    }

    if (!_local && labels.length > 0) {
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

// Uncomment and change input to test locally
// run(true, "gz-launch", "main")
