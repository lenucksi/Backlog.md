export class AsyncInitializer<T> {
	private _initialized = false;
	private _promise: Promise<T> | null = null;

	constructor(private initFn: () => Promise<T>) {}

	async ensure(): Promise<T> {
		if (this._promise) return this._promise;

		this._promise = this.initFn()
			.then((result) => {
				this._initialized = true;
				return result;
			})
			.catch((error) => {
				this._promise = null;
				throw error;
			});

		return this._promise;
	}

	get isInitialized(): boolean {
		return this._initialized;
	}

	reset(): void {
		this._initialized = false;
		this._promise = null;
	}
}
