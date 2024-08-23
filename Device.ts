import type {Connection, MessageBase} from 'home-assistant-js-websocket';
import {callService} from 'home-assistant-js-websocket/dist/messages.js';

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

	static haConnection: Connection | undefined;

	async haSend(message: MessageBase): Promise<any> {
		if (!Device.haConnection) {
			console.warn('could not send, no connection');
			return;
		}
		return await Device.haConnection.sendMessagePromise(message);
	}
}
