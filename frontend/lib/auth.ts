import {
  signUp,
  confirmSignUp,
  signIn,
  signOut,
  getCurrentUser,
} from "aws-amplify/auth";

export async function register(email: string, password: string) {
  return await signUp({
    username: email,
    password,
    options: {
      userAttributes: {
        email,
      },
    },
  });
}

export async function confirmEmail(email: string, code: string) {
  return await confirmSignUp({
    username: email,
    confirmationCode: code,
  });
}

export async function login(email: string, password: string) {
  return await signIn({
    username: email,
    password,
  });
}

export async function logout() {
  return await signOut();
}

export async function currentUser() {
  return await getCurrentUser();
}