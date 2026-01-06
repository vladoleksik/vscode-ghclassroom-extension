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

	// Use the VS Code API to get the action workflow run artifacts from a GitHub repository
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

	//Display the content of the report.html file in a new webview panel
	if (reportFile) {
		const reportContent = await reportFile.async('string');
		const panel = vscode.window.createWebviewPanel(
			'classroom-assignment-report',
			'Grading Report',
			vscode.ViewColumn.One,
			{}
		);
		panel.webview.html = reportContent;
		panel.webview.options = { enableScripts: true };
	} else {
		console.log('No report.html file found in the grading report artifact.');
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
