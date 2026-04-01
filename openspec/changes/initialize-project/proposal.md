## Why

This project currently requires multiple manual setup steps before contributors can run and validate it locally. We need a repeatable initialization flow so a fresh checkout can be prepared consistently, especially on Windows where local runtime setup and browser bridge connectivity are easy to misconfigure.

## What Changes

- Add a documented project bootstrap flow that prepares the required local runtime and command entrypoints for development.
- Define initialization behavior for browser bridge setup so local commands depending on Chrome connectivity can be validated after bootstrap.
- Standardize post-initialization verification so contributors can confirm the project is ready before implementation work starts.

## Capabilities

### New Capabilities
- `project-bootstrap`: Initialize a fresh local checkout with the required runtimes, entrypoints, and validation steps needed to run the project.
- `browser-bridge-setup`: Prepare and verify the browser bridge integration required for browser-backed commands during local development.

### Modified Capabilities

## Impact

- Local developer setup and onboarding flow
- Bootstrap scripts and command entrypoints
- Browser bridge / Chrome extension setup guidance
- Validation commands used before implementation begins
