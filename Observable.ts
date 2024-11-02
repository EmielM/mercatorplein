/**
 * The old classic
 */
class Observable<ValueType> {
	value: ValueType;
	observers = new Set<(value: ValueType) => void>();

	constructor(initialValue: ValueType) {
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
	observe = (observer: (value: ValueType) => void) => {
		this.observers.add(observer);
	};
}

export default Observable;
