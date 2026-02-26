We are planning to develop a visual component that can be used across any device (responsive and platform-agnostic). The core goal of this component is to display a map interface and show the practitioner’s live location based on their real-time GPS data. This should include the ability to update the displayed position dynamically as the practitioner moves.

This ticket covers the design and implementation of the map component UI, ensuring it can be easily integrated into various screens or applications. The component should be modular, self-contained, and configurable (for example: setting initial zoom, map provider, marker styles, etc.). Additionally, the component should support accessing permission-based live location updates and handle situations where location access is denied/granted by the user.

Acceptance Criteria:

Create a responsive map UI component capable of working on mobile and desktop devices.

The component correctly requests and handles user location permissions.

The practitioner’s current location is displayed on the map as a moving marker in real-time.

Configuration options exist for key settings (initial view, map provider keys, marker behaviour).

Documentation or usage guidelines are included for developers to integrate this component in other features or screens.