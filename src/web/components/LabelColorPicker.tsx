import type React from "react";
import { useState } from "react";

interface LabelColorPickerProps {
	initialColor: string;
	onApply: (color: string) => Promise<void>;
	onClose: () => void;
}

export const PRESET_COLORS = [
	"#f9c4c4",
	"#fad0b4",
	"#f9e6b4",
	"#c4e6c4",
	"#b4e0d0",
	"#b8d4f0",
	"#d4b8e6",
	"#f4b4c4",
	"#b4e0e6",
	"#c4e6b4",
	"#f4d0b4",
	"#c4c4d0",
];

const LabelColorPicker: React.FC<LabelColorPickerProps> = ({ initialColor, onApply, onClose }) => {
	const [localColor, setLocalColor] = useState(initialColor);

	return (
		<div className="absolute left-0 top-6 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 w-56">
			<div className="grid grid-cols-6 gap-1.5 mb-2">
				{PRESET_COLORS.map((c) => (
					<button
						key={c}
						type="button"
						className={`size-6 rounded-circle border-2 transition-all ${
							localColor === c ? "border-blue-500 scale-110" : "border-transparent hover:scale-110"
						}`}
						style={{ backgroundColor: c }}
						onClick={() => setLocalColor(c)}
					/>
				))}
			</div>
			<div className="flex items-center gap-2">
				<input
					type="text"
					value={localColor}
					onChange={(e) => setLocalColor(e.target.value)}
					placeholder="#ff0000"
					className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-stone-500"
				/>
				<button
					type="button"
					onClick={async () => {
						const color = localColor.startsWith("#") ? localColor : "";
						try {
							await onApply(color);
							onClose();
						} catch {
							// error handled by onApply — popup stays open
						}
					}}
					className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
				>
					Apply
				</button>
			</div>
		</div>
	);
};

export default LabelColorPicker;
