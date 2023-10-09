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
      return {
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        registrationDate: new Date(user.metadata.creationTime).toJSON(),
        role: user.customClaims.role,
      };
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

    const user = await getAuth().createUser({
      email: data.email,
      password: data.password,
      displayName: data.name,
      photoURL: data.photoURL,
      phoneNumber: data.phoneNumber,
    });

    await getAuth().setCustomUserClaims(user.uid, {
      role: data.role,
      company: company,
    });

    return {
      result: user
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

    const user = await getAuth().updateUser(data.uid, {
      email: data.email,
      password: data.password,
      displayName: data.name,
      photoURL: data.photoURL,
      phoneNumber: data.phoneNumber,
    });

    await getAuth().setCustomUserClaims(user.uid, {
      role: data.role,
      company: company,
    });

    return {
      result: user
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
