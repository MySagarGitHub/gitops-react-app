import "./App.css";

const {
  VITE_APP_NAME = "CI/CD Demo App",
  VITE_APP_VERSION = "local",
  VITE_BUILD_NUMBER = "0",
  VITE_BUILD_TIME = "unknown",
  VITE_ENVIRONMENT = "dev",
} = import.meta.env;

export default function App() {
  return (
    <main className="container">
      <h1>{VITE_APP_NAME}</h1>

      <p className="status">Status: Running</p>

      <ul>
        <li>
          <strong>Version:</strong> {VITE_APP_VERSION}
        </li>
        <li>
          <strong>Build Number:</strong> {VITE_BUILD_NUMBER}
        </li>
        <li>
          <strong>Environment:</strong> {VITE_ENVIRONMENT}
        </li>
        <li>
          <strong>Build Time:</strong> {VITE_BUILD_TIME}
        </li>
      </ul>

      <p>
        Health endpoint: <code>/health</code>
      </p>
    </main>
  );
}