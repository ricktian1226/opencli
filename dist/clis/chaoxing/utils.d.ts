/**
 * Chaoxing (学习通) shared helpers.
 *
 * Flow: initSession → getCourses → enterCourse → getTabIframeUrl → navigate → parse DOM
 * Chaoxing has no flat "list all assignments" API; data is behind session-gated
 * course pages loaded as iframes.
 */
import type { IPage } from '../../types.js';
/** Sleep for given milliseconds (anti-scraping delay). */
export declare function sleep(ms: number): Promise<void>;
/** Execute a credentialed fetch in the browser context, returning JSON or text. */
export declare function fetchChaoxing(page: IPage, url: string): Promise<any>;
/** Format a timestamp (seconds or milliseconds or date string) to YYYY-MM-DD HH:mm. */
export declare function formatTimestamp(ts: unknown): string;
/** Map numeric work status to Chinese label. */
export declare function workStatusLabel(status: unknown): string;
export interface ChaoxingCourse {
    courseId: string;
    classId: string;
    cpi: string;
    title: string;
}
/** Fetch enrolled course list via backclazzdata JSON API. */
export declare function getCourses(page: IPage): Promise<ChaoxingCourse[]>;
/** Navigate to the interaction page to establish a Chaoxing session. */
export declare function initSession(page: IPage): Promise<void>;
/**
 * Enter a course via stucoursemiddle redirect (establishes course session + enc).
 * After this call the browser is on the course page.
 */
export declare function enterCourse(page: IPage, course: ChaoxingCourse): Promise<void>;
/**
 * On the course page, click a tab (作业 / 考试) and return the iframe src
 * that gets loaded. Returns empty string if the tab is not found.
 */
export declare function getTabIframeUrl(page: IPage, tabName: string): Promise<string>;
export interface AssignmentRow {
    course: string;
    title: string;
    deadline: string;
    status: string;
    score: string;
}
/**
 * Parse assignments from the current page DOM (the 作业列表 page).
 * The page uses `.ulDiv li` items with status/deadline/score info.
 */
export declare function parseAssignmentsFromDom(page: IPage, courseName: string): Promise<AssignmentRow[]>;
export interface ExamRow {
    course: string;
    title: string;
    start: string;
    end: string;
    status: string;
    score: string;
}
/** Parse exams from the current page DOM (the 考试列表 page). */
export declare function parseExamsFromDom(page: IPage, courseName: string): Promise<ExamRow[]>;
