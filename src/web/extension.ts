// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "classroom-assignment" is now active in the web extension host!');

	const session = await vscode.authentication.getSession(
		'github',
		['repo', 'actions:read'],
		{ createIfNone: true }
	);

	console.log('Got session:', session);

	const user = session.account.label;
	console.log('Authenticated GitHub user:', user);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('classroom-assignment.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Classroom Assignment in a web extension host!');
	});

	const paneAction = vscode.commands.registerCommand('classroom-assignment.showAssignmentPane', () => {
		renderAssignmentPane();
	});

	context.subscriptions.push(paneAction);

	context.subscriptions.push(disposable);
}

async function renderAssignmentPane() {
	const session = await vscode.authentication.getSession(
		'github',
		['repo', 'actions:read'],
		{ createIfNone: true }
	);
	//const user = session.account.label;

	// TODO: Get owner of currently opened repository
	// The owner is found in the policy assignment manifest
	//if opened in a web extension host, get the repository information from the context
	console.log('Repository context:', vscode.workspace.workspaceFolders);
	// get the owner name from the assignment.tar file inside the workspace folder
	/*vscode.workspace.workspaceFolders?.forEach(folder => {
		console.log('Workspace folder:', folder.name, folder.uri.toString());
	});*/
	const owner = 'vladoleksik-cs-classes';
	const repo = vscode.workspace.workspaceFolders?.[0].name;

	//Use the GitHub API to get the action workflow runs for our GitHub repository
	const runsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs`, {
		headers: {
			'Authorization': `Bearer ${session?.accessToken}`,
			'Accept': 'application/vnd.github+json',
		},
		method: 'GET',
	});
	const runsData = await runsResponse.json();
	console.log('Fetched GitHub Actions runs:', runsData);

	var runsSelectorHtml = '';
	runsSelectorHtml += `<select id="workflow-runs-selector" onchange="onRunSelected()">`;
	for (const run of runsData.workflow_runs) {
		const createdDateTime = new Date(run.created_at);
		const createdAgo = Math.floor((Date.now() - createdDateTime.getTime()) / 1000); // in seconds
		//Format createdAgo in seconds, minutes, hours, days, weeks, months, years as appropriate
		let createdAgoStr = '';
		if (createdAgo < 60) {
			createdAgoStr = `${createdAgo}s ago`;
		} else if (createdAgo < 3600) {
			createdAgoStr = `${Math.floor(createdAgo / 60)}m ago`;
		} else if (createdAgo < 86400) {
			createdAgoStr = `${Math.floor(createdAgo / 3600)}h ago`;
		} else if (createdAgo < 604800) {
			createdAgoStr = `${Math.floor(createdAgo / 86400)}d ago`;
		} else if (createdAgo < 2592000) {
			createdAgoStr = `${Math.floor(createdAgo / 604800)}w ago`;
		} else if (createdAgo < 31536000) {
			createdAgoStr = `${Math.floor(createdAgo / 2592000)}mo ago`;
		} else {
			createdAgoStr = `${Math.floor(createdAgo / 31536000)}y ago`;
		}
		if (run.status === 'in_progress' || run.status === 'queued') {
			createdAgoStr = `pending`;
		}
		if(run.conclusion != 'success') {
			createdAgoStr = `❗ ` + createdAgoStr;
		}
		console.log('#'+run.run_number+':', run.display_title, run.status, run.conclusion, createdAgoStr);
		runsSelectorHtml += `<option value="${run.id}">#${run.run_number}: ${run.display_title} (${createdAgoStr})</option>`;
	}
	runsSelectorHtml += `</select>`;

	// Use the GitHub API to get the action workflow run artifacts from a GitHub repository
	// (This is just an example; replace with your own logic as needed)
	const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/artifacts`, {
		headers: {
			'Authorization': `Bearer ${session?.accessToken}`,
			'Accept': 'application/vnd.github+json',
		},
		method: 'GET',
	});
	const data = await response.json();
	console.log('Fetched GitHub Actions runs:', data);

	//get the last workflow run that was completed
	const artifacts = data.artifacts;
	if (artifacts.length > 0) {
		const lastArtifact = artifacts[0];
		console.log('Last artifact:', lastArtifact);
	} else {
		console.log('No artifacts found for this repository.');
	}

	//download the 'grading-report' artifact if it exists
	const gradingArtifact = artifacts.find((artifact: any) => artifact.name === 'grading-report');
	let blob: Blob = new Blob();
	if (gradingArtifact) {
		const downloadUrl = gradingArtifact.archive_download_url;
		const downloadResponse = await fetch(downloadUrl, {
			headers: {
				'Authorization': `Bearer ${session?.accessToken}`,
				'Accept': 'application/vnd.github+json',
			},
			method: 'GET',
		});
		blob = await downloadResponse.blob();
		console.log('Downloaded grading report artifact:', blob);
	} else {
		console.log('No grading report artifact found for this repository.');
	}

	//unzip the blob and read the report.html file inside
	const arrayBuffer = await blob.arrayBuffer();
	const uint8Array = new Uint8Array(arrayBuffer);
	//use the JSZip library to unzip the blob
	const JSZip = await import('jszip');
	const zip = await JSZip.loadAsync(uint8Array);
	const reportFile = zip.file('report.html');

	const assignmentHTML = await getAssignmentStatement();

	console.log('Assignment HTML:', assignmentHTML);

	//Display the content of the report.html file in a new webview panel
	if (reportFile) {
		const reportContent = await reportFile.async('string');
		const panel = vscode.window.createWebviewPanel(
			'classroom-assignment-pane',
			'My assignment',
			vscode.ViewColumn.One,
			{}
		);
		//panel.webview.html = reportContent;
		//Embed the reportContent inside a basic HTML structure, with buttons to toggle between assignment text and report
		panel.webview.html = `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta http-equiv="Content-Security-Policy" 
      content="default-src 'none'; 
               script-src 'unsafe-inline'; 
               style-src 'unsafe-inline'; 
               frame-src 'self' data:;">
		</head>
		<body>
			<h1>Assignment</h1>
			<button onclick="showReport()">Show Grading Report</button>
			<button onclick="showAssignment()">Show Assignment Text</button>
			<script>
				function showReport() {
					document.getElementById('assignment-text').style.display = 'none';
					document.getElementById('grading-report').style.display = 'block';
				}
				function showAssignment() {
					document.getElementById('grading-report').style.display = 'none';
					document.getElementById('assignment-text').style.display = 'block';
				}
			</script>
			<div id="assignment-text" style="display: none;">
				<h2>Assignment Text</h2>
				${assignmentHTML}
			</div>
			<div id="grading-report" style="display: block;">
				<h2>Grading Report</h2>
				${runsSelectorHtml}
				<iframe srcdoc='${reportContent.replace(/'/g, "&apos;").replace(/"/g, "&quot;")}' sandbox="allow-scripts" width="100%" height="600px">
				</iframe>
			</div>
		</body>
		</html>
		`;
		panel.webview.options = { enableScripts: true };
	} else {
		console.log('No report.html file found in the grading report artifact.');
	}
}

async function getAssignmentStatement() {
	//get the assignment text from the README.md file in the repository
	const assignmentText = vscode.workspace.workspaceFolders ? await vscode.workspace.fs.readFile(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'README.md')) : null;
	console.log('Assignment text:', assignmentText ? new TextDecoder().decode(assignmentText) : 'No README.md file found.');
	//Render the assignment text as HTML (support basic markdown features, as well as code blocks and math expressions)
	let assignmentHTML = '';
	if (assignmentText) {
		const markdownText = new TextDecoder().decode(assignmentText);
		//Use a simple markdown to HTML converter using the vscode API
		assignmentHTML = await vscode.commands.executeCommand('markdown.api.render', markdownText).then((html: any) => {
			return html.replace(/<span class="katex-mathml">([\s\S]*?)<\/span>/g, '')
						.replace("[!NOTE]", ""); //remove [!NOTE] text
		});
	}
	return assignmentHTML;
}

/**
 * Getter function to fetch the workflow runs for the current repository from the GitHub API.
 * 
 * @param session The GitHub authentication session of the user.
 * @returns Array of workflow runs (attempts for the assignment).
 */
async function getWorkflowRuns(session: vscode.AuthenticationSession): Promise<any[]> {
	//Check if we have a workspace folder opened
	if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
		console.log('No workspace folder opened.');
		return [];
	}
	//console.log('Repository context:', vscode.workspace.workspaceFolders);

	//Use the GitHub API to get the action workflow runs for our GitHub repository
	//DISCUSSION: The owner name can be obtained dynamically by setting it in the assignment manifest file inside the repository
	// (`assignment.tar`), and reading it from there.
	// This assumes a new version for the assignment test environment generator (https://github.com/vladoleksik/cpp_linting, `policy.json` file).
	// Then, it could be read from the file system here.
	// For not, this is just not ready yet. I don't want to talk about this :)
	const owner = 'vladoleksik-cs-classes';
	const repo = vscode.workspace.workspaceFolders[0].name;

	//Use the GitHub API to get the action workflow runs for our GitHub repository
	const runsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs`, {
		headers: {
			'Authorization': `Bearer ${session?.accessToken}`,
			'Accept': 'application/vnd.github+json',
		},
		method: 'GET',
	});
	if (!runsResponse.ok) {
		console.log('Failed to fetch workflow runs:', runsResponse.status, runsResponse.statusText);
		return [];
	}
	const runsData = await runsResponse.json();
	console.log('Fetched GitHub Actions runs:', runsData);
	return runsData.workflow_runs;
}

