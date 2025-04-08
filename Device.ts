export type DeviceTree =
	| {
			[key: string]: Device | DeviceTree;
	  }
	| (Device | DeviceTree)[];

export function getDevices(tree: DeviceTree): Device[] {
	let devices: Device[] = [];
	for (const device of Object.values(tree)) {
		if (device instanceof Device) {
			devices = [...devices, device];
		} else {
			devices = [...devices, ...getDevices(device)];
		}
	}
	return devices;
}

export default class Device {
	name: string = 'unknown';

	async init(): Promise<void> {}

	log(...args: any[]) {
		console.log(`${this.name}:`, ...args);
	}

	warn(...args: any[]) {
		console.warn(`${this.name}:`, ...args);
	}
}
