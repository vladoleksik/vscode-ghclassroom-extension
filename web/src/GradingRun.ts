export type GradingRun = {
    id: number;
    status: string;
    conclusion?: string;
    created_at: string;
    updated_at: string;
    artifacts_url: string;
    display_name: string;
    run_number: number;
};