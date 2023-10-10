const functions = require("firebase-functions");
const admin = require('firebase-admin');
const {getAuth} = require("firebase-admin/auth");
admin.initializeApp();

const listAllUsers = async (nextPageToken) => {
  return await getAuth().listUsers(1000, nextPageToken)
    .then(async (listUsersResult) => {
      if (listUsersResult.pageToken) {
        return [...listUsersResult.users, await listAllUsers(listUsersResult.pageToken)];
      } else {
        return listUsersResult.users;
      }
    });
}

const getUserDataFromData = (data) => {
  const userData = {};
  if (data.email) {
    userData.email = data.email;
  }
  if (data.password) {
    userData.password = data.password;
  }
  if (data.name) {
    userData.displayName = data.name;
  }
  if (data.photoURL) {
    userData.photoURL = data.photoURL;
  }
  if (data.phoneNumber) {
    userData.phoneNumber = data.phoneNumber;
  }

  return userData;
}

const getUserDataFromUser = (user) => {
  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName,
    photoURL: user.photoURL,
    phoneNumber: user.phoneNumber,
    registrationDate: new Date(user.metadata.creationTime).toJSON(),
    role: user.customClaims.role,
  };
}

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

    let users = await listAllUsers();
    users = users.filter((user) => user.customClaims?.company === company);
    users = users.map((user) => {
      return getUserDataFromUser(user);
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

exports.createUser = functions.https.onCall(async (data, context) => {
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

    const userData = getUserDataFromData(data);

    const user = await getAuth().createUser(userData);

    await getAuth().setCustomUserClaims(user.uid, {
      role: data.role,
      company: company,
    });

    return {
      result: getUserDataFromUser(user)
    };
  } catch (e) {
    return {
      error: e.toString()
    };
  }
});

exports.updateUser = functions.https.onCall(async (data, context) => {
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

    const userData = getUserDataFromData(data);
    const user = await getAuth().updateUser(data.uid, userData);
    await getAuth().setCustomUserClaims(user.uid, {
      role: data.role,
      company: company,
    });

    return {
      result: getUserDataFromUser(user)
    };
  } catch (e) {
    return {
      error: e.toString()
    };
  }
});

exports.deleteUser = functions.https.onCall(async (data, context) => {
  try {
    const role = context.auth.token.role;

    if (role !== 'super_admin' && role !== 'admin') {
      return {
        error: 'You are not authorized to perform this action.'
      };
    }

    await getAuth().deleteUser(data.uid);

    return {
      result: 'User deleted successfully.'
    };
  } catch (e) {
    return {
      error: e.toString()
    };
  }
});
