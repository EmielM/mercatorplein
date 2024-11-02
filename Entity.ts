import Observable from './Observable';

type StateHandler = (haState: string, haAttributes: any) => void;
type StateMapper<ValueType> = (haState: string, haAttributes: any) => ValueType;

const handlerIndex: Record<string, StateHandler[]> = {};

export function handleEntityState(entityId: string, haState: string, haAttributes: any) {
	const handlers = handlerIndex[entityId] ?? [];
	for (const handler of handlers) {
		// console.log('state update', entityId, haState, haAttributes);
		handler(haState, haAttributes);
	}
}

/**
 * Models an entity in Home Assistant, mapped to an observable state value we use on our side
 */
export default class Entity<ValueType> extends Observable<ValueType> {
	entityId: string;
	haState: string | undefined;
	haAttributes: any | undefined;

	constructor(entityId: string, mapper: StateMapper<ValueType>) {
		super(undefined);
		this.entityId = entityId;
		this.observeRaw((haState: string, haAttributes: any) => {
			this.haState = haState;
			this.haAttributes = haAttributes;
			const value = mapper(haState, haAttributes);
			console.debug(entityId, 'to', value);
			this.set(value);
		});
	}

	// Observes raw entity data from HA, instead of mapped version
	observeRaw(handler: StateHandler) {
		handlerIndex[this.entityId] ??= [];
		handlerIndex[this.entityId].push(handler);
	}
}
