import MarmitekButton from './MarmitekButton';
import Cover from './Cover';
import Light, {lights} from './Light';
import MotionSensor from './MotionSensor';
import Outlet from './Outlet';
import SceneController from './SceneController';
import {IkeaButton} from './IkeaButton';

const livingRoom = {
	curvedWallButton: new MarmitekButton('5c:02:72:ff:fe:05:0c:27'),
	boekenkastLights: new Light('58:8e:81:ff:fe:ad:f3:14'),
	tvSpot: new Light('68:0a:e2:ff:fe:c3:f5:45'),
	artSpot: new Light('58:8e:81:ff:fe:41:12:2a'),
};
const kitchen = {
	counterButton: new IkeaButton('bc:33:ac:ff:fe:0d:28:f6'),
	counterStrip: new Light('00:17:88:01:0b:4a:33:42'),
	tableLights: new Light('ec:1b:bd:ff:fe:ad:19:65'),
};
const hall = {
	entrySensor: new MotionSensor('8c:f6:81:ff:fe:f6:a1:45'),
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

const livingRoomScenes = new SceneController({
	lights: [livingRoom.boekenkastLights, livingRoom.tvSpot, livingRoom.artSpot],
	scenes: [
		[0, 0, 0], // off
		[0.8, {brightness: 0.8, temp: 2500}, {brightness: 0.8, temp: 2500}], // on
		[0.4, {brightness: 0.4, temp: 2500}, {brightness: 0.4, temp: 2500}], // movie
	],
});
livingRoom.curvedWallButton.leftButton.onPress(livingRoomScenes.nextScene);

const kitchenScenes = new SceneController({
	lights: [kitchen.counterStrip, kitchen.tableLights],
	scenes: [
		[0, 0], // off
		[{brightness: 0.75, rgb: [255, 193, 141]}, 0.5], // cooking
		[{brightness: 0.5, rgb: [255, 136, 13]}, 0.3], // eating
	],
});
livingRoom.curvedWallButton.rightButton.onPress(kitchenScenes.nextScene);
kitchen.counterButton.onPressOn(kitchenScenes.nextOnScene);
kitchen.counterButton.onPressOff(kitchenScenes.off);

function isNight() {
	const now = new Date();
	return now.getHours() >= 22 && now.getHours() <= 6;
}

hall.entrySensor.onMove(function () {
	if (isNight() && !lights(livingRoom).isOn() && !kitchen.counterStrip.isOn()) {
		// Assume no one was at home
		kitchen.counterStrip.to({brightness: 0.3, temp: 2700});
	}
});

function toggleBed() {
	if (bedRoom.curtain.isOpen()) {
		bedRoom.curtain.close();
		bedRoom.antiMusquito.on();
	} else {
		bedRoom.curtain.open();
		bedRoom.antiMusquito.off();
	}
}

function allAsleep() {
	lights({kitchen, livingRoom, bedRoom, hall, office}).off();
	bedRoom.curtain.close();
	bedRoom.antiMusquito.on();
}

bedRoom.buttonEmiel.onPress(toggleBed);
bedRoom.buttonGhis.onPress(toggleBed);
bedRoom.buttonEmiel.onDoublePress(allAsleep);
bedRoom.buttonGhis.onDoublePress(allAsleep);

office.button.onPressOn(() => office.deskPower.on());
office.button.onPressOff(() => office.deskPower.off());

export default {livingRoom, kitchen, hall, bedRoom, office};