/**
 * Getter function to fetch the grading report content from a specific artifact URL for a workflow run.
 * 
 * @remarks The artifact URL is obtained from the workflow run data. This URL returns a list of artifacts for the run.
 * The one named `grading-report` is downloaded (using a second fetch to a specified URL), unzipped, and the `report.html` file inside is read and returned as a string.
 * 
 * @param artifactUrl The URL to fetch the artifacts for a specific workflow run.
 * @param session The GitHub authentication session of the user.
 * @returns The content of the grading report as a string with a standalone HTML report page.
 */
async function getArtifactContent(artifactUrl: string, session: vscode.AuthenticationSession): Promise<string> {
	// Use the GitHub API to list the artifacts for a specific workflow run
	const response = await fetch(artifactUrl, {
		headers: {
			'Authorization': `Bearer ${session?.accessToken}`,
			'Accept': 'application/vnd.github+json',
		},
		method: 'GET',
	});
	const data = await response.json();
	console.log('Fetched GitHub Actions runs:', data);

	// Get the list of artifacts
	const artifacts = data.artifacts;

	// Download the 'grading-report' artifact if it exists
	const gradingArtifact = artifacts.find((artifact: any) => artifact.name === 'grading-report');
	let blob: Blob = new Blob();
	if (gradingArtifact) {
		const downloadUrl = gradingArtifact.archive_download_url;
		const downloadResponse = await fetch(downloadUrl, {
			headers: {
				'Authorization': `Bearer ${session?.accessToken}`,
				'Accept': 'application/vnd.github+json',
			},
			method: 'GET',
		});
		blob = await downloadResponse.blob();
		//console.log('Downloaded grading report artifact:', blob);
	} else {
		console.log('No grading report artifact found for this repository.');
		return '';
	}

	// Unzip the blob and read the report.html file inside
	const arrayBuffer = await blob.arrayBuffer();
	const uint8Array = new Uint8Array(arrayBuffer);
	// Use the JSZip library to unzip the blob
	const JSZip = await import('jszip');
	const zip = await JSZip.loadAsync(uint8Array);
	const reportFile = zip.file('report.html');

	if (reportFile) {
		const reportContent = await reportFile.async('string');
		return reportContent;
	} else {
		console.log('No report.html file found in the grading report artifact.');
		return '';
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
