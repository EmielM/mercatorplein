import MarmitekButton from './MarmitekButton';
import Cover from './Cover';
import Light, {lights} from './Light';
import MotionSensor from './MotionSensor';
import Outlet from './Outlet';
import SceneController from './SceneController';
import {IkeaButton} from './IkeaButton';
import {haSend} from './main';
import Observable from './Observable';
import Entity from './Entity';

const livingRoom = {
	curvedWallButton: new MarmitekButton('5c:02:72:ff:fe:05:0c:27'),
	boekenkastLights: new Light('58:8e:81:ff:fe:ad:f3:14'),
	tvSpot: new Light('68:0a:e2:ff:fe:c3:f5:45'),
	artSpot: new Light('58:8e:81:ff:fe:41:12:2a'),
	deskLamp: new Light('ec:1b:bd:ff:fe:31:74:04'),
};
const kitchen = {
	counterButton: new IkeaButton('bc:33:ac:ff:fe:0d:28:f6'),
	counterStrip: new Light('00:17:88:01:0b:4a:33:42'),
	tableLights: new Light('ec:1b:bd:ff:fe:ad:19:65'),
};
const hall = {
	entrySensor: new MotionSensor('8c:65:a3:ff:fe:3e:34:18'),
	bulb1: new Light('04:87:27:ff:fe:8f:dd:fb'),
	bulb2: new Light('04:87:27:ff:fe:8f:d8:d6'),
};
const bedRoom = {
	curtain: new Cover('cover.192_168_178_225'),
	antiMusquito: new Outlet('34:10:f4:ff:fe:8b:23:05'),
	buttonEmiel: new MarmitekButton('5c:02:72:ff:fe:0a:5f:e5'),
	buttonGhis: new MarmitekButton('5c:02:72:ff:fe:0a:5f:ef'),
};
const office = {
	button: new IkeaButton('84:2e:14:ff:fe:8c:3d:c1'),
	deskPower: new Outlet('28:db:a7:ff:fe:5f:d9:d7'),
};

const homePresence = {
	emiel: new Entity('device_tracker.emiels_iphone', (value) => value === 'home'),
	ghislaine: new Entity('device_tracker.iphone_ghislaine', (value) => value === 'home'),
};

// These track the iOS focus mode
// - https://github.com/home-assistant/iOS/issues/1899
const asleep = {
	emiel: new Entity('binary_sensor.emiels_iphone_focus', (value) => value === 'off'),
	ghislaine: new Entity('binary_sensor.emiels_iphone_focus', (value) => value === 'off'),
};

const livingRoomScenes = new SceneController({
	lights: [livingRoom.boekenkastLights, livingRoom.tvSpot, livingRoom.artSpot, livingRoom.deskLamp],
	scenes: [
		[0, 0, 0, 0], // off
		[0.8, {brightness: 0.8, temp: 2500}, {brightness: 0.8, temp: 2500}, 0.5], // on
		[0.4, {brightness: 0.4, temp: 2500}, {brightness: 0.4, temp: 2500}, 0.25], // movie
	],
});
livingRoom.curvedWallButton.leftButton.onPress(livingRoomScenes.nextScene);

const kitchenScenes = new SceneController({
	lights: [kitchen.counterStrip, kitchen.tableLights],
	scenes: [
		[0, 0], // off
		[{brightness: 0.75, rgb: [255, 193, 141]}, 0.5], // cooking
		[{brightness: 0.26, rgb: [255, 180, 90]}, 0.3], // eating
	],
});
livingRoom.curvedWallButton.rightButton.onPress(kitchenScenes.nextScene);
kitchen.counterButton.onPressOn(kitchenScenes.nextOnScene);
kitchen.counterButton.onPressOff(kitchenScenes.off);

hall.entrySensor.onMotion(function () {
	hall.bulb1.to({brightness: 0.4, temp: 2500});
	hall.bulb2.to({brightness: 0.4, temp: 2500});
});

homePresence.emiel.observe(onPresenceChange);
homePresence.ghislaine.observe(onPresenceChange);

const nobodyHome = new Observable<boolean | undefined>(undefined);
function onPresenceChange() {
	nobodyHome.set(homePresence.emiel.value === false && homePresence.ghislaine.value === false);
}

nobodyHome.observe((noBodyHome) => {
	if (noBodyHome === undefined) {
		// Unknown yet
		return;
	}
	console.log(noBodyHome ? 'no body home' : 'someone home');
	if (noBodyHome) {
		allLightsOff();
	}

	haSend({
		type: 'call_service',
		domain: 'switch',
		service: noBodyHome ? 'turn_off' : 'turn_on',
		service_data: {
			entity_id: 'switch.roborock_s8_maxv_ultra_do_not_disturb',
		},
	});
});

// Local state (consider: move to HA entity?)
let curtainsOpen = false;
function toggleCurtain() {
	curtainsOpen = !curtainsOpen;
	if (curtainsOpen) {
		bedRoom.curtain.open();
		bedRoom.antiMusquito.off();
	} else {
		bedRoom.curtain.close();
		bedRoom.antiMusquito.on();
	}
}

function allLightsOff() {
	lights({kitchen, livingRoom, bedRoom, hall, office}).off();
}

function allAsleep() {
	bedRoom.curtain.close();
	bedRoom.antiMusquito.on();
	allLightsOff();
}

bedRoom.buttonEmiel.onPress(toggleCurtain);
bedRoom.buttonGhis.onPress(toggleCurtain);
bedRoom.buttonEmiel.onDoublePress(allAsleep);
bedRoom.buttonGhis.onDoublePress(allAsleep);

office.button.onPressOn(() => office.deskPower.on());
office.button.onPressOff(() => office.deskPower.off());

function asleepChanged(isAsleep: boolean | undefined) {
	// Whenever a transition from asleep to awake between 6:00 and 10:00, enable morning lights
	const hours = new Date().getHours();
	if (isAsleep === false && hours >= 6 && hours <= 10) {
		livingRoomScenes.toScene(2);
		kitchenScenes.toScene(2);
	}
}
asleep.emiel.observe(asleepChanged);
asleep.ghislaine.observe(asleepChanged);

export default {livingRoom, kitchen, hall, bedRoom, office};
