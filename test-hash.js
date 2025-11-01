const CryptoJS = require('crypto-js');

const password = '22121981';
const hash = CryptoJS.SHA256(password).toString();

console.log('Senha:', password);
console.log('Hash gerado:', hash);
console.log('Hash no banco:', 'd70116a54b20b6af1a5729cb0da7ea3f9f3498e6e2f79fb83dbceaec2bc29d33');
console.log('Match:', hash === 'd70116a54b20b6af1a5729cb0da7ea3f9f3498e6e2f79fb83dbceaec2bc29d33');
