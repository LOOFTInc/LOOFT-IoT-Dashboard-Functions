const functions = require("firebase-functions");
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
admin.initializeApp();

exports.getAutoCompleteSuggestions = functions
  .runWith({
    secrets: ["PLACES_API_KEY"]
  })
  .https.onCall(async (data, context) => {
    const {query} = data;

    return await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${query}&key=${process.env.PLACES_API_KEY}`);
});

exports.getPlaceDetails = functions
  .runWith({
    secrets: ["PLACES_API_KEY"]
  })
  .https.onCall(async (data, context) => {
    const {placeID} = data;

    return await fetch(`https://maps.googleapis.com/maps/api/place/details/json?fields=geometry&place_id=${placeID}&key=${process.env.PLACES_API_KEY}`);
});

exports.getAddressFromLatLng = functions
  .runWith({
    secrets: ["PLACES_API_KEY"]
  })
  .https.onCall(async (data, context) => {
    const {lat, lng} = data;

    return await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.PLACES_API_KEY}`);
});

// This function is triggered when the realtime data for a device is updated.
exports.onRealtimeUpdate = functions.firestore.document('Companies/{companyName}/IoT/realtime_data/devices/{deviceID}').onUpdate(async (change, context) => {
  const newValue = change.after.data();

  await admin.firestore().collection(`Companies/${context.params.companyName}/IoT/device_data/devices/${context.params.deviceID}/listeners`).get().then(
    (value) => {
      value.docs.forEach(async (doc) => {
        const deviceName = doc.data()['deviceName'];
        const comparison = doc.data()['comparison'];
        const variableName = doc.data()['variableName'];
        const threshold = Number(doc.data()['threshold']);
        const emailAddress = doc.data()['email'];

        let email = 'Dear Admin,\n\n';
        if (compare(comparison, newValue[variableName], threshold) === true) {
          email += `The value of ${variableName} for ${deviceName}(${context.params.deviceID}) is ${comparisonFromString(comparison)} the threshold of ${threshold}.\nThe current reading is ${newValue[variableName]}.\n\n`;

          email += 'Please take appropriate action.\n\n' +
            'Thank you.\n' +
            'LOOFT';

          await sendEmail(
            'LOOFT Dashboard <noreply@firebase.com>',
            emailAddress,
            `Alert | ${deviceName} | ${variableName} Threshold Reached`,
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
