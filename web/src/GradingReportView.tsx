import React, { useEffect } from "react";

import { GradingRun } from "./GradingRun";
import { VscodeScrollable } from "@vscode-elements/react-elements";

function GradingReport(
    {
        selectedRun,
        notifyExtension
    }:
    {
        selectedRun: GradingRun,
        notifyExtension: (command: string, text: string) => void
    }
) {
    let [reportContent, setReportContent] = React.useState<string>('');

    useEffect(() => {
        if (selectedRun) {
            notifyExtension('fetchGradingReport', selectedRun.artifacts_url);
            const handleMessage = (e: MessageEvent) => {
                const message = e.data;
                if (message.type === 'gradingReport') {
                    setReportContent(message.body);
                }
            };
            window.addEventListener('message', handleMessage);
        }
    }, [selectedRun, notifyExtension]);

    return (
        <div>
            {reportContent && reportContent.trim() !== '' ?
                <VscodeScrollable style={{ height: '65vh', border: '1px solid var(--vscode-editorWidget-border)', borderRadius: '4px', boxSizing: 'border-box' }}>
                    {
                    // Then use in the iframe:
                    <iframe srcDoc={reportContent} sandbox="allow-scripts allow-same-origin" style={{ width: '100%', height: '65vh' }} />}
                </VscodeScrollable>
                :
                <div className="empty-message-div">
                    <h2>📄</h2>
                    <h2>No report content available for now.</h2>
                    <p>The grading report content from <code>{selectedRun?.artifacts_url}</code> will be displayed here once available.</p>
                </div>
            }
        </div>
    );
}

export default GradingReport;