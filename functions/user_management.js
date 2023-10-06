const functions = require("firebase-functions");
const admin = require('firebase-admin');
const {getAuth} = require("firebase-admin/auth");
admin.initializeApp();

exports.getAllUsers = functions.https.onCall(async (data, context) => {
  try {
    const role = context.auth.token.role;

    if (role !== 'super_admin' && role !== 'admin') {
      return {
        error: 'You are not authorized to perform this action.'
      };
    }

    let company;
    if (role === 'super_admin') {
      company = data.company;
    } else {
      company = context.auth.token.company;
    }

    const users = [];
    await getAuth().listUsers().then((value) => {
      value.users.forEach((user) => {
        if (user.customClaims?.company === company) {
          users.push(user);
        }
      });
    });

    return {
      result: users
    };
  } catch (e) {
    return {
      error: e.toString()
    };
  }
});

exports.test = functions.https.onCall(async (data, context) => {

});
