import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { HealthCheckProvider } from "./contexts/HealthCheckContext";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
	<React.StrictMode>
		<BrowserRouter>
			<HealthCheckProvider>
				<App />
			</HealthCheckProvider>
		</BrowserRouter>
	</React.StrictMode>,
);
