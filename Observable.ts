/**
 * The old classic
 */
class Observable<ValueType> {
	/**
	 * Observables can be uninitialized (no initialValue passed), then value is
	 * undefined until set.
	 */
	value: ValueType | undefined;
	observers = new Set<(value: ValueType) => void>();

	constructor(initialValue?: ValueType) {
		this.value = initialValue;
	}

	set = (newValue: ValueType) => {
		// Future: compare deeply
		if (newValue !== this.value) {
			this.value = newValue;
			for (const handler of this.observers) {
				handler(newValue);
			}
		}
	};

	/**
	 * Start observing.
	 * - Consider: triggered directly when value is not undefined.
	 */
	observe = (observer: (value: ValueType) => void) => {
		this.observers.add(observer);
	};
}

export default Observable;
