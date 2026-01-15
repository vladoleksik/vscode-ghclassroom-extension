import React, { useEffect } from 'react';
import './App.css';
import '@vscode/codicons/dist/codicon.css';

import {
  VscodeDivider, 
  VscodeTabs,
  VscodeTabHeader,
  VscodeTabPanel,
  VscodeProgressBar,
  VscodeToolbarContainer,
  VscodeToolbarButton
} from '@vscode-elements/react-elements';

//IMPORTANT: Package initialization and build happens automatically when running the extension.
// Hot-reloading is supported while developing, without needing to restart vscode each time.
// To see changes, just hit the Refresh button in the webview.

// Import custom components (views)
import AssignmentText from './AssignmentText';
import GradingReports from './GradingReportsView';
import HowTo from './HowTo';
import About from './About';

// Use types (models) for data transfer
// GradingRun is sort of a DTO
import { GradingRun } from './GradingRun';

// Don't touch :)
// This declares the vscode API that is made available to the webview
// through the webview's preload script. This is a mock if the API 
// presented by VS Code to webviews.
interface vscode {
    postMessage(message: any): void;
}
// This lets us use the vscode API in the component (the vscode variable is injected globally,
// at a lower level, in the root HTML file that hosts the React app).
// And is declared here so that TypeScript knows to reserve the name for this purpose and so that
// we use it as we want.
declare const vscode: vscode;
// You can safely touch what's below :)

function App() {
  useEffect(() => {
    try {
      notifyExtension('ready', 'Hello from App component!');
    } catch (error) {
      setError(String(error));
    }
  }, []);

  const notifyExtension = (command: string, text: string) => {
    vscode.postMessage({
      command: command,
      text: text
    });
  };

  /* --------------------UNUSED SAMPLE DATA BELOW-------------------- */
  // You may safely delete. It's only to get an idea of the data structure.
  const assignmentText = `<h1>Sample Assignment</h1>

    <p>This is a sample assignment statement written in Markdown.</p>

    <h2>Instructions</h2>
    1. Read the assignment carefully.
    2. Complete the tasks as described.
    3. Submit your work before the deadline.

    Good luck!
  `;
  /* --------------------UNUSED SAMPLE DATA ABOVE-------------------- */

  // State variables to be used by components
  let [assignmentStatement, setAssignmentText] = React.useState<string>('');
  let [gradingRuns, setGradingRuns] = React.useState<GradingRun[]>([]);
  let [selectedTabIndex, setSelectedTabIndex] = React.useState<number>(0);

  /* --------------------UNUSED SAMPLE DATA BELOW-------------------- */
  // You may safely delete. It's only to get an idea of the data structure.
  const gradingReports = [
    {
      id: 3,
      status: 'in_progress',
      created_at: '2024-06-03T16:00:00Z',
      updated_at: '2024-06-03T16:15:00Z',
      artifacts_url: 'http://example.com/run/3',
      display_name: 'Third Grading Attempt',
      run_number: 3
    },
    {
      id: 2,
      status: 'completed',
      conclusion: 'failure',
      created_at: '2024-06-02T14:00:00Z',
      updated_at: '2024-06-02T14:45:00Z',
      artifacts_url: 'http://example.com/run/2',
      display_name: 'Regrading after resubmission',
      run_number: 2
    },
    {
      id: 1,
      status: 'completed',
      conclusion: 'success',
      created_at: '2024-06-01T12:00:00Z',
      updated_at: '2024-06-01T12:30:00Z',
      artifacts_url: 'http://example.com/run/1',
      display_name: 'Initial Grading',
      run_number: 1
    }
    
  ] as GradingRun[];
  /* --------------------UNUSED SAMPLE DATA ABOVE-------------------- */

  // For debugging purposes
  let [error, setError] = React.useState<string>('');

  // Request assignment text from the extension when the component mounts (since it doesn't depend on props/state)
  useEffect(() => {
    notifyExtension('assignmentRequest', 'Requesting assignment text');
    const handleMessage = (e: MessageEvent) => {
      const message = e.data;
      if (message.type === 'assignmentText') {
        setAssignmentText(message.body);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleRefresh = () => {
    notifyExtension('refresh', 'Reload webview');
  };

  const handleTabChange = (e: any) => {
    const newIndex = (e.detail && e.detail.index !== undefined)
      ? e.detail.index
      : (e.target as any).selectedIndex ?? 0;
    setSelectedTabIndex(newIndex);
  };

  return (
    <div className="App">
      <div className='titleBar'>
        <h1 className='titleBarLeft'>Assignment</h1>
        <VscodeToolbarContainer className='titleBarRight'>
          <VscodeToolbarButton label='Refresh' id="refresh-btn" className='icon' onClick={handleRefresh}><i className='codicon codicon-refresh'></i></VscodeToolbarButton>
          <VscodeToolbarButton label='How to' id="docs-btn" className='icon' onClick={() => setSelectedTabIndex(2)}><i className='codicon codicon-book'></i></VscodeToolbarButton>
          <VscodeToolbarButton label='About' id="about-btn" className='icon' onClick={() => setSelectedTabIndex(3)}><i className='codicon codicon-info'></i></VscodeToolbarButton>
        </VscodeToolbarContainer>
      </div>
      <VscodeTabs selectedIndex={selectedTabIndex} onChange={handleTabChange}>
        <VscodeTabHeader slot="header">Assignment text</VscodeTabHeader>

        <VscodeTabPanel>
          <AssignmentText assignmentHTML={assignmentStatement}/>
        </VscodeTabPanel>

        <VscodeTabHeader slot="header">Grading reports</VscodeTabHeader>

        <VscodeTabPanel>
          <GradingReports notifyExtension={notifyExtension} setWorkflowRuns={setGradingRuns} workflowRuns={gradingRuns} />
        </VscodeTabPanel>

        <VscodeTabHeader slot="header" className="hidden-tab-header">How to</VscodeTabHeader>

        <VscodeTabPanel>
          <HowTo />
        </VscodeTabPanel>

        <VscodeTabHeader slot="header" className="hidden-tab-header">About</VscodeTabHeader>

        <VscodeTabPanel>
          <About />
        </VscodeTabPanel>
      </VscodeTabs>
      <VscodeDivider />
      <VscodeProgressBar indeterminate></VscodeProgressBar>
      {error && <div className='error-message'>Error: {error}</div>}
    </div>
  );
}

export default App;
