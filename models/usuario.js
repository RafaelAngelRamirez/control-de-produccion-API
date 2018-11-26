var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var _ROLES = require('../config/roles');

var Schema = mongoose.Schema;

var rolesValidos = {
    // TODO: Estos valores tienen que ir en el archivo config.js
    values: _ROLES.ARRAY,
    message: '{VALUE} no es un rol permitido.'
};

var usuarioSchema = new Schema({
    nombre: { type: String, required: [true, 'El nombre es necesario.'] },
    email: { type: String, unique: true, required: [true, 'El correo es necesario.'] },
    password: { type: String, required: [true, 'La contraseña es necesaria.'] },
    img: { type: String, required: false },
    // TODO: Un usuario debe poder tener varios roles. 
    role: [{ type: String, required: true, enum: rolesValidos }],
    google: { type: Boolean, default: false },
    idTrabajador: { type: Number }
});

usuarioSchema.plugin(uniqueValidator, { message: ' \'{PATH}\' debe ser único.' });

module.exports = mongoose.model('Usuario', usuarioSchema);