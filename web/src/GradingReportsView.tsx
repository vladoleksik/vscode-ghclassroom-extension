import React, { useEffect } from 'react';
import {
    VscodeSingleSelect,
    VscodeOption,
    VscodeDivider
} from '@vscode-elements/react-elements';

import { GradingRun } from './GradingRun';

import GradingReport from './GradingReportView';

function getRunDescriptionString(run: GradingRun): string {
    const createdDateTime = new Date(run.created_at);
    const createdAgo = Math.floor((Date.now() - createdDateTime.getTime()) / 1000);
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
    if(run.conclusion && run.conclusion != 'success') {
        createdAgoStr = `❗` + createdAgoStr;
    }
    return `#${run.run_number}: ${run.display_name} (${createdAgoStr})`;
}

function GradingReports(
    {
        notifyExtension,
        workflowRuns = [],
        setWorkflowRuns
    }: 
    {
        notifyExtension: (command: string, text: string) => void,
        workflowRuns: GradingRun[],
        setWorkflowRuns: React.Dispatch<React.SetStateAction<GradingRun[]>>
    }
) {
    let [selectedReportId, setSelectedReportId] = React.useState<string>(workflowRuns.length > 0 ? workflowRuns[0].id.toString() : '');

    useEffect(() => {
        const fetchWorkflowRuns = () => {
            notifyExtension('workflowRunsRequest', 'Requesting workflow runs');
        };

        const handleMessage = (e: MessageEvent) => {
            const message = e.data;
            if (message.type === 'workflowRuns') {
                const runs = message.body;
                const gradingRuns: GradingRun[] = runs.map((run: any) => ({
                    id: run.id,
                    status: run.status,
                    conclusion: run.conclusion,
                    created_at: run.created_at,
                    updated_at: run.updated_at,
                    artifacts_url: run.artifacts_url,
                    display_name: run.display_title,
                    run_number: run.run_number
                }));
                setWorkflowRuns(gradingRuns);
                setSelectedReportId(gradingRuns.length > 0 ? gradingRuns[0].id.toString() : '');
            }
        };

        fetchWorkflowRuns();
        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);
    return <>
        {workflowRuns.length === 0 ?
            <div className="empty-message-div">
                <h1 className="illustration">📭</h1>
                <h2>No grading reports yet.</h2>
                <p>See how to submit a solution for grading.</p>
            </div>
            :
            <div>
                <h2>Grading Reports</h2>
                <VscodeSingleSelect label="Select a grading run:" value={selectedReportId} onChange={(e) => {
                    setSelectedReportId((e.target as HTMLSelectElement).value);
                }}>
                    {workflowRuns.map((run) => (
                        <VscodeOption key={run.id} value={run.id.toString()}>
                            {getRunDescriptionString(run)}
                        </VscodeOption>
                    ))}
                </VscodeSingleSelect>
                <VscodeDivider />
                {workflowRuns.find(run => run.id.toString() === selectedReportId) ?
                <GradingReport selectedRun={workflowRuns.find(run => run.id.toString() === selectedReportId)!} notifyExtension={notifyExtension} />
                : null}
            </div>
        }                
    </>;
}

export default GradingReports;