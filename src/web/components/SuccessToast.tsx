import type React from "react";
import { Icons } from "./icons";

interface SuccessToastProps {
	message: string;
	onDismiss: () => void;
	icon?: React.ReactNode;
}

export function SuccessToast({ message, onDismiss, icon }: SuccessToastProps) {
	return (
		<div className="fixed top-4 right-4 bg-green-500 dark:bg-green-600 text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 animate-slide-in-right z-50 border border-green-400 dark:border-green-500 transition-colors duration-200">
			{icon || <div className="size-2 bg-white rounded-circle" />}
			<span className="font-medium">{message}</span>
			<button
				type="button"
				onClick={onDismiss}
				className="ml-2 text-green-200 dark:text-green-300 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-300 dark:focus:ring-green-400 rounded p-1"
				aria-label="Dismiss"
			>
				<Icons.Close />
			</button>
		</div>
	);
}
