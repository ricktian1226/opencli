## ADDED Requirements

### Requirement: Browser bridge installation guidance
The project SHALL document a clear setup flow for the browser bridge required by browser-backed commands.

#### Scenario: Install browser bridge on a new machine
- **WHEN** a contributor needs browser-backed commands
- **THEN** the project provides explicit steps for loading the browser extension and enabling the required browser configuration

### Requirement: Browser bridge connectivity validation
The project SHALL provide a validation flow that confirms the browser bridge is connected before browser-backed commands are used.

#### Scenario: Validate extension connectivity
- **WHEN** a contributor runs the browser connectivity check
- **THEN** the project reports whether the daemon and browser extension are connected and ready

### Requirement: Browser command precondition handling
The project SHALL identify when browser-backed commands cannot proceed because the browser bridge is disconnected and SHALL return actionable remediation guidance.

#### Scenario: Extension is disconnected
- **WHEN** a contributor runs a browser-backed command while the extension is disconnected
- **THEN** the project reports that browser connectivity is missing and directs the contributor to reconnect the browser bridge before retrying
