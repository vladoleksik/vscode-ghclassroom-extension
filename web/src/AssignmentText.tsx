import { VscodeScrollable } from '@vscode-elements/react-elements';
import React from 'react';

function AssignmentText(
    {
      assignmentHTML, 
    } :
    {
      assignmentHTML: string,
    })
 {

  return (
    <div>
        {(assignmentHTML && assignmentHTML.trim() !== '') ?
        <VscodeScrollable style={{ height: '80vh', padding: '1em', boxSizing: 'border-box' }}>
          <div dangerouslySetInnerHTML={{ __html: assignmentHTML }} /> 
        </VscodeScrollable>
        : 
        <div className="error-message-div">
        <h2>❓</h2>
        <h2>No assignment statement found</h2>
        <p>The assignment statement is usually in a <code>README.md</code> or similarly named file.<br/>
        Please check the files for typos.</p>
        </div>}
    </div>
  );
}

export default AssignmentText;