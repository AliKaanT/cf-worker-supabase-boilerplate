function generateRandomString(length = 10): string {
  const possibleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < length; i++) {
    randomString += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
  }
  return randomString;
}

export { generateRandomString };
