import {createConnection, createLongLivedTokenAuth, subscribeEntities} from 'home-assistant-js-websocket';
import Device, {getDevices, handleEvent} from './Device';

const auth = createLongLivedTokenAuth(
	'http://localhost:8123',
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJiNzA3NWU1MTRjNjU0ZDRjODI5YzdhMmQ5YjRlYTUwMyIsImlhdCI6MTcyMjg3Mjg2NywiZXhwIjoyMDM4MjMyODY3fQ.F5aXWM_GrWR8ao4LUaSPRaTgdNGjMwvSLWWnpC4FVJY'
);

const connection = await createConnection({auth});

console.log('connected to HA');

Device.haConnection = connection;

connection.subscribeEvents((event: any) => {
	if (event.event_type !== 'zha_event') {
		return;
	}

	console.log('e ', event);

	const uuid = event.data?.device_ieee;
	if (!uuid) {
		console.log('missing device_ieee', event);
		return;
	}

	handleEvent(uuid, event);
}, 'zha_event');

const deviceTree = (await import('./mercatorplein68')).default;

await Promise.all(getDevices(deviceTree).map((device) => device.init()));

console.log('initialized devices');
