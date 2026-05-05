export interface FileValidationResult {
    path: string;
    errors: string[];
    warnings: string[];
}
export interface ValidationReport {
    ok: boolean;
    results: FileValidationResult[];
    errors: number;
    warnings: number;
    files: number;
}
export declare function validateClisWithTarget(dirs: string[], target?: string): ValidationReport;
export declare function renderValidationReport(report: ValidationReport): string;
