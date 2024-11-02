import Device from './Device';
import Entity from './Entity';
import {haSend} from './main';

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

// Finds relevant entity in HA for this device, and subscribes to updates
export async function findZigbeeEntityId(entityPrefix: string, ieee: string): Promise<string | undefined> {
	const result = (await haSend({type: 'zha/device', ieee})) as any;
	for (const entity of result.entities as {name: string; entity_id: string}[]) {
		if (entity.entity_id.startsWith(entityPrefix)) {
			return entity.entity_id;
		}
	}
	console.warn(`entity ${entityPrefix} not found for ieee ${ieee}`);
}
