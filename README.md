# GitHub Classroom Assignment Viewer

This VS Code Web extension provides a streamlined interface for students and educators to view feedback from GitHub Classroom assignment submissions. It fetches and displays detailed information from individual student repository runs within GitHub Actions.

## Features

*   **View Action Reports:** Access and view detailed reports generated as artifacts from GitHub Actions workflow runs.
*   **Check Grades:** Quickly see the grade assigned to a submission.
*   **Track Attempts:** If applicable, view the attempt number for each submission.

## Requirements

To use this extension, you will need:

*   A GitHub account with access to the relevant student repositories.
*   The corresponding GitHub Classroom setup with assignments configured to run GitHub Actions.

## How It Works

The extension authenticates with GitHub and uses the GitHub API to find workflow runs and their associated artifacts in the student repositories linked to your account. It then parses the artifact content to display the report, grade, and other relevant feedback directly within the VS Code interface.

## Extension Settings

This extension currently does not require any specific VS Code settings. Future updates may include settings for custom report parsing or repository filtering.

## Known Issues

There are currently no known issues. Please report any bugs or feature requests on the project's GitHub repository.

## Release Notes

### 1.0.0

- Initial release of the GitHub Classroom Assignment Viewer.
- Feature to view GitHub Actions reports, grades, and attempt numbers.
