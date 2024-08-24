import Device from './Device';

export type ZigbeeEvent = any;
export type EventHandler = (event: ZigbeeEvent) => void;

const eventHandlersByDevice: Record<string, EventHandler[]> = {};

export function addEventHandler(uuid: string, handler: EventHandler) {
	eventHandlersByDevice[uuid] ??= [];
	eventHandlersByDevice[uuid].push(handler);
}

export function handleEvent(uuid: string, event: ZigbeeEvent) {
	const handlers = eventHandlersByDevice[uuid] ?? [];
	for (const handler of handlers) {
		handler(event);
	}
}

export default class ZigbeeDevice extends Device {
	ieee: string;

	constructor(ieee: string) {
		super();
		this.ieee = ieee;
		this.name = `${this.constructor.name} ${ieee}`;
	}
}
