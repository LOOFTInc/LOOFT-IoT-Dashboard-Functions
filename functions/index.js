const functions = require("firebase-functions");
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
admin.initializeApp();

// This function is triggered when the realtime data for a device is updated.
exports.onRealtimeUpdate = functions.firestore.document('Looft/{deviceID}/realtime/data').onUpdate(async (change, context) => {
  const newValue = change.after.data();

  let deviceName = (await admin.firestore().doc('Data/Devices').get()).data()[context.params.deviceID]['name'];

  await admin.firestore().collection(`Looft/${context.params.deviceID}/listeners`).get().then(
    (value) => {
      value.docs.forEach(async (doc) => {
        const comparison = doc.data()['comparison'];
        const metric = doc.data()['metric'];
        const threshold = Number(doc.data()['threshold']);
        const emailAddress = doc.data()['email'];

        let email = 'Dear Admin,\n\n';
        if (compare(comparison, newValue[metric], threshold) === true) {
          email += `The value for ${firebaseVariableToString(metric)} is ${comparisonFromString(comparison)} the threshold of ${threshold}.\nThe current reading is ${newValue[metric]}.\n\n`;

          email += 'Please take appropriate action.\n\n' +
            'Thank you.\n' +
            'LOOFT IoT';

          await sendEmail(
            'iot-dashboard <noreply@firebase.com>',
            emailAddress,
            `Alert | ${deviceName} | ${firebaseVariableToString(metric)} Threshold Reached`,
            email,
          );
        }
      });
    }
  );
});

// Compares the value to the threshold based on the comparison string.
const compare = (string, value, threshold) => {
  if (string === '<') {
    return value < threshold;
  } else if (string === '>') {
    return value > threshold;
  } else if (string === '<=') {
    return value <= threshold;
  } else if (string === '>=') {
    return value >= threshold;
  } else {
    return value === threshold;
  }
}

const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

// Sends an email to the specified email address.
const sendEmail = async (from, to, subject, body) => {
  const mailOptions = {
    from: from,
    to: to,
  };

  // The user subscribed to the newsletter.
  mailOptions.subject = subject;
  mailOptions.text = body;
  return await mailTransport.sendMail(mailOptions)
    .then((e) => {
      return {'result': e};
    });
}

// Converts the firebase variable to a human readable string.
const firebaseVariableToString = (variable) => {
  switch (variable) {
    case 'Otemperature':
      return 'Outside Temperature';
    case 'Ihumidity':
      return 'Inside Humidity';
    case 'Ohumidity':
      return 'Outside Humidity';
    case 'Current':
      return 'Current';
    case 'RealPower':
      return 'Real Power';
    case 'coilInTemp':
      return 'In Coil Temperature';
    case 'coilOutTemp':
      return 'Out Coil Temperature';
    case 'FreeHEAP':
      return 'Free RAM';
    case 'maxHEAP':
      return 'Max RAM Usage';
    default:
      return 'Inside Temperature';
  }
}

// Converts the comparison string to a human readable string.
const comparisonFromString = (value) => {
  switch (value) {
    case '>':
      return 'Greater than' ;
    case '<':
      return 'Less than';
    case '>=':
      return 'Greater than or Equal to';
    case '<=':
      return 'Less than or Equal to';
    default:
      return 'Equal To';
  }
}
