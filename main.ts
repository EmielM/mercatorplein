import {createConnection, createLongLivedTokenAuth, type MessageBase} from 'home-assistant-js-websocket';
import {getDevices} from './Device';
import {handleEvent} from './ZigbeeDevice';
import {handleEntityState} from './Entity';

const haToken = await Bun.file('./ha.token').text();
const auth = createLongLivedTokenAuth('http://localhost:8123', haToken.trim());

export function getAccessToken(): string {
	return auth.accessToken;
}

const haConnection = await createConnection({auth});

console.log('connected to HA');

export async function haSend(message: MessageBase): Promise<any> {
	try {
		return await haConnection.sendMessagePromise(message);
	} catch (e) {
		console.warn('haSend failed ', message, e);
		return;
	}
}

haConnection.subscribeEvents((event: any) => {
	// console.log('zha_event', event);
	const uuid = event.data.device_ieee as string;
	handleEvent(uuid, event);
}, 'zha_event');

haConnection.subscribeEvents((event: any) => {
	if (event.data.entity_id.match(/^sensor.(power|energy|voltage|current)/)) {
		// Lots of spam from energy sensors
		return;
	}
	// console.log('state_changed', event);
	const entityId = event.data.entity_id as string;
	const newState = event.data.new_state as {state: string; attributes: any} | null;
	if (newState) {
		handleEntityState(entityId, newState.state, newState.attributes);
	}
}, 'state_changed');

const myHome = process.argv[2] ?? './mercatorplein';
const mercatorplein = (await import(myHome)).default;

process.addListener('uncaughtException', (e) => {
	console.warn('uncaughtException', e);
});

process.addListener('unhandledRejection', (e) => {
	console.warn('unhandledRejection', e);
});

const allDevices = getDevices(mercatorplein);
await Promise.all(allDevices.map((device) => device.init()));

console.log(`initialized ${allDevices.length} devices`);

const initialStates = await haSend({type: 'get_states'});
for (const initialState of initialStates) {
	handleEntityState(initialState.entity_id, initialState.state, initialState.attributes);
}

console.log('synced initial state');
