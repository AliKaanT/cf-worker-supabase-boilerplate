import authErrors from './json/authErrors.json';
import profileErrors from './json/profileErrors.json';
let errors = {};

errors = { ...errors, ...authErrors };
errors = { ...errors, ...profileErrors };

export default errors;
