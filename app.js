const Protocol = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').ModuleClient;
const { Message } = require('azure-iot-device');
const request = require("request");
const debug = require('debug')('iot-edge-modbusevent:app');
let rules = {};

const ledTable = {
  green: {
    "HwId": "PowerMeter-0a:01:01:01:01:01",
    "UId": "1",
    "Address": "00003",
    "Value": "0"
  },
  yellow: {
    "HwId":"PowerMeter-0a:01:01:01:01:01",
    "UId": "1",
    "Address": "00002",
    "Value": "0"
  },
  red: {
    "HwId":"PowerMeter-0a:01:01:01:01:01",
    "UId": "1",
    "Address": "00001",
    "Value": "0"
  }
}

const turnOnLed = function turnOnLed(color) {
  const payload = {
      "slot": 0,
      "io": {
          "do": [
              {
                  "doIndex": 0,
                  "doMode": 0,
                  "doStatus": 0
              },
              {
                  "doIndex": 1,
                  "doMode": 0,
                  "doStatus": 0
              },
              {
                  "doIndex": 2,
                  "doMode": 0,
                  "doStatus": 0
              },
              {
                  "doIndex": 3,
                  "doMode": 0,
                  "doStatus": 0
              }
          ]
      }
  };

  if (color === 'green') {
    payload.io.do[0].doStatus = 0;
    payload.io.do[1].doStatus = 0;
    payload.io.do[2].doStatus = 1;
    payload.io.do[3].doStatus = 0;
  } else if (color === 'yellow') {
    payload.io.do[0].doStatus = 0;
    payload.io.do[1].doStatus = 1;
    payload.io.do[2].doStatus = 0;
    payload.io.do[3].doStatus = 0;
  } else if (color === 'red') {
    payload.io.do[0].doStatus = 1;
    payload.io.do[1].doStatus = 0;
    payload.io.do[2].doStatus = 0;
    payload.io.do[3].doStatus = 0;
  } else {
    payload.io.do[0].doStatus = 0;
    payload.io.do[1].doStatus = 0;
    payload.io.do[2].doStatus = 0;
    payload.io.do[3].doStatus = 0;
  }
  jsonString = JSON.stringify(payload);
  const options = {
    method: 'PUT',
    url: 'http://192.168.4.125/api/slot/0/io/do',
    timeout: 3000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'vdn.dac.v1',
      'Content-Length': Buffer.byteLength(jsonString)
    },
    body: JSON.stringify(payload)
  };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    console.log(body);
  });
}

Client.fromEnvironment(Protocol, (err, client) => {
  if (err) {
    console.error(err);
    return;
  }

  client.on('error', (onErr) => {
    console.error(onErr.message);
  });

  client.open((openErr) => {
    if (openErr) {
      console.error(err);
      return;
    }

    debug('Client connected');

    client.getTwin((errTwin, twin) => {
      if (errTwin) {
        console.error(err);
        return;
      }

      if (!twin) {
        console.error(err);
        return;
      }

      rules = twin.properties.desired.rules || rules;
      debug('rules', rules);
      twin.on('properties.desired', (delta) => {
        rules = delta.rules;
        debug('update rules', rules);
      });
    });

    client.on('inputMessage', (inputName, rawMsg) => {
      if (inputName !== 'tags') {
        debug('Unknown inputMessage received on input', inputName);
        return;
      }

      let msg = JSON.parse(rawMsg.getBytes().toString());
      if (!Array.isArray(msg)) {
        msg = [msg];
      }

      msg.forEach(m => {
        debug(m);
        if (m.DisplayName !== 'IRR') return;
        if (m.Value <= rules.NoLed) {
          debug('no led');
          turnOnLed('none');
          ledTable.green.Value = '0';
          ledTable.yellow.Value = '0';
          ledTable.red.Value = '0';
          return;
        } else if (m.Value <= rules.GreenLed) {
          debug('green');
          turnOnLed('green');
          ledTable.green.Value = '1';
          ledTable.yellow.Value = '0';
          ledTable.red.Value = '0';
          return;
        } else if (m.Value <= rules.YellowLed) {
          debug('yello');
          turnOnLed('yellow');
          ledTable.green.Value = '0';
          ledTable.yellow.Value = '1';
          ledTable.red.Value = '0';
          return;
        } else if (m.Value <= rules.RedLed) {
          debug('red');
          turnOnLed('red');
          ledTable.green.Value = '0';
          ledTable.yellow.Value = '0';
          ledTable.red.Value = '1';
          return;
        }
        debug('should not go here')
      });
/*
      const green = new Message(JSON.stringify(ledTable.green));
      const yellow = new Message(JSON.stringify(ledTable.yellow));
      const red = new Message(JSON.stringify(ledTable.red));
      green.properties.add('command-type', 'ModbusWrite');
      yellow.properties.add('command-type', 'ModbusWrite');
      red.properties.add('command-type', 'ModbusWrite');
      client.sendOutputEvent('modbuswrite', green, () => {});
      client.sendOutputEvent('modbuswrite', yellow, () => {});
      client.sendOutputEvent('modbuswrite', red, () => {});
*/
    });
  });
});
