import * as vscode from 'vscode';
import { getNonce, getUri } from '../utilities';

export class AssignmentPanel {
    // Singleton instance of the AssignmentPanel
    public static currentPanel: AssignmentPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    // Data getter functions to be set by the extension context (only in JavaScript...)
    public static getAssignmentText: () => Promise<string> = undefined as any;
    public static getWorkflowRuns: () => Promise<any[]> = undefined as any;
    public static getArtifactReportContent: (artifactUrl: string) => Promise<string> = undefined as any;
    //TODO: add method to refresh session if queries fail because the token is outdated
    public static session: vscode.AuthenticationSession | undefined = undefined;

    //TODO: add caching for assignment text, workflow runs, report contents here if needed
    
    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        // Nice little Singleton
        this._panel = panel;

        // Keep track of the extension URI
        this._extensionUri = extensionUri;

        // Basically, a destructor
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Set the webview's initial HTML content -- see docs below
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);

        // Set up message listener between the webview and the extension context -- see docs below
        this._setWebviewMessageListener(this._panel.webview);
    }

    /**
     * Binds the currently existing authentication session to the AssignmentPanel class,
     * so that it can be used by the data getter functions.
     * 
     * @param session The authentication session to bind.
     */
    public static login(session: vscode.AuthenticationSession) {
        AssignmentPanel.session = session;
    }
    //Discussion: as it stands, if we later change the session, the getters won't use the new session automatically. Bummer.

    public static render(extensionUri: vscode.Uri, column: vscode.ViewColumn = vscode.ViewColumn.Two)
    {
        // If we already have a panel, show it.
        if(AssignmentPanel.currentPanel)
        {
            AssignmentPanel.currentPanel._panel.reveal(column);
            return; // no, we shouldn't refresh here hahah
        }
        // Otherwise, create a new panel.
        let panel = vscode.window.createWebviewPanel(
            'classroom-assignment-pane',
            'My assignment',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'web', 'dist'),
                    vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode', 'codicons', 'dist')
                ]
            }
        );
        panel.iconPath = vscode.Uri.joinPath(extensionUri, 'resources', 'icon.png');
        AssignmentPanel.currentPanel = new AssignmentPanel(panel, extensionUri);
    }

    /**
     * Sets the function that retrieves the assignment statement text.
     *
     * @param getter A function that returns a Promise that resolves to the assignment statement text as a string.
     */
    public static setAssignmentTextGetter(getter: () => Promise<string>) {
        AssignmentPanel.getAssignmentText = getter;
    }

    /**
     * Sets the function that retrieves the workflow runs (grading runs) for the current assignment.
     * 
     * @remarks The contrived design is set around the need to be able to support multiple Git-based
     * version control providers (e.g., GitHub, GitLab, Bitbucket, etc.) in the future,
     * each with their own way of authenticating and fetching artifact contents.
     * 
     * @remarks Other ways than individually passing higher-order functions to be partially applied
     * with the session could be considered, instead, but this is themost flexible and straightforward way
     * to do it for now.
     * Feel free to refactor later with a more object-oriented approach (i.e. strategy pattern) if needed.
     *
     * @param getter A function that takes an artifact URL and an authentication session,
     * and returns a Promise that resolves to the grading report content as a string.
     */
    public static setWorkflowRunsGetter(getter: (session: vscode.AuthenticationSession) => Promise<any[]>) {
        AssignmentPanel.getWorkflowRuns = () => getter(AssignmentPanel.session!);
    }

    /**
     * Sets the function that retrieves the grading report content for a given artifact URL.
     * 
     * @remarks The contrived design is set around the need to be able to support multiple Git-based
     * version control providers (e.g., GitHub, GitLab, Bitbucket, etc.) in the future,
     * each with their own way of authenticating and fetching artifact contents.
     * 
     * @remarks Other ways than individually passing higher-order functions to be partially applied
     * with the session could be considered, instead, but this is themost flexible and straightforward way
     * to do it for now.
     * Feel free to refactor later with a more object-oriented approach (i.e. strategy pattern) if needed.
     *
     * @param getter A function that takes an artifact URL and an authentication session,
     * and returns a Promise that resolves to the grading report content as a string.
     */
    public static setArtifactReportContentGetter(getter: (artifactUrl: string, session: vscode.AuthenticationSession) => Promise<string>) {
        AssignmentPanel.getArtifactReportContent = (artifactUrl: string) => getter(artifactUrl, AssignmentPanel.session!);
    }

    /**
     * Cleans up and disposes of webview resources when the webview panel is closed.
     */
    public dispose() {
        AssignmentPanel.currentPanel = undefined;

        // Dispose of the current webview panel
        this._panel.dispose();

        // Dispose of all disposables (i.e. commands) for the current webview panel
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    /**
     * Defines and returns the HTML that should be rendered within the webview panel.
     *
     * @remarks The webview is made using React, then we extract the *compiled* JS and CSS files
     * from the React app *build* output and inject them into the *static* "index" HTML file below.
     * The resulting single-page app is made to use the VS Code Webview API to communicate with the
     * extension context (this code here) to request and receive data thorugh "messages".
     *
     * @param webview A reference to the extension webview
     * @param extensionUri The URI of the directory containing the extension
     * @returns A template string literal containing the HTML that should be
     * rendered within the webview panel
     */
    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
        // Links towards the CSS and JS files that were built from the React webview app are dynamically created
        // and injected into the *static* webview HTML here
        // Shady stuff - no better way to do this for now :(

        // URI for compiled CSS file
        let stylesUri = getUri(webview, extensionUri, [
            "web",
            "dist",
            "index.css",
        ]);

        // URI for compiled JS file
        let scriptUri = getUri(webview, extensionUri, [
            "web",
            "dist",
            "index.js",
        ]);

        // URI for VS Code Codicons CSS file (to use VS Code-style icons in the webview)
        let codiconUri = getUri(webview, extensionUri, [
            "node_modules",
            "@vscode/codicons",
            "dist",
            "codicon.css",
        ]);

        const nonce = getNonce();

        // "Sacred" text, defines policies for content and structure that defines entire webview
        // DO NOT MODIFY unless you know what you're doing :)))
        return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta http-equiv="Content-Security-Policy" content="
                    default-src 'none';
                    font-src ${webview.cspSource} 'unsafe-inline';`+/* This is just to be sure */`
                    style-src ${webview.cspSource} 'unsafe-inline';`+/* Needed to load inline styles in standalone reports in iframes */`
                    script-src  ${webview.cspSource} https://cdnjs.cloudflare.com 'unsafe-inline';`+
                    /* Cloudflare needed for syntax highlighters, inlines for reports, 
                    as well as for communication between components. cspSource to load react compiled JS files (*the app*). */`
                    style-src-elem 'self' ${webview.cspSource} https://cdnjs.cloudflare.com 'unsafe-inline';`+
                    /* Needed to load stylesheets in iframes for standalone reports. cspSource both for the app itself,
                    and for VSCode icons. */`
                    connect-src ${webview.cspSource};
                    frame-src 'self' data:;">
                <link rel="stylesheet" type="text/css" href="${stylesUri}">
                <link rel="stylesheet" type="text/css" href="${codiconUri}" id="vscode-codicon-stylesheet">
                <title>Assignment</title>
            </head>
            <body>
                <div id="root"></div>
                <script nonce="${nonce}">
                `+ /* This script acquires the VS Code API for the webview context, so that it can send messages back.
                    * The `vscode` global variable is then declared as "external" and used in the build React app.
                    * This is all handled by existing code.*/ `
                    const vscode = acquireVsCodeApi();
                    window.onload = function() {
                        vscode.postMessage({ command: 'ready', text: 'Hello from root!' });
                    };
                </script>
                <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
            </body>
        </html>
        `;
    }

    /**
     * Triggers a refresh of the webview by disposing of the current
     * panel and recreating it while preserving the view column.
     *
     */
    private _refreshContent() {
        console.log('Recreating webview...');
        
        const currentColumn = this._panel.viewColumn;

        this.dispose();

        setTimeout(() => {
            AssignmentPanel.render(this._extensionUri, currentColumn);
        }, 100);
    }

    /**
     * Sets up an event listener to listen for messages passed from the webview context and
     * executes code based on the message that is recieved.
     *
     * @param webview A reference to the extension webview
     */
    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
        (message: any) => {
            const command = message.command;
            const text = message.text;

            switch (command) {
            case "ready":
                console.log("Ready:", text);
                return;
            case "assignmentRequest":
                console.log("Assignment request received:", text);
                AssignmentPanel.getAssignmentText().then(assignmentText => {
                    this._sendMessage("assignmentText", assignmentText);
                });
                return;
            case "workflowRunsRequest":
                console.log("Workflow runs request received:", text);
                AssignmentPanel.getWorkflowRuns().then(workflowRuns => {
                    this._sendMessage("workflowRuns", workflowRuns);
                });
                return;
            case "fetchGradingReport":
                console.log("Fetch grading report request received:", text);
                AssignmentPanel.getArtifactReportContent(text).then(reportContent => {
                    this._sendMessage("gradingReport", reportContent);
                });
                return;
            case "refresh":
                console.log("Refresh received, calling _refreshContent");
                this._refreshContent();
                return;
            // As more "buttons" become available for the React app (view), more
            // message types from it will need to be handled here (e.g., refresh assignment, refresh workflow runs, etc.)
            }
        },
        undefined,
        this._disposables
        );
    }

    /**
     * Sends a message to the React app (or, generally, the webview context).
     *
     * @remarks The React ("views") query this extension for data by sending messages
     * to the extension context. The extension "controller" responds with messages that
     * contain the requested data.
     *
     * @param type The type of message being sent (i.e. assignment text, workflow runs, grading report).
     * Messages are filtered in the webview context based on their type.
     * @param body The data being sent to the webview context.
     */
    private _sendMessage(type: any, body: any) {
        this._panel.webview.postMessage({ type, body });
    }
}