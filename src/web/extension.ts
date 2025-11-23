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

	// TODO: Get owner of currently opened repository
	// The owner is found in the policy assignment manifest
	const owner = 'vladoleksik-cs-classes';
	const repo = 'integer-operations-vladoleksik';

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

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('classroom-assignment.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Classroom Assignment in a web extension host!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
