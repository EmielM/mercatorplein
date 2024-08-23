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

export type DeviceTree = {
	[key: string]: Device | DeviceTree;
};

export function getDevices(tree: DeviceTree): Device[] {
	let devices: Device[] = [];
	for (const key in tree) {
		const device = tree[key];
		if (device instanceof Device) {
			devices = [...devices, device];
		} else {
			devices = [...devices, ...getDevices(device)];
		}
	}
	return devices;
}

export default class Device {
	ieee: string;
	constructor(ieee: string) {
		this.ieee = ieee;
	}

	async init(): Promise<void> {}

	log(...args: any[]) {
		console.log(`${this.constructor.name} ${this.ieee}:`, ...args);
	}

	warn(...args: any[]) {
		console.warn(`${this.constructor.name} ${this.ieee}:`, ...args);
	}
}
